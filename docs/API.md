# API v1

Base URL локально: `http://localhost:4000/api/v1`. Формат: JSON, UTF-8, UTC.

## Реализовано

| Method | Path                       | Доступ              | Назначение                                |
| ------ | -------------------------- | ------------------- | ----------------------------------------- |
| GET    | `/health`                  | public              | Liveness процесса                         |
| GET    | `/ready`                   | public              | Readiness через Prisma/PostgreSQL         |
| GET    | `/api/v1`                  | public              | Версия, режим и доступные ресурсы         |
| POST   | `/api/v1/auth/register`    | public + rate limit | Email-регистрация и создание сессии       |
| POST   | `/api/v1/auth/login`       | public + rate limit | Вход и новая сессия                       |
| GET    | `/api/v1/auth/me`          | session             | Пользователь, роли и permissions          |
| POST   | `/api/v1/auth/logout`      | session             | Отзыв текущей сессии                      |
| GET    | `/api/v1/players`          | public              | Каталог игроков: filters/sort/pagination  |
| GET    | `/api/v1/players/:slug`    | public              | Профиль, PPR и похожие игроки             |
| POST   | `/api/v1/players`          | `player.create`     | Создание игрока + AuditLog                |
| PATCH  | `/api/v1/players/:slug`    | `player.update`     | Обновление игрока + before/after audit    |
| DELETE | `/api/v1/players/:slug`    | `player.archive`    | Безопасная архивация + before/after audit |
| GET    | `/api/v1/teams`            | public              | Каталог команд: filters/sort/pagination   |
| GET    | `/api/v1/teams/:slug`      | public              | Команда, TPR и активный состав            |
| POST   | `/api/v1/teams`            | `team.create`       | Создание команды + AuditLog               |
| PATCH  | `/api/v1/teams/:slug`      | `team.update`       | Обновление команды + before/after audit   |
| DELETE | `/api/v1/teams/:slug`      | `team.archive`      | Безопасная архивация + before/after audit |
| GET    | `/api/v1/rankings/players` | public              | Опубликованный PPR из PostgreSQL          |
| GET    | `/api/v1/rankings/teams`   | public              | Опубликованный TPR из PostgreSQL          |
| GET    | `/api/v1/search?q=...`     | public              | Поиск игроков и команд                    |
| GET    | `/api/v1/matches`          | public              | 30 demo matches                           |
| GET    | `/api/v1/tournaments`      | public              | 3 demo tournaments                        |

Session token передаётся в cookie `arena_session` (`HttpOnly`, `SameSite=Lax`, `Secure` в production) или как Bearer token. В БД хранится только SHA-256 hash. Изменяющие cookie-auth запросы проверяют `Origin`; пароль — 12–128 символов и Argon2id. Login возвращает одинаковую ошибку для неизвестного email и неверного пароля.

Player/Team read-модели, публичные паспорта, каталоги и рейтинги читают PostgreSQL. Matches и tournaments остаются deterministic demo projection до Этапа 4. RFC 9457 и OpenAPI generation будут добавлены при расширении write API.

## Каталоги и поиск

`GET /players`, `/teams` и `/rankings/*` возвращают `{ data, meta }`. В `meta`: `total`, `page`, `pageSize`, `totalPages`, `source: "postgresql"`.

Query parameters:

- `page`: 1–10000, default 1;
- `pageSize`: 1–50, default 20;
- `q`: подстрока имени или никнейма, до 80 символов;
- `country`: ISO-3166 alpha-2;
- `sort`: `rating`, `name` или `verified`;
- `team`: slug команды, только для каталога игроков.

`GET /search` требует `q` длиной 2–80 символов и возвращает до шести игроков и шести команд. Неактивные сущности исключаются из публичных результатов. Detail endpoints возвращают `404` для неизвестных и архивных slugs.

## Контрактные правила

- stable public identifiers; UUID для внутренних identity;
- page pagination для bounded directories, cursor pagination для feeds;
- `Idempotency-Key` для create/import commands;
- `If-Match` для конфликтных admin edits;
- request/correlation id в response/logs;
- critical data включает source, observedAt, verification level и completeness.
