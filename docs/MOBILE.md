# Mobile foundation

Этап 9 реализован как Expo SDK 57 / React Native workspace в `apps/mobile`. Приложение использует тот же REST API и общие transport types; контент доступен guest без регистрации.

Реализованы:

- Expo Router и bottom tabs: Home, Matches, Rankings, Discover, Profile;
- onboarding: welcome → favorite games → teams → players → notification rationale → home, каждый шаг можно пропустить;
- TanStack Query с `offlineFirst`, связанный с NetInfo;
- SecureStore adapter для мобильных токенов;
- canonical deep links `arena-passport://` и web links для player/team/match/tournament;
- notification adapter, который запрашивает системное разрешение только после явного rationale;
- Android intent filters, iOS associated-domain configuration и статический web export.

Этап 10 подключит live API к продуктовым экранам профилей, матчей, рейтингов и поиска. Push-регистрация, favorites, reminders и share cards относятся к Этапу 11. Полная карта: `SCREEN_MAP.md`.
