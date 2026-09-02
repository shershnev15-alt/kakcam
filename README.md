# Arena Passport

Цифровой паспорт киберспортсмена и команды: статистика, достижения и история выступлений России и стран СНГ в одном проверяемом профиле.

## Что уже можно посмотреть

- `http://localhost:3000` — главная;
- `http://localhost:3000/players/frostbyte` — главный Player Digital Passport;
- `http://localhost:3000/teams/northern-lights` — профиль команды;
- `http://localhost:3000/rankings/players` и `/rankings/teams` — рейтинги;
- `http://localhost:4000/health`, `/ready`, `/api/v1` — API status.

Все игроки и команды prototype вымышлены.

## Запуск

Требуется только Docker Desktop:

```bash
docker compose up -d --build
docker compose ps
```

Первый запуск загружает образы и зависимости, применяет миграцию и idempotent seed. Остановка: `docker compose down`. Данные PostgreSQL/Redis остаются в named volumes.

## Проверки

Node локально не требуется; CI выполняет `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Архитектура и roadmap: [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md). Текущий статус: [docs/PROGRESS.md](docs/PROGRESS.md).

## Структура

`apps/web` — публичный Next.js; `apps/api` — NestJS/Prisma; `apps/admin` и `apps/mobile` — зафиксированные будущие границы; `packages` — shared contracts/data/domain engines; `infrastructure` — Docker; `docs` — продуктовая и инженерная спецификация.
