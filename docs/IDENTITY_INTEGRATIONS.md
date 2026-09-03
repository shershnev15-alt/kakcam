# Production identity integrations

Код интеграций готов, но перевод в `LIVE` требует публичного HTTPS-домена, credentials и настроек в кабинетах провайдеров. Секреты не хранятся в Git; их нужно передавать контейнеру API из secret manager.

## Базовые URL

- `PUBLIC_WEB_URL=https://cyberid.example`
- `API_PUBLIC_URL=https://api.cyberid.example`
- `APP_ORIGIN=https://cyberid.example,https://admin.cyberid.example`
- FACEIT redirect URI: `https://api.cyberid.example/api/v1/integrations/faceit/callback`
- Steam return URL: `https://api.cyberid.example/api/v1/integrations/steam/callback`
- Sumsub webhook: `https://api.cyberid.example/api/v1/webhooks/sumsub`

## Email

1. Подтвердить sender domain у Resend.
2. Задать `RESEND_API_KEY` и `EMAIL_FROM`.
3. В staging зарегистрировать новый email и убедиться, что ссылка ведёт на `/verify-email` и повторно не используется.

## Steam и FACEIT

1. Задать `STEAM_OPENID_REALM`; `STEAM_WEB_API_KEY` нужен только для enrichment профиля.
2. Создать FACEIT OAuth client, внести `FACEIT_OAUTH_CLIENT_ID`, `FACEIT_OAUTH_CLIENT_SECRET` и отдельный `FACEIT_OAUTH_STATE_SECRET`.
3. Провести привязку двух тестовых аккаунтов и проверить, что повтор callback отклоняется, а один внешний ID не привязывается к двум игрокам.

## Evidence и Sumsub

1. Создать 32-байтный `EVIDENCE_ENCRYPTION_KEY`, настроить backup/retention для private volume или заменить filesystem adapter на KMS-backed object storage.
2. Подключить сканер с контрактом `POST <MALWARE_SCAN_ENDPOINT>` → JSON `{ "clean": true }` и задать token.
3. В Sumsub создать verification level с document, selfie/face match и liveness; задать `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_WEBHOOK_SECRET`, `SUMSUB_LEVEL_NAME`.
4. Включить webhook HMAC SHA-256 или SHA-512 и проверить `GREEN`, `RETRY` и окончательный отказ.
5. До live-запуска утвердить consent, биометрию, residency, retention, удаление и апелляцию с юристом/DPO.

`GET /api/v1/integrations/status` показывает readiness без раскрытия credentials. Перед production нужно пройти один полный staging smoke: email → Steam/FACEIT → Sumsub → модерация → федерация → публикация → revoke.
