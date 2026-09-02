# SEO, performance и observability

Этап 13 добавляет измеримые production-gates для публичного Web, Admin и API. Значения ниже — стартовая baseline, которую CI не позволяет ухудшать без осознанного изменения бюджета.

## SEO

- canonical URL и динамические metadata для каталогов, игроков, команд, матчей и турниров;
- OpenGraph/Twitter cards и динамические изображения 1200×630 для профилей игрока и команды;
- JSON-LD `Person`, `SportsTeam` и `SportsEvent` на detail-страницах;
- `robots.txt` закрывает account/auth/moderation, Admin отдаёт `X-Robots-Tag: noindex, nofollow`;
- sitemap включает публичные каталоги, рейтинги и DB-backed detail URL; при временной недоступности API он не угадывает match IDs;
- `NEXT_PUBLIC_SITE_URL` задаёт production origin и никогда не должен оставаться example-domain в production.

## Performance budgets

`pnpm performance:check` анализирует production assets после сборки Web/Admin. Gate проверяет максимальный gzip-вес одного JS-файла, суммарный gzip JS и максимальный CSS-файл. Бюджеты хранятся в `performance-budgets.json` и выполняются в CI после `pnpm build`.

Baseline Этапа 13:

| Client | Total gzip JS | Largest gzip JS | Largest CSS |
| ------ | ------------: | --------------: | ----------: |
| Web    |      294354 B |         66289 B |     34048 B |
| Admin  |      279419 B |         66288 B |      8214 B |

## Security baseline

Web/Admin устанавливают CSP, clickjacking, MIME-sniffing, referrer, opener и permissions headers. API использует Helmet и включает HSTS в production. Production Docker runtime запускается от `node`, а Dependabot еженедельно группирует npm-обновления.

`pnpm security:check` подтверждает обязательные headers/telemetry hooks и сканирует tracked text files на ограниченный набор критичных secret signatures. Это быстрый baseline, а не замена SAST, dependency/container scanning и ручному threat model.

## Runtime telemetry

Каждый API-ответ получает безопасный `X-Request-Id`. Структурированный JSON-log содержит только request id, HTTP method, нормализованный route, status и duration; slug, UUID, query, IP и пользовательские данные не логируются.

`GET /metrics` экспортирует Prometheus counters/histograms:

- `arena_http_requests_total`;
- `arena_http_request_duration_seconds`;
- `arena_product_events_total`.

В production `/metrics` требует `Authorization: Bearer $METRICS_TOKEN`; без настроенного `METRICS_TOKEN` endpoint закрыт. Scrape endpoint должен быть доступен только внутренней monitoring-сети.

## Privacy-safe product analytics

Web отправляет `page_view` в `POST /api/v1/analytics/events`. API принимает только allow-listed event name и низкокардинальный surface, payload ограничен 4 KiB, а клиентский лимит — 120 событий в минуту. Для лимита используется односторонний hash сетевого адреса с `IP_HASH_SALT`; исходный адрес не хранится и не экспортируется.

In-memory метрики и rate-limit достаточны для одного MVP-процесса. До горизонтального масштабирования Этап 14 должен подключить Prometheus/OpenTelemetry collector и Redis-backed distributed limiter, определить retention и alert rules.

## Проверка

```bash
pnpm build
pnpm performance:check
pnpm security:check
curl -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:4000/metrics
```
