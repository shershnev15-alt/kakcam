# API v1

Base URL локально: `http://localhost:4000/api/v1`. Формат: JSON, UTF-8, UTC.

## Реализовано в prototype

| Method | Path                    | Назначение                                     |
| ------ | ----------------------- | ---------------------------------------------- |
| GET    | `/health`               | Liveness процесса                              |
| GET    | `/ready`                | Readiness с PostgreSQL ping                    |
| GET    | `/api/v1`               | Версия, режим, доступные ресурсы и demo counts |
| GET    | `/api/v1/players`       | 40 demo players                                |
| GET    | `/api/v1/players/:slug` | Demo player summary                            |
| GET    | `/api/v1/teams`         | 8 demo teams                                   |
| GET    | `/api/v1/teams/:slug`   | Demo team summary                              |
| GET    | `/api/v1/matches`       | 30 demo matches                                |
| GET    | `/api/v1/tournaments`   | 3 demo tournaments                             |

`meta.mode = demo` явно отличает prototype response от подтвержденных production-данных. На Этапе 2 API получит DTO validation, RFC 9457 errors, pagination, OpenAPI generation, auth и policy guards.

## Контрактные правила

- stable public identifiers; UUID для внутренних identity;
- cursor pagination для feeds;
- `Idempotency-Key` для create/import commands;
- `If-Match` для конфликтных admin edits;
- request/correlation id в response/logs;
- critical data включает source, observedAt, verification level и completeness.
