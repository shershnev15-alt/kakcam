# API v1

Base URL локально: `http://localhost:4000/api/v1`. Формат: JSON, UTF-8, UTC.

## Реализовано

| Method | Path                                     | Доступ               | Назначение                                 |
| ------ | ---------------------------------------- | -------------------- | ------------------------------------------ |
| GET    | `/health`                                | public               | Liveness процесса                          |
| GET    | `/ready`                                 | public               | Readiness через Prisma/PostgreSQL          |
| GET    | `/api/v1`                                | public               | Версия, режим и доступные ресурсы          |
| POST   | `/api/v1/auth/register`                  | public + rate limit  | Email-регистрация и создание сессии        |
| POST   | `/api/v1/auth/login`                     | public + rate limit  | Вход и новая сессия                        |
| GET    | `/api/v1/auth/me`                        | session              | Пользователь, роли и permissions           |
| POST   | `/api/v1/auth/logout`                    | session              | Отзыв текущей сессии                       |
| GET    | `/api/v1/players`                        | public               | Каталог игроков: filters/sort/pagination   |
| GET    | `/api/v1/players/:slug`                  | public               | Профиль, PPR и похожие игроки              |
| POST   | `/api/v1/players`                        | `player.create`      | Создание игрока + AuditLog                 |
| PATCH  | `/api/v1/players/:slug`                  | `player.update`      | Обновление игрока + before/after audit     |
| DELETE | `/api/v1/players/:slug`                  | `player.archive`     | Безопасная архивация + before/after audit  |
| GET    | `/api/v1/teams`                          | public               | Каталог команд: filters/sort/pagination    |
| GET    | `/api/v1/teams/:slug`                    | public               | Команда, TPR и активный состав             |
| POST   | `/api/v1/teams`                          | `team.create`        | Создание команды + AuditLog                |
| PATCH  | `/api/v1/teams/:slug`                    | `team.update`        | Обновление команды + before/after audit    |
| DELETE | `/api/v1/teams/:slug`                    | `team.archive`       | Безопасная архивация + before/after audit  |
| GET    | `/api/v1/rankings/players`               | public               | Опубликованный PPR из PostgreSQL           |
| GET    | `/api/v1/rankings/teams`                 | public               | Опубликованный TPR из PostgreSQL           |
| GET    | `/api/v1/search?q=...`                   | public               | Поиск игроков и команд                     |
| GET    | `/api/v1/matches`                        | public               | Матчи: status/team/tournament/pagination   |
| GET    | `/api/v1/matches/:id`                    | public               | Матч, карты, результат и player stats      |
| POST   | `/api/v1/matches`                        | `match.create`       | Создание запланированного матча + audit    |
| POST   | `/api/v1/matches/:id/finalize`           | `match.verify`       | Immutable result, maps, checksum + audit   |
| GET    | `/api/v1/tournaments`                    | public               | Турниры из PostgreSQL                      |
| GET    | `/api/v1/tournaments/:slug`              | public               | Участники, места и матчи турнира           |
| GET    | `/api/v1/ratings/runs`                   | public               | Опубликованные RatingRun                   |
| POST   | `/api/v1/ratings/recalculate`            | `rating.run`         | Воспроизводимый PPR/TPR recalculation      |
| GET    | `/api/v1/players/:slug/ratings`          | public               | История PPR и factors                      |
| GET    | `/api/v1/teams/:slug/ratings`            | public               | История TPR и factors                      |
| GET    | `/api/v1/players/:slug/achievements`     | public               | Progress и статусы всех achievement rules  |
| GET    | `/api/v1/players/:slug/career`           | public               | Карьерные периоды и переходы               |
| GET    | `/api/v1/transfers`                      | public               | Лента переходов с player/team filters      |
| POST   | `/api/v1/transfers`                      | `transfer.manage`    | Переход + career projection + AuditLog     |
| POST   | `/api/v1/achievements/replay`            | `achievement.replay` | Детерминированный replay canonical facts   |
| GET    | `/api/v1/players/:slug/verification`     | public               | Уровень и публичные verification decisions |
| POST   | `/api/v1/claims`                         | session              | Claim Profile с restricted evidence        |
| GET    | `/api/v1/claims/me`                      | session              | Заявки текущего пользователя               |
| POST   | `/api/v1/claims/:id/evidence`            | claim owner          | Дополнительное evidence                    |
| GET    | `/api/v1/moderation/claims`              | `claim.review`       | Очередь claim moderation                   |
| POST   | `/api/v1/moderation/claims/:id/decision` | `claim.review`       | Evidence request/approve/reject + audit    |

Session token передаётся в cookie `arena_session` (`HttpOnly`, `SameSite=Lax`, `Secure` в production) или как Bearer token. В БД хранится только SHA-256 hash. Изменяющие cookie-auth запросы проверяют `Origin`; пароль — 12–128 символов и Argon2id. Login возвращает одинаковую ошибку для неизвестного email и неверного пароля.

Player/Team, competition, statistics, rating read-модели и публичные страницы читают PostgreSQL. RFC 9457 и OpenAPI generation остаются следующим расширением write API.

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

## Competition flow

`GET /matches` принимает `status=LIVE|UPCOMING|FINISHED`, `team`, `tournament`, `page`, `pageSize`. Match detail содержит команды, карты, подтвержденную статистику игроков, `sourceCode`, `observedAt`, `finalizedAt` и result checksum.

Команда финализации валидирует BO-счёт и число карт, атомарно создаёт `MatchResult`, заменяет map facts, переводит матч в `FINISHED`/verification level 3 и пишет before/after AuditLog. Повторная финализация возвращает `409 Conflict`.

## Rating runs

`POST /ratings/recalculate` принимает optional UTC `cutoff`, использует только подтвержденные завершенные матчи и создаёт/переиспользует PPR/TPR runs с formula version, immutable input cutoff и SHA-256 checksum. Повтор с тем же cutoff и facts идемпотентен. Leaderboard metadata содержит `ratingRun`; история профиля возвращает score, confidence, rank, factors и formula version.

## Career и achievement replay

Подтверждённый `POST /transfers` атомарно создаёт Transfer, закрывает предыдущий открытый CareerHistory, открывает новый период, обновляет current team projection и пишет AuditLog. SHA-256 checksum блокирует повтор одного факта.

`POST /achievements/replay` собирает canonical facts на UTC cutoff и оценивает versioned catalog без произвольного кода из БД. Для каждого игрока создаётся уникальный AchievementEvent; точный повтор возвращает reused events и не дублирует grants. Correction переводит прежний grant в `REVOKED`, недостаточно доверенный факт — в `PROVISIONAL`.

## Claim и verification

Пользователь создаёт claim с одним restricted evidence и может дополнить его после `EVIDENCE_REQUESTED`. Модератор с `claim.review` видит evidence, принимает решение и обязан указать reason. `APPROVED` создаёт Verification level 2, обновляет aggregate badge, добавляет роль `VERIFIED_PLAYER` и AuditLog. Повторное решение по terminal claim возвращает `409 Conflict`; публичный endpoint никогда не возвращает evidence reference.

## Контрактные правила

- stable public identifiers; UUID для внутренних identity;
- page pagination для bounded directories, cursor pagination для feeds;
- `Idempotency-Key` для create/import commands;
- `If-Match` для конфликтных admin edits;
- request/correlation id в response/logs;
- critical data включает source, observedAt, verification level и completeness.
