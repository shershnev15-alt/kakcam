# Сбор CS2-данных и собственный рейтинг

Статус: детерминированный import staging и PPR v1 уже реализованы. Live-коннекторы и коммерческие data-лицензии подключаются по одному источнику после правовой проверки условий использования.

## Источники по приоритету

1. Официальные протоколы турнирного оператора и серверные match exports.
2. FACEIT API/OAuth для identity link и доступных матчевых данных.
3. Steam OpenID для доказательства владения аккаунтом; публичный Web API — только для разрешённых атрибутов.
4. Федерации и клубы — подписанные roster/identity assertions.
5. Ручная модерация — только для конфликта, а не как основной источник статистики.

Скрапинг площадок без API или лицензии не является production-источником. Для каждого адаптера фиксируются ToS, разрешённые поля, retention, лимит запросов и дата последней юридической проверки.

## Pipeline

`connector → raw immutable payload → schema validation → identity resolution → deduplication → assertion → moderation/conflict → canonical fact → aggregate → versioned PPR run`

Каждый факт хранит `sourceCode`, `observedAt`, checksum, completeness и verification level. Повторный payload идемпотентен. Несовпадение с canonical fact создаёт assertion, но не переписывает историю.

## Identity graph

Игрок связывается с SteamID64 и FACEIT player_id только после самостоятельного OpenID/OAuth callback с одноразовым `state`. Никнейм, URL профиля или API lookup не доказывают владение. Один внешний ID уникален и не может быть привязан к двум игрокам.

## PPR

PPR считается только на finalized verified matches, нормируется по роли, патчу, tier и силе соперника, применяет recency decay и shrinkage к prior 500. Confidence публикуется отдельно. Формула, cutoff и входной checksum immutable; перерасчёт создаёт новый snapshot. Подробная формула — в `RATING_SYSTEM.md`.

## Что измерить до публичного запуска

- корреляцию PPR с независимыми экспертными оценками и последующими результатами;
- стабильность по ролям и регионам;
- устойчивость к малой выборке, farm-матчам и повторяющимся соперникам;
- drift после патчей;
- долю матчей с полным и лицензированным набором полей.
