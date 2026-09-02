# CS2 provider imports

Этап 12 подключает только Counter-Strike 2. Архитектура адаптеров допускает новые игры позже, но runtime allow-list, canonical type, validation и admin-команды сейчас принимают исключительно `gameSlug: "cs2"`.

## Провайдеры

- `cs2-demo-alpha` — условный upcoming feed с собственными названиями полей и структурой участников;
- `cs2-demo-bravo` — независимый result/statistics feed с другой структурой серий, карт и игроков.

Оба провайдера работают на локальных fixture payloads, потому что внешний API и его credentials не входят в проект. Замена fixture fetch на HTTP-клиент не меняет canonical contract, staging или правила применения.

## Pipeline

1. `POST /api/v1/admin/imports/provider` получает `sourceCode`, `externalKey` и обязательное основание.
2. Adapter fetches raw payload; stable JSON checksum обеспечивает exact replay idempotency.
3. Mapper создаёт canonical `cs2.v1` match records.
4. Validator проверяет CS2-only contract, даты, BO1/3/5, счёт, карты и player-map statistics.
5. Identity resolution использует сохранённый external link, затем точный canonical slug; неразрешённые сущности блокируют apply.
6. Admin preview показывает raw/canonical payload, ошибки и действие `CREATE`, `ASSERT` или `SKIP`.
7. `POST /api/v1/admin/imports/:id/apply` повторно валидирует и разрешает identities внутри безопасного workflow.

## Безопасность и повтор

- `CREATE` транзакционно создаёт Match, MatchMap, granular `PlayerMatchStatistic`, series aggregate и MatchResult;
- `ASSERT` создаёт `FieldAssertion(provider.cs2Match.v1)` для модерации и не изменяет существующий Match;
- `SKIP` применяется, если внешний match ID уже связан с canonical entity;
- checksum unique по источнику: exact replay возвращает существующий импорт с `reused: true`;
- apply атомарно захватывает `REVIEW` record и выполняется в serializable transaction; финальная проверка match identity внутри транзакции закрывает гонку между разными источниками;
- stage и apply требуют RBAC, CSRF/Origin validation, основания оператора и создают AuditLog;
- raw payload доступен только административному API.

При подключении реального поставщика обязательны timeout/retry с backoff, secret manager, rate-limit handling, raw artifact storage с retention и contract fixtures из обезличенных payloads.
