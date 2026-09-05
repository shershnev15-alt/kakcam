# Deployment

## Local

```bash
docker compose up -d --build
docker compose ps
```

Web: `http://localhost:3000`; Admin: `http://localhost:3001`; API: `http://localhost:4000`; PostgreSQL host port 5433; Redis host port 6380. API container применяет committed migrations и idempotent demo seed перед development start. Контейнеры не монтируют общий `node_modules`, поэтому зависимости API, Web и Admin изолированы и воспроизводимы.

Mobile запускается через Expo вне Compose: `pnpm --filter @arena/mobile dev`. API URL задаётся `EXPO_PUBLIC_API_URL`, по умолчанию используется `http://localhost:4000/api/v1`.

SEO origin задаётся `NEXT_PUBLIC_SITE_URL`. Для production обязательны уникальные `METRICS_TOKEN` и `IP_HASH_SALT`; `/metrics` публикуется только во внутреннюю monitoring-сеть. После production build выполняются `pnpm performance:check` и `pnpm security:check`.

## Production direction

Separate OCI images for web/admin/api/worker, managed PostgreSQL/Redis/S3, migrations as one-off release job, CDN/WAF before public web, TLS everywhere, secrets from secret manager, daily backup + PITR. Demo seed and local admin credentials disabled. Rollout: preview → staging smoke → migration → rolling production → health/SLO verification → rollback if error budget gate fails.

Production Docker targets уже используют non-root runtime, но не считаются launch-ready до Этапа 14: нужны SBOM/signing, resource limits, worker image, secret integration, collector/alerts, backup restore drill и environment runbooks.

## Этап 14. Production readiness

### Что закрываем первым

1. **Secrets и конфигурация**
   - Вынести все секреты в manager: `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`, `FACEIT_CLIENT_ID/SECRET`, `SUMSUB_*`, `EVIDENCE_ENCRYPTION_KEY`, `SESSION_TOKEN_HASH_SECRET`, `METRICS_TOKEN`, `IP_HASH_SALT`.
   - Отключить `SEED_ADMIN_*` для production.
   - Зафиксировать `NEXT_PUBLIC_SITE_URL` и `APP_ORIGIN` через переменные окружения окружения, без example-domain.

2. **Infra + релиз**
   - `HTTPS` + WAF/CDN перед публичным `web`.
   - Чёткие лимиты памяти/CPU для всех сервисов.
   - Отдельная production-сборка `worker` и `api/web/admin` с pinned базовым образом и подписью.
   - `migrate` как one-off job с dry-run/commit в release pipeline.

3. **Наблюдаемость и безопасность**
   - `/metrics` только в private monitoring-сети, через `Authorization: Bearer $METRICS_TOKEN`.
   - Подключить collector/alerts: uptime, error rate, p95 latency, DB pool, queue latency, job failures.
   - `pnpm security:check` и performance-gates в every deploy pipeline.
   - Ввести SBOM + vuln-policy для container/images.

4. **Данные и аварии**
   - Ежедневный backup БД + PITR + проверенный restore drill.
   - Держать retention для evidence/import/raw-logs по политике.
   - Зафиксировать rollback condition и playbook.

### Базовый smoke на stage14

- `pnpm stage14:smoke`
- `GET /health`, `GET /ready` (API: 200)
- Публичная: `/`, `/players`, `/rankings/players`, `/privacy` (200)
- Админка: `/` и `/audit` (200 для авторизованного тестового admin)
- End-to-end profile visibility: `registration -> verify email -> connect Steam/FACEIT -> evidence -> moderation approve -> publication`.

### Минимальный launch checklist (этап 14)

1. staging deploy + smoke
2. migration run
3. backup+restore drill
4. metrics + alerts smoke
5. one rollback dry-run
6. legal/compliance sign-off

Готово — после этого даём разрешение на следующую итерацию (мониторинг и paid-бизнес логика).

## Быстрый production-like запуск (локально)

1. Скопируй production env:

```bash
cp .env.production.example .env.production
```

Заполни секреты: `POSTGRES_PASSWORD`, `IP_HASH_SALT`, `SESSION_TOKEN_HASH_SECRET`,
`EVIDENCE_ENCRYPTION_KEY`, `RESEND_API_KEY`/`EMAIL_FROM`, `FACEIT_*`, `SUMSUB_*`,
`METRICS_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `PUBLIC_WEB_URL`, `APP_ORIGIN`, `API_PUBLIC_URL`.

2. Подними production-like stack одной командой:

```bash
pnpm stage14:up
```

Остановить stack:

```bash
pnpm stage14:down
```

`stage14:up` сначала запускает одноразовый job `api-migrate` (команда `pnpm --filter @arena/api prisma:migrate`), и только потом стартует API. Если миграция падает — API не поднимается.

Если нужно прогнать миграцию отдельно:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production run --rm api-migrate
```

3. Запусти финальный smoke:

```bash
PUBLIC_WEB_URL=https://arena.example ADMIN_WEB_URL=https://arena.example/admin API_URL=http://localhost:4000 METRICS_TOKEN=... pnpm stage14:smoke
```

4. Прогон полного gate:

```bash
pnpm stage14:verify
```

`stage14:verify` включает lint/typecheck/tests/build/perf/security и локальный smoke.

Полное удаление сервисов после проверки:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production down --volumes
```
