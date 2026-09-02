# Master Plan — Arena Passport

Статус документа: `v0.12 / Этапы 0–12 реализованы`

Рабочее название продукта: **Arena Passport**

Главный объект продукта: **цифровой паспорт киберспортсмена**.

## 1. Архитектура

Платформа строится как модульный монолит в monorepo. На ранней стадии это дает одну транзакционную модель, быстрые изменения и простую эксплуатацию, но доменные границы сохраняются так, чтобы позже вынести тяжелые модули в сервисы без переписывания бизнес-логики.

Контуры:

- `apps/web` — публичный SSR/ISR web на Next.js;
- `apps/api` — REST API на NestJS, фоновые задачи и WebSocket gateway;
- `apps/admin` — отдельный административный Next.js-клиент;
- `apps/mobile` — Expo/React Native;
- `packages/*` — общие типы, UI, валидация, API-клиент и доменные движки;
- PostgreSQL — system of record;
- Redis — cache, rate limit, очередь задач, realtime fan-out;
- S3-compatible storage — оригиналы и производные медиа;
- PostgreSQL FTS + `pg_trgm` — поиск v1; внешний search adapter — после достижения пределов Postgres.

Архитектурные правила:

1. API не зависит от UI и внешнего поставщика данных.
2. Каждая критичная запись имеет provenance: источник, время, автора и уровень доверия.
3. Рейтинги и достижения вычисляются версионируемыми чистыми движками.
4. Внешние данные поступают через адаптеры, staging, нормализацию и проверку.
5. Публичные чтения отделены от административных команд и защищены разными политиками.

Подробнее: [ARCHITECTURE.md](./ARCHITECTURE.md).

## 2. Технологический стек

- Runtime: Node.js 24 Active LTS;
- Package manager: pnpm workspaces;
- Language: TypeScript strict mode;
- Web/Admin: Next.js 16, React 19, App Router, Server Components;
- UI: Tailwind CSS 4, CSS design tokens, headless accessible primitives;
- API: NestJS 11, OpenAPI, class-validator/Zod at boundaries;
- Data: PostgreSQL 17, Prisma ORM, SQL migrations;
- Cache/jobs: Redis 8, BullMQ;
- Mobile: Expo + React Native, Expo Router, TanStack Query;
- Tests: Vitest, Testing Library, Supertest, Playwright;
- Quality: ESLint, Prettier, TypeScript, commit conventions;
- Infra: Docker Compose locally, GitHub Actions, OCI images;
- Observability: Pino structured logs, OpenTelemetry-ready traces, Sentry adapter;
- Product analytics: provider-neutral events interface.

Перед каждым minor/major upgrade совместимость подтверждается lockfile, build и тестами.

## 3. Структура репозитория

```text
apps/
  web/              Public product and SEO pages
  api/              REST API, jobs, realtime
  admin/            Protected operations console
  mobile/           Expo iOS/Android application
packages/
  ui/               Cross-web design system
  types/            Shared transport/domain contracts
  config/           ESLint, TS and environment configuration
  api-client/       Generated/typed API client
  validation/       Shared schemas
  rating-engine/    PPR and TPR calculations
  achievements-engine/
docs/               Product and engineering documentation
infrastructure/     Docker and deployment assets
scripts/            Developer and data scripts
```

## 4. Структура БД

Модель разделена на identity/access, esports directory, competition, statistics, ratings, recognition, trust/provenance, content и engagement. Идентификаторы — UUID; публичные сущности имеют стабильный уникальный `slug`; даты хранятся в UTC; денежные суммы — decimal + currency.

Игровые показатели с общей семантикой имеют типизированные колонки. Специфичные для дисциплины расширения хранятся в versioned JSONB и валидируются схемой игры. Активная дисциплина продукта — только CS2; multi-game остаётся архитектурной точкой расширения, а не включённой функцией. Подробности и индексы: [DATABASE.md](./DATABASE.md).

## 5. Сущности

- Identity: User, Identity, Session, Role, Permission, UserRole;
- Geography: Country, Region;
- Directory: Player, PlayerProfile, PlayerGameAccount, Team, TeamMember, TeamRoster, Organization, Game, GameRole;
- Competition: Season, Match, MatchParticipant, MatchMap, MatchResult, Tournament, TournamentStage, TournamentParticipant, TournamentPlacement;
- Statistics: PlayerStatistic, PlayerMatchStatistic, PlayerTournamentStatistic, TeamStatistic, Weapon, Map;
- Ratings: PlayerRating, PlayerRatingHistory, TeamRating, TeamRatingHistory, RatingRun;
- Recognition: Achievement, PlayerAchievement, TeamAchievement, Award, Trophy;
- Career: Transfer, CareerHistory;
- Trust: Verification, VerificationEvidence, DataSource, DataImport, FieldAssertion, AuditLog, AdminAction, Report;
- Content: News, Article;
- Engagement: UserFollow, Favorite, Notification, NotificationPreference, ProfileClaim.

## 6. API

REST v1 под `/api/v1`; OpenAPI является контрактом генерации клиентов.

Основные ресурсы:

- `/players`, `/players/:slug`, `/players/:slug/ratings|matches|achievements|career`;
- `/teams`, `/teams/:slug`, `/teams/:slug/roster|ratings|matches|achievements`;
- `/matches`, `/matches/:id`;
- `/tournaments`, `/tournaments/:slug`;
- `/rankings/players`, `/rankings/teams`;
- `/search`, `/discover`, `/transfers`, `/news`;
- `/auth/*`, `/me/*`, `/claims/*`;
- `/admin/*`, `/imports/*`, `/verifications/*`;
- `/health`, `/ready`.

Публичное чтение кэшируется; команды используют idempotency keys, optimistic concurrency и audit context. Ошибки соответствуют RFC 9457 Problem Details.

