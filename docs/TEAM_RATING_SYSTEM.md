# Team Power Rating (TPR)

Статус: implemented v1.0.0. Диапазон 0–1000, отдельно Confidence 0–100%.

## Цель

TPR оценивает текущую конкурентную силу команды внутри одной дисциплины. Он не является суммой PPR игроков и не переносится между играми. Каждая публикация содержит formula version, cutoff и объяснение факторов.

## Match update

Основа — Elo-like expectation по pre-match TPR:

```text
expected_A = 1 / (1 + 10 ^ ((TPR_B - TPR_A) / 360))
delta = K × tournament × mode × quality × (actual - expected)
```

- `K` снижается от 42 для provisional до 24 при высокой confidence;
- tournament: Open 0.85, Regional 0.95, National 1.00, International 1.10, Elite 1.18;
- mode не дает автоматический LAN-бонус, но LAN/online имеют отдельные context projections;
- quality учитывает map/round margin с cap, forfeit не получает margin bonus;
- actual: win 1, draw 0.5, loss 0.

Чтобы best-of-one не весил как длинная серия, observation normalizer учитывает формат и число сыгранных карт. Повторные матчи с одним соперником получают diminishing weight.

## Tournament placement

После завершения турнира добавляется bounded placement adjustment `−10..+35`, зависящий от tier, ожидаемого места по pre-event TPR, количества/качества участников и фактически сыгранных матчей. Победа без матчей из-за сетки/forfeit не дает полный бонус.

## Recency

Историческое влияние уменьшается по тем же интервалам, что PPR: 0–30 дней 100%, 31–90 85%, 91–180 65%, 181–365 40%. Current TPR не использует результаты старше года, но они остаются в истории.

## Roster continuity

Core roster — игроки с существенным участием в последних 90 днях. При изменении состава:

```text
continuity = retained_weighted_rounds / previous_core_weighted_rounds
rating_prior = continuity × previous_TPR + (1-continuity) × roster_prior
confidence_after = confidence_before × (0.35 + 0.65 × continuity)
```

Замена 1/5 слегка снижает confidence; замена 2/5 и более вызывает явный provisional status. Coach change записывается как фактор, но на v1 не меняет score автоматически без калибровки.

## Confidence

Составляющие: effective matches 40%, diversity of opponents/events 20%, freshness 15%, data trust 15%, roster continuity 10%. Для основного leaderboard требуется минимум 5 серий, 3 соперника и confidence ≥30%.

## Anti-abuse и объяснение

Исключаются exhibitions, дубли, unfinalized и подозрительные матчи. Opponent strength фиксируется до матча. Серии против одного соперника capped. UI показывает вклад последних матчей, strength of schedule, placement и roster change. Пересчет создает новый immutable run.
