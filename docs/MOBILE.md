# Mobile foundation

React Native + Expo приложение начнется на Этапе 9 и использует тот же REST API и общие transport types. Контент доступен guest без регистрации.

Bottom tabs: Home, Matches, Rankings, Discover, Profile. Onboarding: welcome → favorite games → teams → players → notification rationale → home, каждый шаг можно пропустить.

Архитектура: Expo Router, TanStack Query cache, SecureStore для refresh token, push adapter, universal/deep links, offline stale data, share URLs на canonical web profiles. OS notification prompt показывается только после объяснения пользы. Полная карта: `SCREEN_MAP.md`.