## 7. Авторизация

Email + passwordless/email verification, OAuth и Steam connection связываются с одной учетной записью. Web использует rotating secure HttpOnly cookies (`SameSite=Lax/Strict` по сценарию); mobile — короткоживущий access token и rotating refresh token в SecureStore/Keychain. Пароли при включении password flow — Argon2id. Сессии можно отзывать по устройству.

Claim профиля — отдельный workflow, не автоматическое повышение роли: `submitted → evidence_requested → review → approved/rejected`.

## 8. Роли и права

RBAC: Guest, Registered User, Player, Verified Player, Team Captain, Team Manager, Coach, Organizer, Statistician, Moderator, Admin, Super Admin.

Права атомарны (`player.update.own`, `match.verify`, `verification.approve`, `admin.user.manage`). Роль дает набор прав, а ownership/scope policy ограничивает конкретный объект. Высокорисковые операции требуют step-up authentication и записываются в неизменяемый аудит.

## 9. Рейтинги

PPR и TPR имеют диапазон 0–1000, confidence 0–100%, объяснение вклада факторов и версию формулы. Расчет воспроизводим по snapshot входных данных. История append-only. UI никогда не вычисляет рейтинг. Подробности: [RATING_SYSTEM.md](./RATING_SYSTEM.md) и `TEAM_RATING_SYSTEM.md`.

## 10. Достижения

Achievement engine обрабатывает версионируемые правила по подтвержденным событиям. Награда содержит прогресс, редкость, игру, дату, источник и evidence. Повторный запуск идемпотентен. Подробности: [ACHIEVEMENTS.md](./ACHIEVEMENTS.md).

## 11. Верификация

Уровни 0–5: Unverified, Account Connected, Identity Verified, Organizer Verified, Official Verified, Platform Verified. Уровень применяется к утверждению/полю, а агрегированный badge профиля — только удобное представление. Конфликтующие источники не перезаписывают друг друга: они создают assertions и moderation case.

## 12. Frontend

Dark-first premium sports analytics, SSR/ISR для публичных страниц, server-first data fetching. Ключевой экран — Player Digital Passport. Все страницы проектируются под desktop/tablet/mobile, с skeleton, empty, error, partial и unverified states. SEO включает metadata, canonical, OpenGraph, JSON-LD, sitemap и robots.

## 13. Мобильное приложение

Expo-приложение использует тот же API и доменные контракты. Bottom navigation: Home, Matches, Rankings, Discover, Profile. Контент доступен до регистрации; onboarding собирает интересы. Архитектура включает deep links, push, favorites, share cards и reminders.

## 14. Административная панель

Отдельный deployment и origin. Модули: Players, Teams, Matches, Tournaments, Organizations, Verification, Imports, Reports, Users, Achievements, Ratings, Audit Logs. Массовые и destructive операции показывают preview, требуют подтверждение/основание и формируют audit record.

## 15. Инфраструктура

Локально — Docker Compose (`web`, `api`, `postgres`, `redis`). Production — stateless OCI workloads, managed PostgreSQL/Redis/S3, migrations как отдельный release job, CDN/WAF и encrypted backups. Среды: local, preview, staging, production. Секреты только через secret manager.

## 16. Тестирование

Пирамида: unit tests для движков и policy; integration для repositories/import; API contract/e2e; component/accessibility; Playwright для критических потоков; smoke после deploy. Обязательные контуры: auth, profiles, rating, achievements, permissions, verification.

## 17. Безопасность

Threat modeling перед auth/admin/import; строгая validation; CSP и secure headers; rate limiting; ORM parameterization; output encoding; CSRF для cookie-команд; MFA/step-up для админов; least privilege; malware/type/size checks для upload; immutable audit; dependency/container scanning; backup restore drills. PII отделяется и минимизируется, возраст публично вычисляется без раскрытия даты рождения.

## 18. Roadmap

| Этап | Результат                                                      | Критерий выхода                                             |
| ---- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| 0    | Спецификация, архитектура, DB, design system, screen map, repo | Документы согласованы между собой, skeleton запускается     |
| 1    | Postgres/Redis, API/Web skeleton, Docker, CI, demo prototype   | `compose up`, health green, lint/typecheck/test/build green |
| 2    | Auth, users, RBAC, Player/Team CRUD                            | Авторизация и permissions проверены e2e                     |
| 3    | Player/Team passports, directories, search                     | SEO-публичные профили работают с БД                         |
| 4    | Matches, stats, tournaments                                    | Полный подтверждаемый match flow                            |
| 5    | PPR, TPR, leaderboards                                         | Воспроизводимый расчет и explainability                     |
| 6    | Achievements, career, transfers                                | Event-driven rules и timeline                               |
| 7    | Verification, claim, moderation                                | Evidence и audit проходят end-to-end                        |
| 8    | Full admin                                                     | Операционные сценарии без SQL/manual edits                  |
| 9    | Mobile foundation                                              | Expo shell, onboarding, offline cache и deep links          |
| 10   | Mobile product screens                                         | ✓ Профили, матчи, рейтинги и поиск используют live API      |
| 11   | Mobile notifications and engagement                            | ✓ Favorites, reminders, share, inbox и deep links готовы    |
| 12   | External providers                                             | ✓ Два CS2-адаптера + replay/import safety                   |
| 13   | SEO, performance, security, analytics                          | Budgets, audit и observability gates                        |
| 14   | Production deployment                                          | Runbooks, backup restore, SLO and launch checklist          |

В конце каждого этапа выполняется цикл `PLAN → IMPLEMENT → RUN → TEST → FIX → VERIFY → DOCUMENT → COMMIT` и обновляется `docs/PROGRESS.md`.
