# Administrative console

Админ-панель — отдельное Next.js-приложение на `http://localhost:3001`. Она использует session/RBAC API, не обращается к PostgreSQL напрямую и не содержит произвольного SQL-интерфейса.

## Рабочие пространства

Dashboard показывает объёмы реестра, очереди claims/assertions/imports/reports и активность аудита. Доступны Players, Teams, Matches, Tournaments, Organizations, Verification, Assertions, Imports, Reports, Users, Achievements, Ratings и неизменяемый Audit.

Операционные команды включают создание и архивирование Player/Team, создание и финализацию Match, управление Tournament/Organization, решения по claims/assertions/reports, очередь и retry импортов, роли и статус пользователей, каталог/replay достижений и пересчёт рейтингов.

## Защитные правила

- чтение требует `admin.read`, каждая команда — отдельного атомарного permission;
- cookie-команды принимаются только с разрешённого Origin;
- редактирование Tournament, Organization и Achievement требует актуальный `If-Match`;
- destructive/decision операции требуют понятное основание;
- импорт защищён уникальным checksum, повтор возвращает `409 Conflict`;
- администратор не может заблокировать себя или снять с себя `SUPER_ADMIN`;
- каждая успешная команда формирует AuditLog с actor, reason, target и request id.

## Локальный доступ

Compose seed создаёт локального `SUPER_ADMIN`: `admin@arena.local` / `ArenaAdminDemo2026!`. Переменные `SEED_ADMIN_EMAIL` и `SEED_ADMIN_PASSWORD` предназначены только для local/preview; в production seed пользователя должен быть выключен, а первоначальный администратор создаётся контролируемой процедурой.
