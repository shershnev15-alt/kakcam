# Progress

Дата обновления: 3 сентября 2026. Этапы **0–14 завершены**. В Этапе 14 закрыт production baseline для публичного запуска: добавлены prod-smoke, запусковая проверка, production-compose и migration-слой для DB (`api-migrate`).

## Completed

- product/architecture/database/design/rating/achievement/verification/mobile/deployment specifications;
- pnpm TypeScript monorepo, Docker Compose, GitHub Actions, PostgreSQL 17 и Redis 8;
- deterministic seed: 40 игроков, 8 команд, 3 турнира, 30 матчей, 20 ачивок;
- публичный Next.js prototype и PPR/achievement engine foundations;
- email registration/login/logout/me и UI `/register`, `/login`, `/account`;
- Argon2id passwords, opaque HttpOnly sessions, token hashing, expiry/revocation и login enumeration protection;
- Identity/Session/Role/Permission/RolePermission/UserRole migration;
- 13 системных ролей, 25 permissions, policy guards, Origin/CSRF guard и auth rate limit;
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
- отдельная административная Next.js-консоль на порту 3001 с dashboard и 13 рабочими пространствами;
- административные API-команды для Tournament, Organization, Assertion, Import, Report, User, Achievement и безопасной архивации;
- обязательные preview/reason, `If-Match` optimistic concurrency, checksum idempotency, self-lockout guards и полный AuditLog;
- локальный `SUPER_ADMIN` создаётся только при заданных seed credentials;
- Expo SDK 57 / React Native mobile workspace с Expo Router, пятью bottom tabs и пропускаемым onboarding;
- mobile TanStack Query offline-first cache, NetInfo, SecureStore, notification-permission adapter и canonical deep links;
- live mobile Home, Matches, PPR/TPR Rankings, Discover и grouped Search на публичном REST API;
- mobile Player/Team passports, Match Center и Tournament Hub с pull-to-refresh, loading/error/empty/offline states;
- guest-first favorites, match reminders, notification preferences и inbox с AsyncStorage persistence;
- local Expo notifications за 15 минут, foreground handler, push-token adapter и permission rationale;
- canonical share actions, app/universal links и notification deep-link routing для players/teams/matches/tournaments;
- изолированные зависимости Docker-сервисов без конкурентной записи в host `node_modules`.
- активная дисциплина продукта и onboarding ограничены Counter-Strike 2; другие игры остаются отключённой точкой расширения;
- временный бренд `CYBER ID`, canonical URL и демо-метки вынесены в общий `@arena/config` для web/API/admin/mobile;
- каталоги фильтруют по городу, а игроков — также по роли и команде; сортировка по матчам и win rate работает по PostgreSQL-агрегатам;
- добавлены непустые `/about`, `/methodology`, `/sources`, `/privacy`, закрывающие все footer/methodology-ссылки;
- Steam/FACEIT account adapter layer с явным `DEMO`/`LIVE` статусом; lookup никогда не выдаётся за подтверждение владения;
- два независимых CS2 mock provider adapter с различными payload formats и единым versioned canonical contract;
- raw/canonical staging records, strict validation, identity resolution и preview до изменения публичных данных;
- stable SHA-256 exact replay, atomic apply claim, serializable conflict check, external entity links и транзакционные `CREATE`/`ASSERT`/`SKIP` outcomes;
- granular player-map statistics и series aggregate для публичного Match Center с provenance источника;
- conflict safety: совпадающий матч создаёт `FieldAssertion` в moderation queue без перезаписи canonical fact;
- административные Stage Alpha/Bravo и Apply REVIEW команды с RBAC, CSRF, reason и AuditLog.
- canonical/OpenGraph/Twitter metadata, JSON-LD и sitemap/robots policy для публичных CS2-сущностей;
- динамические share cards 1200×630 для игрока и команды с avatar/logo fallback, PPR/TPR и местом в рейтинге;
- Web/Admin CSP и security headers, Helmet API hardening, non-root production images и Dependabot policy;
- privacy-safe allow-listed analytics, нормализованные structured request logs, correlation id и защищённый Prometheus endpoint;
- CI gates для измеримых JS/CSS budgets и security baseline.
- явный `PlayerPublication`: только все обязательные подтверждения одновременно открывают Player/PPR, а отзыв любого сигнала динамически закрывает профиль;
- единая server-side policy применена к каталогу, поиску, рейтингу, sitemap, карьере, достижениям, переходам, составам и player statistics в матчах;
- scoped `FEDERATION_REVIEWER` для конкретной Organization, отдельные publish/revoke команды и audit без исходного фото/evidence reference;
- публичный профиль показывает одобренное фото, проверенные Steam/FACEIT и федерацию; кабинет объясняет весь путь допуска.
- Resend-транзакционные письма, Steam OpenID 2.0 и FACEIT OAuth Authorization Code + PKCE с одноразовыми state;
- приватное AES-256-GCM evidence-хранилище, magic-byte/size validation, удаление EXIF, malware-scan hook и отдельная публичная WebP-производная;
- Sumsub document + face match + liveness с короткоживущей WebSDK-ссылкой и проверкой HMAC webhook;
- обязательный KYC-сигнал в ручном одобрении и публикационной policy, evidence preview и исправления/отказ/одобрение в очередях web/admin;
- единый Cyber Level 1–100 поверх PPR с calibration/provisional/official состояниями, badge и прогрессом в каталоге, рейтинге и паспорте.

