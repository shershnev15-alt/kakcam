# Web and Mobile Screen Map

## Публичный Web

| Route                          | Цель                                                                 | Mobile priority                          |
| ------------------------------ | -------------------------------------------------------------------- | ---------------------------------------- |
| `/`                            | Ценность продукта, live/upcoming, leaders, rising, tournaments, news | live → leaders → discover                |
| `/players`                     | Каталог и фильтры игроков                                            | search + filter drawer + cards           |
| `/players/[slug]`              | Digital Passport                                                     | identity → PPR → form → results → career |
| `/players/[slug]/achievements` | Награды и прогресс                                                   | rarity filters + progress                |
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

`/login`, `/register`, `/claim`, `/claim/[id]`, `/me`, `/me/favorites`, `/me/notifications`, `/settings`, `/settings/security`. Guest может читать весь публичный контент; auth prompt появляется только для персональных действий.

## Admin

`/admin`, `/players`, `/players/new`, `/players/[id]`, `/teams`, `/teams/[id]`, `/matches`, `/tournaments`, `/organizations`, `/verification`, `/verification/[id]`, `/imports`, `/reports`, `/users`, `/achievements`, `/ratings`, `/audit`. Editor имеет split view «форма + публичный preview», source/evidence рядом с каждым критичным полем.

## Mobile navigation

Bottom tabs: Home, Matches, Rankings, Discover, Profile. Global search открывается из header и доступен из deep link.

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
| User Profile                 | Favorites, claims, preferences, security    |

## State coverage

Для каждого маршрута проектируются: initial loading, refresh, empty filters, entity not found, partial provider outage, stale cache, unverified facts, signed-out action, forbidden admin action и offline/retry на mobile.
