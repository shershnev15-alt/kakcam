# Achievement Engine

## Назначение

Ачивка — проверяемый карьерный факт, а не декоративная наклейка. Она всегда отвечает на вопросы: что выполнено, когда, в какой игре, на основании каких данных и насколько источник надежен.

## Модель

`AchievementDefinition`:

- stable `code`, localized title/description;
- game или cross-game scope;
- category: CAREER, VICTORIES, PERFORMANCE, CLUTCH, TEAM, TOURNAMENT, RATING, SPECIAL;
- rarity: Common, Rare, Epic, Legendary, Mythic;
- versioned declarative rule;
- progress unit, threshold, icon token;
- evidence requirements and retroactive policy.

`AchievementGrant`:

- subject player/team, definition + rule version;
- progress/current target;
- grantedAt/firstQualifiedAt;
- source/evidence, verification level;
- status: provisional, granted, revoked;
- unique evaluation key for idempotency.

## Выполнение правил

Canonical события (`MatchFinalized`, `TournamentPlacementVerified`, `RosterPeriodClosed`, `RatingPublished`) поступают в движок. Движок получает read-only facts, оценивает declarative rule, upsert-ит progress и публикует `AchievementGranted`. Повтор события не создает дубль. Correction вызывает re-evaluation; отзыв сохраняется в истории с причиной.

Правила не исполняют произвольный код из БД. Поддерживаемые operators: count, sum, max, consecutive, distinct, percentile/rank, duration, all/any и scoped filters. Новая версия правила не меняет старую награду без явной migration policy.

## Стартовый каталог (20)

| Code                      | Название         | Условие                      | Редкость  |
| ------------------------- | ---------------- | ---------------------------- | --------- |
| `career.first_match`      | First Match      | 1 verified match             | Common    |
| `career.first_tournament` | First Tournament | 1 tournament                 | Common    |
| `career.tournaments_10`   | Tour Regular     | 10 tournaments               | Rare      |
| `career.tournaments_50`   | Circuit Veteran  | 50 tournaments               | Epic      |
| `victory.first`           | First Win        | 1 verified win               | Common    |
| `victory.10`              | Winning Habit    | 10 wins                      | Rare      |
| `victory.50`              | Proven Winner    | 50 wins                      | Epic      |
| `performance.30_bomb`     | 30 Bomb          | ≥30 kills on a CS2 map       | Rare      |
| `performance.40_bomb`     | 40 Bomb          | ≥40 kills on a CS2 map       | Epic      |
| `performance.perfect_map` | Perfect Map      | configured perfect-map rule  | Legendary |
| `clutch.1v2`              | Against Two      | verified 1v2 clutch          | Rare      |
| `clutch.1v3`              | Against Three    | verified 1v3 clutch          | Epic      |
| `clutch.1v4`              | Against Four     | verified 1v4 clutch          | Legendary |
| `clutch.1v5`              | One Versus All   | verified 1v5 clutch          | Mythic    |
| `team.loyal_365`          | Loyal Player     | 365 continuous days one team | Rare      |
| `tournament.first_podium` | First Podium     | place 1–3                    | Rare      |
| `tournament.champion`     | Champion         | verified 1st place           | Epic      |
| `rating.top_100`          | Top 100          | published rank ≤100          | Rare      |
| `rating.top_10`           | Top 10           | published rank ≤10           | Legendary |
| `special.mvp`             | MVP              | verified tournament MVP      | Legendary |

Порог и точная семантика всегда scoped по игре. «30 Bomb» не применяется к другой дисциплине автоматически.

## Progress и rarity

Progress показывает `current/target`, период и источник. Для milestone series каждая ступень — отдельная definition, связанная `seriesCode`. Rarity назначается на основе сложности и распространенности, затем проверяется фактической долей выданных наград. Ее нельзя использовать как доказательство уровня игрока.

## Источники и доверие

Автовыдача требует минимального verification level правила. Если данные достаточны, но уровень ниже, grant остается provisional и визуально отличается. Ручная награда требует permission, reason и evidence; все действия попадают в audit.

## Тестирование

- boundary cases и game scope;
- idempotent duplicate events;
- out-of-order events;
- correction/revocation;
- progress monotonicity, кроме документированного rolling window;
- rule version migration;
- permissions/manual grant audit;
- deterministic replay на fixed event log.
