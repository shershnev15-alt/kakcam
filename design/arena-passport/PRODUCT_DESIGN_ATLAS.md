# РАЗРЯД — общий план публичного продукта

Рабочее название в макетах — **«РАЗРЯД»**. Оно не считается утверждённым брендом. Этот атлас фиксирует выбранную визуальную систему и покрывает весь текущий публичный контур приложения без реализации кода.

## Визуальная система

- Canvas: `#121212`
- Surface: `#1B1B1B`
- Divider: `#494949`
- Primary / verified: `#45FFA6`
- Text: `#E1E1E1`
- Muted: `#878787`
- Secondary data: холодный violet / blue
- Negative / live alert: coral, только для событий и отрицательных значений
- Identity: крупная condensed-типографика, монограммы и командные знаки вместо обязательных фотографий
- Reading model: один доминирующий вывод на экран, затем график/таблица, затем доказательность данных

## Атлас публичных страниц

| Семейство       | Маршрут                                | Макет                                    | Главная задача                                                  |
| --------------- | -------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Главная         | `/`                                    | `21-home-neva-system.png`                | Сводка live-событий, рейтингов, матчей и турниров               |
| Игроки          | `/players`                             | `22-players-directory-neva-system.png`   | Найти и сравнить игрока по PPR, роли, форме и confidence        |
| Профиль игрока  | `/players/frostbyte`                   | `23-player-profile-infographic-neva.png` | Понять силу, динамику, выборку и причины PPR                    |
| Достижения      | `/players/frostbyte/achievements`      | `24-player-achievements-neva.png`        | Увидеть прогресс, редкость и доказательства достижения          |
| Карьера         | `/players/frostbyte/career`            | `25-player-career-neva.png`              | Проследить команды, роли, периоды и подтверждённые переходы     |
| Команды         | `/teams`                               | `26-teams-directory-neva.png`            | Сравнить команды по TPR, форме и стабильности состава           |
| Профиль команды | `/teams/northern-lights`               | `27-team-profile-neva.png`               | Понять сыгранность, результаты, силу соперников и вклад состава |
| Рейтинги        | `/rankings/players`, `/rankings/teams` | `28-rankings-center-neva.png`            | Читать место вместе с изменением, выборкой и confidence         |
| Матчи           | `/matches`                             | `29-matches-center-neva.png`             | Быстро просканировать live, ближайшие и завершённые серии       |
| Матч            | `/matches/[id]`                        | `30-match-detail-neva.png`               | Разобрать карты, раунды, экономику и вклад игроков              |
| Турниры         | `/tournaments`                         | `31-tournaments-hub-neva.png`            | Понять календарь, пересечения событий, tier и призовые          |
| Турнир          | `/tournaments/[slug]`                  | `32-tournament-detail-neva.png`          | Проследить сетку, таблицу, матчи, участников и лидеров          |
| Трансферы       | `/transfers`                           | `33-transfers-ledger-neva.png`           | Проверить движение игроков, статус и источники перехода         |
| Поиск           | `/search`                              | `34-global-search-neva.png`              | Найти игрока, команду, матч или турнир в одном интерфейсе       |
| Карта системы   | —                                      | `35-metrics-map-neva.png`                | Связать источники, метрики, рейтинги и экраны                   |

Страницы аккаунта, входа и модерации не входят в этот атлас: запрос относится к публичному продукту.

## Метрики игрока

### Рейтинг и контекст

- PPR, место в рейтинге, tier
- Confidence
- Изменение за 7 и 30 дней
- Форма и история PPR
- Размер выборки: матчи, карты, раунды

### Производительность

- Kills, deaths, assists
- K/D
- ADR
- KAST
- Win rate
- Match rating
- Impact
- Opening duel win rate и opening attempt rate
- Clutch value
- Multikill rate
- Assist rate
- Headshot-adjusted value
- Role adjustment

### Качество рейтинга

- Sample
- Diversity
- Freshness
- Trust
- Факторы PPR и вклад каждого фактора

Зафиксированные продуктовые факты frostbyte: `PPR 541`, `СНГ #2`, `confidence 19%`, `K/D 1.60`, `ADR 94.9`, `KAST 82.9%`, `win rate 100%`, `rating 1.28`, `5 матчей`.

## Метрики команды

- TPR, место, confidence, tier, delta, форма
- Матчи, победы, поражения
- Карты W/L и раунды W/L
- Win rate и разница раундов
- Стабильность / непрерывность состава
- Сила соперников
- Турнирные места
- Факторы TPR: текущая форма, качество соперников, адаптация к мете, потери раундов, достижения команды

## Метрики матча

- Статус, дата и время, турнир, стадия, BO-формат
- Счёт серии
- Порядок карт, счёт карты, overtime
- Раундовая лента, экономика, CT/T split, momentum
- K-D-A, K/D, ADR, KAST, rating каждого игрока
- Opening duels, clutches, multikills
- Источник, verification level, evidence и checksum

## Метрики турнира

- Tier, mode, даты, статус
- Prize pool
- Количество участников и матчей
- Турнирная сетка и места
- Лучшие игроки и команды
- Карты: pick rate, win rate, overtime rate
- Сыгранные карты/раунды и средняя длительность

## Карьера, достижения и доверие

- Команда, игра, роль, начало и конец периода
- Переход from/to, дата, reported/confirmed
- Achievement category, rarity, progress/target, status
- Rule version, achieved date, revoked date
- Verification `L0–L3`, evidence count, источник
- Freshness, formula version, input cutoff и checksum

## Единая цепочка данных

`Источники → подтверждённые матчи → базовые метрики → PPR / TPR → рейтинги → профили и каталоги`

Confidence всегда показывается рядом с PPR/TPR, а verification и freshness — рядом с первичным фактом или в нижней полосе доказательности.

## План реализации после утверждения

1. Основа: токены, типографика, сетка, header, таблицы, графики, monogram/team mark, verification primitives.
2. Игроки: каталог, профиль, career, achievements, общий ranking shell.
3. Команды: каталог, профиль и TPR-визуализации.
4. Соревнования: match center, match detail, tournament hub и tournament detail.
5. Связующие страницы: главная, трансферы и поиск.
6. Responsive, keyboard navigation, текстовые summary для графиков, reduced motion и визуальная QA-проверка.

## Ограничения макетов

- Все значения, кроме явно зафиксированных фактов frostbyte, являются демонстрационными данными для проверки плотности и иерархии.
- Макеты задают направление и состав блоков, но не заменяют адаптивные состояния, loading/empty/error и детальную компонентную спецификацию.
- Код приложения в этой ветке пока не изменён.
