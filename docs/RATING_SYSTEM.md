# Player Performance Rating (PPR)

Статус: implemented v1.0.0 для детерминированного replay на подтвержденных фактах. Перед публичным спортивным применением веса калибруются на историческом holdout-наборе и проходят экспертную проверку.

## Что означает PPR

PPR сравнивает игрока только с релевантной когортой одной дисциплины и периода. Итог — `0–1000`, display score — `0–100`, отдельно показывается Confidence. Ранг Rookie…Legend — визуальный слой, не замена числу.

## Расчет v1

Для каждого player-map observation `i` строятся компоненты:

```text
performance_i =
  0.18·z(K/D) + 0.14·z(KAST) + 0.12·z(ADR) +
  0.10·z(impact) + 0.08·z(opening_duel_win_rate) +
  0.07·z(opening_attempt_rate) + 0.07·z(clutch_value) +
  0.06·z(multikill_rate) + 0.05·z(assist_rate) +
  0.04·z(headshot_adjusted) + 0.09·role_adjustment
```

Все rate metrics нормируются на rounds/maps и winsorize на p1/p99. `z` — robust z-score относительно игры, патча/сезона, role и конкурентного tier: `(x − median) / (1.4826·MAD)`, с fallback на mean/std при недостатке данных.

Observation weight:

```text
w_i = recency_i × opponent_i × tournament_i × result_i × data_quality_i
```

- recency: 0–30 дней `1.00`; 31–90 `0.85`; 91–180 `0.65`; 181–365 `0.40`; старше года не входит в current PPR;
- opponent: `clamp(0.80 + (opponentTPR−500)/1250, 0.65, 1.25)` с pre-match TPR;
- tournament: Open 0.85, Regional 0.95, National 1.00, International 1.10, Elite 1.18;
- mode adjustment относится к cohort/tournament model, LAN не является автоматическим бонусом;
- result: индивидуальная оценка умножается на 0.97 loss / 1.00 draw / 1.03 win, чтобы не скрывать сильную игру в слабой команде;
- data quality: от 0.65 до 1.00 по completeness и verification.

Weighted individual score переводится в bounded percentile-like score:

```text
base = 1000 × sigmoid(0.90 × weighted_mean(performance_i))
```

Контекстные добавки ограничены, чтобы не доминировать над игрой:

```text
bonus = tournament_placement (0..35) + awards (0..20) + consistency (−25..25)
PPR_raw = clamp(base + bonus, 0, 1000)
```

MVP засчитывается только из подтвержденного турнира и имеет diminishing returns. Consistency оценивает нижний квартиль и дисперсию относительно role, а не просто малую вариативность.

## Minimum sample и shrinkage

Полный вес начинается с 25 карт и минимум 3 матчей против 3 разных соперников за 180 дней. До этого применяется empirical Bayes shrinkage к cohort prior 500:

```text
effective_n = Σ w_i
reliability = effective_n / (effective_n + 18)
PPR = 500 + reliability × (PPR_raw − 500)
```

Это не дает игроку с тремя выдающимися картами занять первое место.

## Confidence score

```text
sample = 1 − exp(−effective_maps / 18)
diversity = min(1, opponents/8) × min(1, tournaments/4)
freshness = weighted share of observations <= 90 days
trust = weighted verification/completeness score
confidence = 100 × (0.45·sample + 0.20·diversity + 0.20·freshness + 0.15·trust)
```

Confidence ниже 40% помечает provisional rating; ниже 25% исключает из основного leaderboard. Независимо от confidence, PPR и профиль полностью закрыты, пока игрок не выполнит verified-only publication policy: self-claim, photo, Steam, FACEIT и identity/liveness.

## Cyber Level 1–100

Cyber Level — визуальный слой поверх PPR, а не отдельная формула силы. Точное значение PPR остаётся первичным и используется для сортировки рейтинга.

```text
level = clamp(floor(round(PPR) / 10), 1, 100)
nextLevelAt = (level + 1) × 10
progress = (round(PPR) mod 10) × 10%
```

- confidence 0–24%: `CALIBRATING`, уровень показывается как оценочный со знаком `~`;
- confidence 25–39%: `PROVISIONAL`, уровень виден как предварительный;
- confidence 40–100%: `OFFICIAL`, уровень опубликован;
- PPR 1000: Level 100, прогресс завершён.

Так один и тот же расчёт детерминированно используется API, каталогом, таблицей рейтинга и паспортом игрока. Уровень не повышается за подписку, активность на сайте или ручное действие администратора.

## Ranks

Предварительные фиксированные bands: Rookie 0–399, Challenger 400–499, Contender 500–599, Pro 600–699, Elite 700–799, Master 800–899, Legend 900–1000. После калибровки можно перейти на сезонные percentile bands, сохраняя PPR.

## Explainability

Для каждого snapshot сохраняются formulaVersion, cohort, cutoff, sample, confidence, factor contributions, strongest/weakest component и rating delta causes. UI показывает короткое объяснение, например: «+18: высокая эффективность opening duels; −7: слабый strength of schedule; confidence 82% из 31 карты».

## Anti-abuse

- только finalized, non-duplicate matches с roster snapshot;
- source trust, anomaly detection и impossible-value validation;
- минимум разных opponents/tournaments;
- caps для repeated opponent и одного event;
- pre-match opponent strength предотвращает circular boost;
- forfeit/exhibition отдельно и по умолчанию исключены;
- corrections создают новый versioned run, история не переписывается молча;
- suspicious clusters отправляются в moderation, не получают автоматический бан.

## Версионирование и тесты

Формула живет в `packages/rating-engine`, конфигурация immutable и хранится с run. Обязательные тесты: monotonic improvements, bounds, decay boundaries, shrinkage, missing metrics, role cohorts, deterministic replay, no future leakage и property-based invariants.

## Team Power Rating (TPR)

TPR рассчитывается отдельной моделью: Elo-like match expectation + tournament placement + quality of wins + recent form. Confidence учитывает объем и стабильность состава; при замене 2/5 core игроков применяется roster continuity factor и confidence падает немедленно. Полная спецификация будет поддерживаться в `docs/TEAM_RATING_SYSTEM.md` на этапе 5.
