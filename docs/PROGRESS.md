# Progress

Дата обновления: 2 сентября 2026. Этапы: **0 завершён**, **1 foundation завершён**, **2 auth/RBAC завершён**.

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
- транзакционный AuditLog для регистрации, входа, выхода и Player/Team mutations.

## Tests

- Prisma schema validation, migration deploy и idempotent seed: passed;
- API strict typecheck, 11 unit tests и production build: passed;
- Web strict typecheck, 3 component tests и production build: passed, 58 static/SSG pages;
- полный monorepo test suite: 21 test passed;
- auth/RBAC e2e: register 201, me 200, unauthorized mutation 403, foreign Origin 403, logout 201, revoked session 401;
- Statistician e2e: Player/Team create 201 и update 200; временные QA-записи очищены;
- Moderator e2e: Player/Team soft-archive 200, archived public read 404; временные QA-записи очищены;
- database-backed `/api/v1/players/frostbyte`: 200;
- visual QA `/login`, `/register`, `/account` на desktop и 390 px: no horizontal overflow, console clean;
- Docker: postgres/redis/api healthy, web HTTP 200.

## Known limitations

- Web-паспорта и рейтинги пока читают shared demo package; переключение на API входит в Этап 3;
- matches/tournaments API остаются demo projection до Этапа 4;
- auth rate limit хранится в памяти процесса; Redis-backed distributed limiter нужен до горизонтального масштабирования;
- email verification/recovery, Steam/Google OAuth и управление ролями через Admin UI ещё не реализованы;
- scoped ownership policies, profile claim и verification workflow относятся к следующим этапам;
- изображения представлены monograms; S3 media pipeline ещё не подключён.

## Next step

Этап 3: перевести Player/Team passports, directories и rankings на DB-backed API, добавить поиск, pagination/filters, SEO-состояния и public error/empty/loading flows.