## Tests

- Prisma schema validation, migration deploy и idempotent seed: passed;
- API strict typecheck, 42 unit tests и production build: passed;
- Admin strict typecheck, 4 component/command tests и production build: passed;
- Mobile strict typecheck, 9 format/engagement/deep-link tests и Expo static export: passed;
- Web strict typecheck, 3 component tests и production build: passed;
- rating engine: 6 deterministic PPR/TPR tests; achievement engine: 6 tests;
- полный monorepo test suite: 87 tests passed;
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
- Stage 8 e2e: admin login 200, anonymous access 401, organization create/update 200, stale `If-Match` 412, assertion resolve 201, duplicate import 409 и immutable audit; QA records cleaned;
- Stage 9 verification: 13 Expo web routes exported, onboarding/tabs/deep-link routes compiled, mobile typecheck/tests passed;
- Stage 10–11 verification: 20 Expo web routes exported, 9 mobile tests passed; live product routes, local engagement persistence, reminders, share и notification deep-link bridge compiled;
- Stage 12 adapter tests: независимые Alpha/Bravo payloads нормализуются в один CS2 contract, cross-discipline payload отклоняется, checksum стабилен и series statistics детерминированы;
- Stage 12 e2e: Alpha stage/replay/apply, Bravo result/maps/statistics apply/replay, conflict `ASSERT` без overwrite и assertion queue `CANDIDATE`;
- Stage 12 HTTP smoke: health 200, anonymous provider access 401, публичный imported match 200 с двумя картами и series stats;
- Web smoke: transfers, achievements, career, account claim и moderation routes return 200;
- браузерный smoke бренда, статических страниц, сложного Player filter и паспортов на 1280 px/390 px: без overflow и console errors;
- HTTP smoke: public web 200, admin 200, current API health 200; Docker postgres/redis/API healthy and web 200.
- Stage 13 API observability: 5 unit tests; полный API suite 43 tests passed;
- Stage 13 strict typecheck и production build: API, Web и Admin passed;
- performance gate: Web 294354 B total gzip JS / 66289 B max JS / 34048 B max CSS; Admin 279419 B / 66288 B / 8214 B;
- security gate: mandatory Web/Admin/API headers и tracked-file secret baseline passed.
- verified-only integration: миграции применены к чистой PostgreSQL 17, seed создаёт 13 ролей/25 permissions, закрытые каталог/PPR пусты и detail возвращает 404;
- positive/revocation integration: профиль появляется только при всех шести сигналах и немедленно снова получает 404 после отзыва verified FACEIT;
- production identity flow: API/Web/Admin build, 58 API + 3 Web + 4 Admin + 9 Mobile + 7 Rating + 6 Achievement tests, lint/typecheck/format/security/performance gates passed; полный HTTP-путь с email, evidence, KYC, moderation, publication и revoke пройден, QA-данные очищены.

## Known limitations

- поиск Stage 3 использует индексируемый PostgreSQL `contains`; weighted FTS/`pg_trgm` projection остаётся следующим расширением;
- live-интеграции требуют production credentials, публичного HTTPS callback-домена, настроенных webhook и договоров/SLA с Resend, FACEIT и Sumsub;
- clutch/perfect-map/MVP rules остаются LOCKED до granular provider events; движок уже поддерживает безопасный replay этих версий правил;
- password recovery ещё не реализован; email verification, Steam OpenID и FACEIT OAuth уже подключены;
- локально encrypted evidence хранится на private volume; production object storage, внешний malware scanner, backup/restore и retention enforcement обязательны до запуска;
- bulk admin operations и MFA/step-up authentication остаются обязательными до production;
- push-token backend registration ждёт production EAS project ID и API origin; local reminders уже работают;
- guest favorites/inbox пока локальные; merge с account engagement потребует `/me/*` endpoints;
- native device/simulator smoke и signing выполняются перед store beta;
- KYC production activation ждёт утверждённого Sumsub verification level, ключей и юридических правил consent/биометрии/удаления/апелляции.
- observability counters и analytics limiter пока in-memory; production collector, Redis coordination, retention и alerts входят в следующий этап.

## Next step

Этап 15: production hardening — SBOM/signing, collector/alerts, backup/restore drill, SLO и финальный compliance.
