# Architecture

## Контекст

Arena Passport агрегирует неоднородные игровые данные, превращает их в проверяемую карьерную историю и обслуживает публичные SEO-страницы, персонализированные клиенты и внутреннюю модерацию. Главный риск — не объем запросов, а достоверность и объяснимость данных.

## Выбранный стиль

На этапах 0–8 используется **модульный монолит** NestJS. Домены изолированы на уровне модулей, портов и схем событий, но используют одну PostgreSQL-транзакцию. Это исключает раннюю распределенную сложность. Отдельными процессами могут запускаться API, worker и scheduler.

```text
Web / Admin / Mobile
        │ REST + WebSocket
        ▼
API Gateway (Nest application)
        │
┌───────┼──────────────────────────────────────────┐
│Identity│Directory│Competition│Stats│Trust│Content│
└───────┼──────────────────────────────────────────┘
        │ domain events / jobs
        ▼
Ratings │ Achievements │ Imports │ Notifications
        │
 PostgreSQL ─ Redis ─ S3
```

## Доменные модули

- `identity`: users, identities, sessions, RBAC, ownership policies;
- `directory`: players, teams, organizations, geography, games;
- `competition`: tournaments, stages, matches, rosters, transfers;
- `statistics`: normalized facts and game-specific extensions;
- `ratings`: immutable runs, PPR/TPR snapshots, history;
- `achievements`: rules, progress, grants and revocation;
- `trust`: sources, assertions, evidence, verification, claims, audit;
- `imports`: provider adapters, raw payload staging, mapping, replay;
- `content`: articles/news;
- `engagement`: follows, favorites, notifications;
- `search`: PostgreSQL FTS adapter, later external search adapter.

Модуль не читает таблицы другого модуля напрямую. Он обращается к публичному service/port или к read model. Движки рейтинга и достижений не импортируют framework/ORM.

## Потоки данных

### Публичное чтение

1. Next.js Server Component вызывает API client.
2. API применяет public projection и policy.
3. Read-through cache используется для дорогих leaderboard/profile projections.
4. ETag/Cache-Control и ISR уменьшают нагрузку.

### Импорт

1. Provider получает payload и сохраняет raw artifact + checksum.
2. Mapper переводит данные в canonical staging records.
3. Identity resolution ищет соответствия и дубли.
4. Validator выставляет ошибки и confidence источника.
5. Apply job создает FieldAssertions в транзакции.
6. Resolver выбирает effective value по policy; конфликт идет в очередь модерации.
7. События запускают пересчет зависимых статистик, рейтингов и достижений.

### Изменение администратором

Command содержит actor, reason, correlation id и ожидаемую версию записи. После policy/validation транзакция меняет данные и добавляет AuditLog/outbox event. Outbox публикуется worker-ом после commit.

## API conventions

- URL versioning `/api/v1`;
- JSON, ISO-8601 UTC, UUID, decimal values serialized as strings when precision matters;
- cursor pagination для feeds, offset только для маленьких admin tables;
- RFC 9457 Problem Details;
- `X-Request-Id`, `Idempotency-Key`, `If-Match` для соответствующих команд;
- generated OpenAPI clients; transport DTO не являются ORM models.

## Multi-game statistics

Общие поля (`kills`, `deaths`, `assists`, `win`, `duration`) индексируются как колонки. Расширения (`kast`, hero economy, vision score) хранятся в `metrics JSONB` с `schemaVersion`. Реестр `GameMetricDefinition` задает тип, единицу, направление «лучше», агрегацию и допустимый диапазон. Это сохраняет гибкость без превращения основной модели в EAV.

## Consistency

- directory/competition/trust commands — strong consistency;
- leaderboards/search/notifications — eventual consistency;
- PostgreSQL outbox обеспечивает at-least-once delivery;
- handlers идемпотентны по `eventId`;
- rating run публикуется атомарной сменой active version.

## Cache и realtime

Redis используется для leaderboard/profile projections, rate-limit counters, BullMQ и presence/fan-out. Redis не является источником истины. Live match updates публикуются через WebSocket channels `match:{id}`; клиент после reconnect получает canonical snapshot по REST.

## Масштабирование

Сначала масштабируются независимо web, API и workers. Затем при доказанной нагрузке могут быть вынесены imports, live ingestion, notifications или ratings. Условие выделения — измеримый bottleneck или отличающийся reliability/security boundary, а не размер команды.

## Observability и SLO

- structured JSON logs с request/user/correlation id без PII;
- metrics: latency, error rate, queue lag, import rejection, cache hit, rating duration;
- traces через OpenTelemetry boundary;
- health: liveness без dependencies, readiness с DB/Redis;
- целевые стартовые SLO: public read 99.9%, admin 99.5%; p95 cached API <250 ms.

## Architecture Decision Records

Значимые решения сохраняются в `docs/adr/` с контекстом, вариантами, решением и последствиями. Первые ADR: modular monolith, provenance assertions, hybrid game metrics, auth sessions, rating versioning.
