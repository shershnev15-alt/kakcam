# Database Design

## Конвенции

- PostgreSQL 17, UTC, UUID primary keys;
- `created_at`, `updated_at`; soft delete только там, где требуется восстановление/история;
- `slug` уникален в пределах типа сущности и не переиспользуется;
- пользовательский текст хранит original и при необходимости normalized/search form;
- PII имеет ограниченный доступ и не попадает в analytics/logs;
- история рейтингов, assertions и audit — append-only;
- все внешние идентификаторы уникальны по `(data_source_id, entity_type, external_id)`.

## Схемы и сущности

### Identity & access

| Сущность          | Назначение и ключевые поля                                  |
| ----------------- | ----------------------------------------------------------- |
| User              | email, displayName, locale, status, emailVerifiedAt         |
| Identity          | userId, provider, providerSubject, passwordHash             |
| Session           | userId, tokenHash, expiresAt, lastSeenAt, revokedAt, device |
| Role / Permission | code, scope; many-to-many RolePermission                    |
| UserRole          | userId, roleId, optional organization/team scope, validity  |
| ProfileClaim      | userId, playerId, status, method, reviewer, decisionReason  |

### Geography and catalog

| Сущность             | Назначение                                                      |
| -------------------- | --------------------------------------------------------------- |
| Country              | ISO-3166 code, localized name, flag asset                       |
| Region               | countryId, type, localized name                                 |
| Game                 | slug, name, publisher, status                                   |
| GameRole             | gameId, slug, title, category                                   |
| Weapon / GameMap     | gameId, stable key, localized name, status                      |
| GameMetricDefinition | gameId, key, valueType, unit, aggregation, constraints, version |

### Players and teams

| Сущность          | Важные поля                                                                    |
| ----------------- | ------------------------------------------------------------------------------ |
| Player            | slug, nickname, countryId, currentTeamId, status, aggregateVerificationLevel   |
| PlayerProfile     | playerId, realName visibility, birthDate private, regionId, bio, avatarAssetId |
| PlayerGameAccount | playerId, gameId, provider, externalId, handle, verifiedAt                     |
| PlayerGameRole    | playerId, gameRoleId, isPrimary, validFrom/To                                  |
| Team              | slug, name, shortName, countryId, organizationId, foundedAt, status            |
| TeamRoster        | teamId, gameId, name, validFrom/To, status                                     |
| TeamMember        | rosterId, playerId, function, joinedAt, leftAt, shirtNumber                    |
| Organization      | slug, legal/display name, countryId, website, socials                          |
| CareerHistory     | playerId, teamId, gameId, role, startedAt, endedAt, source                     |
| Transfer          | playerId, fromTeamId, toTeamId, date, status, fee visibility, source           |

Ограничения: только один active primary roster на `(team, game)`; периоды membership не должны иметь противоречивых дублей; currentTeam — projection из активного состава, а не единственный источник истории.

### Competition

| Сущность              | Важные поля                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| Season                | gameId, name, startsAt, endsAt                                            |
| Organizer             | organization/profile, trust level                                         |
| Tournament            | slug, gameId, organizerId, tier, mode LAN/online/hybrid, dates, prizePool |
| TournamentStage       | tournamentId, type, format, order, config JSONB                           |
| TournamentParticipant | tournamentId, team/player, seed, status                                   |
| TournamentPlacement   | participantId, placeFrom/To, prize, points                                |
| Match                 | gameId, tournament/stage, startsAt, status, format, bestOf, verification  |
| MatchParticipant      | matchId, side, teamId, rosterSnapshotId, score, result                    |
| MatchMap              | matchId, gameMapId, order, status, score, overtime                        |
| MatchResult           | matchId/mapId, winner, forfeit, finalizedAt                               |

Lineup snapshot неизменяемо фиксирует состав на момент матча, чтобы последующие трансферы не меняли историю.

### Statistics

| Сущность                  | Grain                         |
| ------------------------- | ----------------------------- |
| PlayerMatchStatistic      | player × match × optional map |
| PlayerTournamentStatistic | player × tournament           |
| PlayerStatistic           | player × game × period/mode   |
| TeamStatistic             | team × game × period/mode     |

