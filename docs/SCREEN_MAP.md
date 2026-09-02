# Web and Mobile Screen Map

## Публичный Web

| Route                          | Цель                                                                 | Mobile priority                          |
| ------------------------------ | -------------------------------------------------------------------- | ---------------------------------------- |
| `/`                            | Ценность продукта, live/upcoming, leaders, rising, tournaments, news | live → leaders → discover                |
| `/players`                     | Каталог и фильтры игроков                                            | search + filter drawer + cards           |
| `/players/[slug]`              | Digital Passport                                                     | identity → PPR → form → results → career |
| `/players/[slug]/achievements` | Награды и прогресс                                                   | rarity filters + progress                |
| `/players/[slug]/career`       | Проверяемая история команд и переходов                               | timeline → transfers → provenance        |
| `/teams`                       | Каталог команд                                                       | region/game filters                      |
| `/teams/[slug]`                | Паспорт команды                                                      | TPR → roster → matches → history         |
| `/matches`                     | Live/upcoming/results                                                | date tabs + compact score cards          |
| `/matches/[id]`                | Match center                                                         | score → maps → lineup → player stats     |
| `/tournaments`                 | Текущие/будущие/прошедшие                                            | status tabs                              |
| `/tournaments/[slug]`          | Tournament hub                                                       | overview → matches → standings → stats   |
| `/rankings/players`            | PPR leaderboard                                                      | ordered cards; filters in drawer         |
| `/rankings/teams`              | TPR leaderboard                                                      | ordered cards                            |
| `/discover`                    | Rising, improved, young, new                                         | editorial rails                          |
| `/transfers`                   | Rumor/reported/confirmed feed                                        | trust status always visible              |
| `/news`, `/news/[slug]`        | Editorial content                                                    | reading mode                             |
| `/search`                      | Cross-entity search                                                  | typeahead + grouped results              |

## Account Web

Реализованы `/login`, `/register`, `/account` и Claim Profile внутри `/account?claim=[slug]`; `/moderation` — защищённая очередь первичной проверки. `/me/favorites`, `/me/notifications`, `/settings`, `/settings/security` входят в следующие этапы. Guest может читать весь публичный контент; auth prompt появляется только для персональных действий.

## Admin

Отдельное приложение на `http://localhost:3001`: dashboard `/` и рабочие пространства `/players`, `/teams`, `/matches`, `/tournaments`, `/organizations`, `/verification`, `/assertions`, `/imports`, `/reports`, `/users`, `/achievements`, `/ratings`, `/audit`. Таблица, выбранная запись, JSON-команда и preview находятся в одном рабочем контексте; опасные операции требуют основания и audit record.

## Mobile navigation

Bottom tabs: Home, Matches, Rankings, Discover, Profile. Global search открывается из header и доступен из deep link.

Этапы 9–11 реализованы: shell, onboarding, tabs, offline/query foundation, live product data, guest engagement, notification inbox/reminders и deep-link routing.

| Screen                       | Основная задача                             |
| ---------------------------- | ------------------------------------------- |
| Onboarding: Welcome          | Объяснить ценность, Skip доступен           |
| Favorite Games/Teams/Players | Настроить feed без регистрации              |
| Notifications Opt-in         | Объяснить типы уведомлений до OS prompt     |
| Home                         | Live, favorites, leaders, tournaments, news |
| Matches                      | Today/upcoming/results, reminders           |
| Rankings                     | Player/Team segments + filters              |
| Discover                     | Rising/improved/transfers                   |
| Search                       | Recent + grouped autocomplete/results       |
| Player Profile               | Shareable passport, sticky primary action   |
| Team Profile                 | TPR, roster, schedule, history              |
| Match                        | Live score, maps, stats, reminders          |
| Tournament                   | Schedule, bracket/standings, leaders        |
| Notifications                | Grouped inbox, deep links                   |
| User Profile                 | Guest favorites, reminders и preferences    |

## State coverage

Для каждого маршрута проектируются: initial loading, refresh, empty filters, entity not found, partial provider outage, stale cache, unverified facts, signed-out action, forbidden admin action и offline/retry на mobile.
