# Progress

Дата обновления: 2 сентября 2026. Этапы: **0 завершён**, **1 foundation завершён**, **2 auth/RBAC завершён**, **3 public directory завершён**.

## Completed

- product/architecture/database/design/rating/achievement/verification/mobile/deployment specifications;
- pnpm TypeScript monorepo, Docker Compose, GitHub Actions, PostgreSQL 17 и Redis 8;
- deterministic seed: 40 игроков, 8 команд, 3 турнира, 30 матчей, 20 ачивок;
- публичный Next.js prototype и PPR/achievement engine foundations;
- email registration/login/logout/me и UI `/register`, `/login`, `/account`;
- Argon2id passwords, opaque HttpOnly sessions, token hashing, expiry/revocation и login enumeration protection;
- Identity/Session/Role/Permission/RolePermission/UserRole migration;
- 12 системных ролей, 8 permissions, policy guards, Origin/CSRF guard и auth rate limit;
- PostgreSQL-backed Player/Team reads и защищённые create/update/soft-archive commands;
- транзакционный AuditLog для регистрации, входа, выхода и Player/Team mutations;
- idempotent PostgreSQL seed текущих PPR/TPR: 2 RatingRun, 40 PlayerRating и 8 TeamRating;
- DB-backed каталоги `/players` и `/teams` с page pagination, поиском, фильтрами и сортировкой;
- DB-backed паспорта игрока/команды с рейтингом, составом и похожими игроками;
- DB-backed `/rankings/players`, `/rankings/teams` и глобальный `/search`;
- динамические metadata/canonical, sitemap directories, noindex search, loading/error/empty/404 states.

## Tests

- Prisma schema validation, migration deploy и idempotent seed: passed;
- API strict typecheck, 14 unit tests и production build: passed;
- Web strict typecheck, 3 component tests и production build: passed;
- полный monorepo test suite: 24 tests passed;
- auth/RBAC e2e: register 201, me 200, unauthorized mutation 403, foreign Origin 403, logout 201, revoked session 401;
- Statistician e2e: Player/Team create 201 и update 200; временные QA-записи очищены;
- Moderator e2e: Player/Team soft-archive 200, archived public read 404; временные QA-записи очищены;
- Stage 3 API smoke: pagination/filter/search/rankings, Player/Team detail, invalid query 400 и missing slug 404;
- Web smoke: DB-backed directories, search, rankings and both passports return 200; missing Player/Team return real HTTP 404;
- visual QA каталогов, поиска, паспортов, рейтинга, empty и 404 на desktop 1440 px и mobile 390 px: no horizontal overflow, console clean;
- Docker: postgres/redis/api healthy, web HTTP 200.

## Known limitations

- матчи, турниры, performance snapshots и achievements в паспортах остаются deterministic demo projection до Этапа 4;
- поиск Stage 3 использует индексируемый PostgreSQL `contains`; weighted FTS/`pg_trgm` projection остаётся следующим расширением;
- auth rate limit хранится в памяти процесса; Redis-backed distributed limiter нужен до горизонтального масштабирования;
- email verification/recovery, Steam/Google OAuth и управление ролями через Admin UI ещё не реализованы;
- scoped ownership policies, profile claim и verification workflow относятся к следующим этапам;
- изображения представлены monograms; S3 media pipeline ещё не подключён.

## Next step

Этап 4: перенести матчи, турниры, статистику выступлений и достижения в каноническую DB-модель/API, затем заменить оставшиеся demo sections в паспортах.
