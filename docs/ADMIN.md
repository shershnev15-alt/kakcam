# Administrative console

Админ-панель — отдельное Next.js-приложение на `http://localhost:3001`. Она использует session/RBAC API, не обращается к PostgreSQL напрямую и не содержит произвольного SQL-интерфейса.

## Рабочие пространства

Dashboard показывает объёмы реестра, очереди claims/assertions/imports/reports и активность аудита. Доступны Players, Teams, Matches, Tournaments, Organizations, Verification, Assertions, Imports, Reports, Users, Achievements, Ratings и неизменяемый Audit.

Операционные команды включают создание и архивирование Player/Team, создание и финализацию Match, управление Tournament/Organization, решения по claims/assertions/reports, CS2 provider staging/apply и retry импортов, роли и статус пользователей, каталог/replay достижений и пересчёт рейтингов. Organization можно пометить местной федерацией, назначить ей scoped-проверяющего и после пяти проверок опубликовать либо закрыть профиль игрока.

В Imports доступны два независимых demo feed: Alpha для upcoming match и Bravo для завершённого матча с картами и статистикой. Оператор сначала запускает stage и проверяет raw/canonical preview, counters и identity resolution, затем отдельно применяет только импорт в статусе `REVIEW`. Конфликтующий provider fact направляется в Assertions; существующий матч не перезаписывается.

## Защитные правила

- чтение требует `admin.read`, каждая команда — отдельного атомарного permission;
- cookie-команды принимаются только с разрешённого Origin;
- редактирование Tournament, Organization и Achievement требует актуальный `If-Match`;
- destructive/decision операции требуют понятное основание;
- provider import защищён уникальным checksum: exact replay переиспользует прежний результат; legacy queue сохраняет `409 Conflict` для дубля;
- администратор не может заблокировать себя или снять с себя `SUPER_ADMIN`;
- `FEDERATION_REVIEWER` нельзя выдать как глобальную роль: назначение всегда ограничено конкретной федерацией, а обычный admin не обходит эту проверку;
- публикация требует approved self-claim, restricted photo, verified Steam и verified FACEIT; missing signal возвращает `409` без частичной публикации;
- каждая успешная команда формирует AuditLog с actor, reason, target и request id.

## Локальный доступ

Compose seed создаёт локального `SUPER_ADMIN`: `admin@arena.local` / `ArenaAdminDemo2026!`. Переменные `SEED_ADMIN_EMAIL` и `SEED_ADMIN_PASSWORD` предназначены только для local/preview; в production seed пользователя должен быть выключен, а первоначальный администратор создаётся контролируемой процедурой.
