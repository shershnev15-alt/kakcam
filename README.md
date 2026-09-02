# CYBER ID

Цифровой паспорт игрока и команды по Counter-Strike 2: статистика, достижения и история выступлений России и стран СНГ в одном проверяемом профиле. Архитектура допускает добавление других дисциплин позже, но текущий продукт и импорт данных работают только с CS2.

## Что уже можно посмотреть

- `http://localhost:3000` — главная;
- `http://localhost:3000/players` и `/teams` — каталоги с поиском, фильтрами и пагинацией;
- `http://localhost:3000/search?q=north` — глобальный поиск по реестру;
- `http://localhost:3000/players/frostbyte` — главный Player Digital Passport;
- `http://localhost:3000/teams/northern-lights` — профиль команды;
- `http://localhost:3000/matches` — match center, карты и статистика игроков;
- `http://localhost:3000/tournaments` — календарь, участники и итоговые места;
- `http://localhost:3000/transfers` — подтверждённая лента переходов;
- `http://localhost:3000/players/frostbyte/achievements` и `/career` — награды и карьерная timeline;
- `http://localhost:3000/account?claim=frostbyte` — Claim Profile; `/moderation` — защищённая очередь проверки;
- `http://localhost:3000/rankings/players` и `/rankings/teams` — рейтинги;
- `http://localhost:3000/register`, `/login`, `/account` — регистрация, вход и кабинет;
- `http://localhost:3000/about`, `/methodology`, `/sources`, `/privacy` — о проекте, формулы, provenance и приватность;
- `http://localhost:3001` — отдельная административная консоль;
- `http://localhost:4000/health`, `/ready`, `/api/v1` — API status.

Все игроки и команды prototype вымышлены.

Временное название, публичный URL и код демоисточника вынесены в `packages/config/src/product.ts`.

## Запуск

Требуется только Docker Desktop:

```bash
docker compose up -d --build
docker compose ps
```

Первый запуск загружает образы и зависимости, применяет миграцию и idempotent seed. Остановка: `docker compose down`. Данные PostgreSQL/Redis остаются в named volumes.

Email-аутентификация использует Argon2id и отзываемые HttpOnly-сессии. Новая учётная запись получает роль `REGISTERED_USER`; права на изменение реестра назначаются отдельными ролями через RBAC.

Для локальной админки seed создаёт `admin@arena.local` с паролем `ArenaAdminDemo2026!`. Значения можно заменить через `SEED_ADMIN_EMAIL` и `SEED_ADMIN_PASSWORD`; без этих переменных административная учётная запись не создаётся.

Мобильное Expo-приложение запускается отдельно:

```bash
pnpm --filter @arena/mobile dev
```

В mobile подключены live Home, Matches, Rankings, Discover, Search, профили игрока/команды, матчи и турниры. Избранное, match reminders, inbox и preferences работают guest-first и сохраняются на устройстве.

Два демонстрационных CS2-провайдера доступны в рабочем пространстве Imports админки: данные сначала попадают в staging и preview, а затем применяются отдельной подтверждаемой командой. Exact replay переиспользует предыдущий импорт, а конфликт с существующим матчем создаёт assertion вместо перезаписи факта.

## Steam и FACEIT

Отдельные адаптеры находятся в `apps/api/src/game-accounts`. По умолчанию оба работают в явном `DEMO`-режиме: не вызывают внешние API и не выдают владение аккаунтом за подтверждённое. Текущий статус доступен по `GET /api/v1/integrations/status`.

Для live lookup скопируйте `.env.example` в `.env` и задайте `STEAM_WEB_API_KEY` и/или `FACEIT_API_KEY`. Base URL можно переопределить через `STEAM_API_BASE_URL` и `FACEIT_API_BASE_URL`. Даже при наличии ключа lookup только читает публичный профиль; для верификации владения нужен отдельный OAuth/challenge-flow.

## Проверки

Node локально не требуется для Docker-запуска; CI выполняет lint/typecheck/test/build, затем проверяет security baseline и JS/CSS budgets. Архитектура и roadmap: [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md), gates и метрики: [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md), текущий статус: [docs/PROGRESS.md](docs/PROGRESS.md).

## Структура

`apps/web` — публичный Next.js; `apps/api` — NestJS/Prisma; `apps/admin` — защищённая Next.js-консоль; `apps/mobile` — Expo/React Native; `packages` — shared contracts/data/domain engines; `infrastructure` — Docker; `docs` — продуктовая и инженерная спецификация.
