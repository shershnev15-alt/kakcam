# Progress

Дата обновления: 2 сентября 2026. Этапы **0–7 завершены**: specification, foundation, auth/RBAC, public directory, competition flow, reproducible ratings, career/achievements и claim/verification.

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
- canonical competition facts: 30 матчей, 18 immutable результатов, 39 карт и 180 подтвержденных player-match statistics;
- TournamentParticipant/Placement, Player/Team aggregates, PlayerTournamentStatistic и provenance полей матча;
- публичные `/matches`, `/matches/[id]`, `/tournaments`, `/tournaments/[slug]` и DB-backed competition sections паспортов;
- защищённый match flow: create → finalize/verify → checksum → AuditLog, повторная финализация блокируется;
- воспроизводимые PPR/TPR v1 engines с recency, opponent/event strength, trust, confidence и explainability;
- immutable RatingRun, history endpoints, formula version/checksum/cutoff в leaderboard UI и защищённый recalculation command;
- 13 permissions для Player/Team/Match/Tournament/Rating операций.
- 40 подтверждённых transfer facts и 80 карьерных периодов с source/evidence, checksum и public timeline;
- event-driven achievement engine: 20 versioned rules, progress/provisional/granted/revoked states, canonical events и идемпотентный replay;
- публичные `/transfers`, `/players/[slug]/career` и `/players/[slug]/achievements`;
- Claim Profile flow: submit → evidence requested → approved/rejected, restricted evidence и личная история заявок;
- moderation queue `/moderation`, permission `claim.review`, Verification record, VERIFIED_PLAYER role projection и immutable AuditLog;
- публичный verification summary профиля и 16 permissions для текущих доменных операций.

## Tests

- Prisma schema validation, migration deploy и idempotent seed: passed;
- API strict typecheck, 26 unit tests и production build: passed;
- Web strict typecheck, 3 component tests и production build: passed;
- rating engine: 6 deterministic PPR/TPR tests; achievement engine: 6 tests;
- полный monorepo test suite: 41 tests passed;
- auth/RBAC e2e: register 201, me 200, unauthorized mutation 403, foreign Origin 403, logout 201, revoked session 401;
- Statistician e2e: Player/Team create 201 и update 200; временные QA-записи очищены;
- Moderator e2e: Player/Team soft-archive 200, archived public read 404; временные QA-записи очищены;
- Stage 3 API smoke: pagination/filter/search/rankings, Player/Team detail, invalid query 400 и missing slug 404;
- Web smoke: DB-backed directories, search, rankings and both passports return 200; missing Player/Team return real HTTP 404;
- visual QA каталогов, поиска, паспортов, рейтинга, empty и 404 на desktop 1440 px и mobile 390 px: no horizontal overflow, console clean;
- Stage 4 e2e: protected match create 201, finalize 201, maps/result/checksum/audit persisted, duplicate finalize 409; QA records cleaned;
- Stage 5 e2e: protected PPR/TPR recalculation 201 for 40 players/8 teams; identical cutoff replay preserved run IDs and checksums; QA user cleaned;
- visual QA match center/detail, tournament hub, DB performance snapshots and rating explainability at 1440 px/390 px: no overflow, console clean;
- Stage 6 e2e: confirmed transfer 201, career projection 200, achievement replay 201 for 41 subjects и exact replay reused all 41 events;
- Stage 7 e2e: claim 201, moderation queue 200, approve 201, duplicate decision 409, public verification level 2; QA records cleaned;
- Web smoke: transfers, achievements, career, account claim и moderation routes return 200;
- Docker: postgres/redis/api healthy, web HTTP 200.

## Known limitations

- поиск Stage 3 использует индексируемый PostgreSQL `contains`; weighted FTS/`pg_trgm` projection остаётся следующим расширением;
- competition seed использует fictional internal source; внешние provider adapters/import replay относятся к Этапу 12;
- clutch/perfect-map/MVP rules остаются LOCKED до granular provider events; движок уже поддерживает безопасный replay этих версий правил;
- player map statistics агрегированы на серию; granular per-map provider imports будут добавлены с внешними адаптерами;
- auth rate limit хранится в памяти процесса; Redis-backed distributed limiter нужен до горизонтального масштабирования;
- email verification/recovery, Steam/Google OAuth и управление ролями через Admin UI ещё не реализованы;
- evidence reference в local prototype хранится в restricted DB field; encrypted object storage, malware scanning и retention enforcement обязательны до production;
- field-level assertion conflict resolver и bulk moderation workspace расширяются в полном Admin на Этапе 8;
- изображения представлены monograms; S3 media pipeline ещё не подключён.

## Next step

Этап 8: полноценная административная панель для Player/Team/Match/Tournament, assertions, reports, audit, achievement и rating operations без SQL.
