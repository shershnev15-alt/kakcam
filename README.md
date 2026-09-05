# CYBER ID

Цифровой паспорт игрока и команды по Counter-Strike 2: статистика, достижения и история выступлений России и стран СНГ в одном проверяемом профиле. Профиль и PPR игрока по умолчанию закрыты; общий доступ появляется только после self-claim, проверки документа/лица/liveness, подтверждения местной федерации, обязательного фото и проверенных привязок Steam + FACEIT. Архитектура допускает добавление других дисциплин позже, но текущий продукт и импорт данных работают только с CS2.

## Что уже можно посмотреть

- `http://localhost:3000` — главная;
- `http://localhost:3000/players` и `/teams` — каталоги с поиском, фильтрами и пагинацией;
- `http://localhost:3000/search?q=north` — глобальный поиск по реестру;
- `/players/:slug` — Player Digital Passport после полного допуска; demo seed намеренно не публикует вымышленных игроков;
- `http://localhost:3000/teams/northern-lights` — профиль команды;
- `http://localhost:3000/matches` — match center, карты и статистика игроков;
- `http://localhost:3000/tournaments` — календарь, участники и итоговые места;
- `http://localhost:3000/transfers` — подтверждённая лента переходов;
- `/players/:slug/achievements` и `/career` — награды и карьерная timeline только допущенного игрока;
- `http://localhost:3000/account` — самостоятельный Claim Profile; `/moderation` — защищённая очередь проверки;
- `http://localhost:3000/rankings/players` и `/rankings/teams` — рейтинги;
- `http://localhost:3000/register`, `/login`, `/account` — регистрация, вход и кабинет;
- `http://localhost:3000/about`, `/methodology`, `/sources`, `/privacy` — о проекте, формулы, provenance и приватность;
- `http://localhost:3001` — отдельная административная консоль;
- `http://localhost:4000/health`, `/ready`, `/api/v1` — API status.

Все игроки и команды prototype вымышлены.

Временное название, публичный URL и код демоисточника вынесены в `packages/config/src/product.ts`.

## Запуск

Требуется только Docker Desktop:

Для быстрой разработки:

```bash
docker compose up -d --build
docker compose ps
```

Для production-like проверки (с проверками gate и production env):

```bash
cp .env.production.example .env.production
# заполнить .env.production секретами и production-доменами

pnpm stage14:launch

# миграция запускается автоматически через одноразовый контейнер api-migrate
pnpm stage14:verify
```

Остановка после production-like проверки:

```bash
pnpm stage14:down
```

Старый способ разработки:

```bash
docker compose up -d --build
docker compose ps
```

Проверка без full-verify:

```bash
PUBLIC_WEB_URL=$PUBLIC_WEB_URL API_URL=http://localhost:${API_PORT:-4000} METRICS_TOKEN=$METRICS_TOKEN pnpm stage14:smoke
```

Первый запуск загружает образы и зависимости, применяет миграции через `api-migrate`. Остановка: `docker compose down`. Данные PostgreSQL/Redis остаются в named volumes.

Email-аутентификация использует Argon2id и отзываемые HttpOnly-сессии. Новая учётная запись получает роль `REGISTERED_USER`; права на изменение реестра назначаются отдельными ролями через RBAC.

Для локальной админки seed создаёт `admin@arena.local` с паролем `ArenaAdminDemo2026!`. Значения можно заменить через `SEED_ADMIN_EMAIL` и `SEED_ADMIN_PASSWORD`; без этих переменных административная учётная запись не создаётся.

Мобильное Expo-приложение запускается отдельно:

```bash
pnpm --filter @arena/mobile dev
```

В mobile подключены live Home, Matches, Rankings, Discover, Search, профили игрока/команды, матчи и турниры. Избранное, match reminders, inbox и preferences работают guest-first и сохраняются на устройстве.

Два демонстрационных CS2-провайдера доступны в рабочем пространстве Imports админки: данные сначала попадают в staging и preview, а затем применяются отдельной подтверждаемой командой. Exact replay переиспользует предыдущий импорт, а конфликт с существующим матчем создаёт assertion вместо перезаписи факта.

## Регистрация и верификация

Полный пользовательский путь: регистрация → письмо подтверждения → самостоятельный claim профиля → безопасная загрузка фотографии → Steam OpenID → FACEIT OAuth → Sumsub document/face/liveness → ручная проверка → решение местной федерации → публикация. Незавершённую заявку API не позволяет одобрить, а отзыв любого обязательного сигнала снова закрывает профиль.

Production-адаптеры находятся в `apps/api/src/auth`, `apps/api/src/game-accounts`, `apps/api/src/identity-verification` и `apps/api/src/verification`. Скопируйте `.env.example` в `.env` и задайте Resend, FACEIT и Sumsub credentials, публичные callback URL, ключ шифрования evidence и антивирусный endpoint. Steam OpenID не требует Web API key для доказательства владения; ключ нужен только для получения имени/аватара. Статус готовности интеграций доступен по `GET /api/v1/integrations/status`; чеклист активации — [docs/IDENTITY_INTEGRATIONS.md](docs/IDENTITY_INTEGRATIONS.md).

PPR остаётся точным рейтингом 0–1000, а Cyber Level даёт понятное представление 1–100: каждые 10 PPR — один уровень. До 25% confidence уровень показывается как оценочный со знаком `~`, при 25–39% помечен предварительным, с 40% становится официальным. Badge и прогресс до следующего уровня показаны в каталоге, рейтинге и паспорте игрока.

## Проверки

Node локально не требуется для Docker-запуска; CI выполняет lint/typecheck/test/build, затем проверяет security baseline и JS/CSS budgets. Архитектура и roadmap: [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md), gates и метрики: [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md), текущий статус: [docs/PROGRESS.md](docs/PROGRESS.md).

## Структура

`apps/web` — публичный Next.js; `apps/api` — NestJS/Prisma; `apps/admin` — защищённая Next.js-консоль; `apps/mobile` — Expo/React Native; `packages` — shared contracts/data/domain engines; `infrastructure` — Docker; `docs` — продуктовая и инженерная спецификация.