Базовые поля: sampleMatches/maps/rounds, kills, deaths, assists, wins, losses, ratingInputVersion. `metrics JSONB` содержит discipline-specific значения с `metricsSchemaVersion`. Уникальный индекс защищает grain. Raw facts отделены от агрегатов.

### Ratings and recognition

| Сущность                                | Назначение                                                             |
| --------------------------------------- | ---------------------------------------------------------------------- |
| RatingRun                               | engine, formulaVersion, inputCutoff, filters, status, checksum         |
| PlayerRating / TeamRating               | current projection, score, displayScore, confidence, rank, explanation |
| PlayerRatingHistory / TeamRatingHistory | append-only snapshot per run/date                                      |
| Achievement                             | code, game/category, rarity, ruleVersion, rule JSON, icon              |
| PlayerAchievement / TeamAchievement     | subject, achievement, progress, grantedAt, source/evidence             |
| Award / Trophy                          | tournament recognition and physical/title distinction                  |

### Trust and operations

| Сущность             | Назначение                                                           |
| -------------------- | -------------------------------------------------------------------- |
| DataSource           | type, owner, trust policy, rate limits, active status                |
| DataImport           | provider, raw artifact, checksum, state, counters, errors            |
| FieldAssertion       | entity/field/value, source, observedAt, author, verification, status |
| Verification         | subject/assertion, level, method, status, validity, reviewer         |
| VerificationEvidence | verificationId, evidence type, storage key/hash, visibility          |
| Report               | reporter, target, category, status, resolution                       |
| AuditLog             | actor, action, target, before/after diff, reason, request metadata   |
| AdminAction          | workflow wrapper for high-impact operations                          |

`AuditLog` не содержит secret/token/raw ID document. Evidence хранится отдельно, encrypted, с retention policy.

### Content and engagement

News/Article поддерживают draft/review/published, author, localized body, SEO metadata. UserFollow/Favorite имеют typed target. Notification хранит immutable delivery payload, а NotificationPreference — канал и topic preference.

## Индексы

- unique: slugs, provider external IDs, entity grains;
- B-tree: foreign keys, status+date feeds, rating game/region/score;
- partial: active rosters, non-revoked sessions, pending moderation;
- GIN: FTS vectors and approved JSONB access paths;
- `pg_trgm`: nickname, normalized real name, team and organization names;
- BRIN: very large append-only audit/rating history by timestamp when justified.

## Search projection

`search_document` содержит entityType, entityId, title, aliases, normalized identifiers, country/game filters, popularity, verification и weighted `tsvector`. Обновляется транзакционным outbox consumer. Steam ID доступен для поиска, но маскируется в публичном результате по privacy policy.

## Миграции и seed

- миграции только forward и reviewed; destructive change — expand/migrate/contract;
- production migration запускается отдельной job до rolling deploy;
- seed идемпотентен по stable keys;
- demo seed: 40 fictional players, 8 teams, 3 tournaments, 30 matches, 20 achievements;
- stage 3 baseline: даты рождения профилей и первоначальные rating projections;
- stages 4–5 seed: 18 immutable MatchResult, 39 MatchMap, 180 PlayerMatchStatistic, 24 TournamentParticipant, 8 TournamentPlacement, 40/8 aggregate statistics и computed PPR/TPR runs;
- production никогда не запускает demo seed автоматически.

Миграция `20260902073211_auth_rbac` добавляет auth/RBAC. Миграция `20260902090915_competition_and_rating_runs` добавляет карты и immutable results, tournament participants/placements, period/tournament statistics и FK rating snapshots → RatingRun. Seed идемпотентно создаёт 12 системных ролей, 13 permissions и computed PPR/TPR projections. Пароль хранится как Argon2id PHC string, session token — только как SHA-256 hash; сырые токены и пароли не попадают в AuditLog.

## Backup и retention

PITR + daily backups; quarterly restore test. Audit/rating history хранится долгосрочно; raw imports и evidence получают отдельные retention policies. Удаление учетной записи отделяет пользовательские PII от публично значимых спортивных фактов и проходит юридически определенную процедуру.
