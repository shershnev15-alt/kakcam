# Verification and Provenance

## Уровни

0 Unverified; 1 Account Connected; 2 Identity Verified; 3 Organizer Verified; 4 Official Verified; 5 Platform Verified.

Уровень относится прежде всего к утверждению о конкретном поле. Badge профиля — агрегированное представление, которое не делает все поля одинаково достоверными.

## Effective value

Источник создает `FieldAssertion(entity, field, value, source, observedAt, author, level)`. Resolver выбирает effective assertion по политике поля: trust tier, свежесть, полнота и ручное решение. Конфликт не уничтожает прежнее значение и создает moderation case.

## Критичные изменения

Nickname identity, real name, date of birth, game account, roster dates, match result, tournament placement, rating input и achievement evidence требуют source stamp и audit. Администратор указывает reason; high-impact action требует повышенного permission/step-up auth.

## Claim profile

`submitted → evidence_requested → review → approved/rejected`. Методы: connected game account, social challenge code, organizer/team confirmation, manual platform review. Документы не становятся публичными, хранятся encrypted с retention policy.
