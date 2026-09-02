# API v1

Base URL локально: `http://localhost:4000/api/v1`. Формат: JSON, UTF-8, UTC.

## Реализовано

| Method | Path                    | Доступ              | Назначение                                |
| ------ | ----------------------- | ------------------- | ----------------------------------------- |
| GET    | `/health`               | public              | Liveness процесса                         |
| GET    | `/ready`                | public              | Readiness через Prisma/PostgreSQL         |
| GET    | `/api/v1`               | public              | Версия, режим и доступные ресурсы         |
| POST   | `/api/v1/auth/register` | public + rate limit | Email-регистрация и создание сессии       |
| POST   | `/api/v1/auth/login`    | public + rate limit | Вход и новая сессия                       |
| GET    | `/api/v1/auth/me`       | session             | Пользователь, роли и permissions          |
| POST   | `/api/v1/auth/logout`   | session             | Отзыв текущей сессии                      |
| GET    | `/api/v1/players`       | public              | Игроки из PostgreSQL                      |
| GET    | `/api/v1/players/:slug` | public              | Профиль игрока из PostgreSQL              |
| POST   | `/api/v1/players`       | `player.create`     | Создание игрока + AuditLog                |
| PATCH  | `/api/v1/players/:slug` | `player.update`     | Обновление игрока + before/after audit    |
| DELETE | `/api/v1/players/:slug` | `player.archive`    | Безопасная архивация + before/after audit |
| GET    | `/api/v1/teams`         | public              | Команды из PostgreSQL                     |
| GET    | `/api/v1/teams/:slug`   | public              | Команда из PostgreSQL                     |
| POST   | `/api/v1/teams`         | `team.create`       | Создание команды + AuditLog               |
| PATCH  | `/api/v1/teams/:slug`   | `team.update`       | Обновление команды + before/after audit   |
| DELETE | `/api/v1/teams/:slug`   | `team.archive`      | Безопасная архивация + before/after audit |
| GET    | `/api/v1/matches`       | public              | 30 demo matches                           |
| GET    | `/api/v1/tournaments`   | public              | 3 demo tournaments                        |

Session token передаётся в cookie `arena_session` (`HttpOnly`, `SameSite=Lax`, `Secure` в production) или как Bearer token. В БД хранится только SHA-256 hash. Изменяющие cookie-auth запросы проверяют `Origin`; пароль — 12–128 символов и Argon2id. Login возвращает одинаковую ошибку для неизвестного email и неверного пароля.

Player/Team read-модели уже переведены на PostgreSQL. Matches и tournaments остаются deterministic demo projection до Этапа 4. Pagination, RFC 9457 и OpenAPI generation добавляются вместе с расширением каталогов.

## Контрактные правила

- stable public identifiers; UUID для внутренних identity;
- cursor pagination для feeds;
- `Idempotency-Key` для create/import commands;
- `If-Match` для конфликтных admin edits;
- request/correlation id в response/logs;
- critical data включает source, observedAt, verification level и completeness.
