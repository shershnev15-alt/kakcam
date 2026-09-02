# Mobile application

Этапы 9–11 реализованы как Expo SDK 57 / React Native workspace в `apps/mobile`. Приложение использует тот же REST API; guest видит только player-контент, прошедший verified-only server policy. Избранное и напоминания доступны без регистрации.

Реализованы:

- Expo Router и bottom tabs: Home, Matches, Rankings, Discover, Profile;
- onboarding: welcome → favorite games → teams → players → notification rationale → home, каждый шаг можно пропустить;
- live Home, Matches, PPR/TPR Rankings, Discover и grouped Search;
- Player, Team, Match и Tournament detail screens с loading/error/empty/refresh states;
- TanStack Query с `offlineFirst`, связанный с NetInfo, и явная offline-индикация;
- SecureStore adapter для мобильных токенов;
- AsyncStorage engagement state: избранные игроки/команды, match reminders, preferences и inbox;
- локальные match reminders за 15 минут, foreground handler и Expo push-token adapter;
- системное notification permission запрашивается только после явного rationale;
- share actions с canonical web URL для player/team/match/tournament;
- deep links `arenapassport://` и universal links для player/team/match/tournament, включая переход из notification payload;
- Android intent filters, iOS associated-domain configuration и статический web export.

До подключения auth engagement хранится на устройстве. После входа этот же provider должен синхронизироваться с `/me/favorites` и `/me/notifications`. Регистрация push token на backend включается после выдачи EAS project ID и production API origin. Native device/simulator smoke и signing остаются store-release gate. Полная карта: `SCREEN_MAP.md`.
