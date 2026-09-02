# Comparable player-profile research

Captured on 2026-09-02. HLTV was captured at 1440 × 1024; the other live sites exposed a 1280 × 720 page surface in the in-app browser. All generated Arena Passport concepts remain normalized to exactly 1440 × 1024.

## Sources

- [HLTV — s1mple](https://www.hltv.org/player/7998/s1mple): `01-hltv-s1mple-1440x1024.png`
- [BO3.gg — m0NESY](https://bo3.gg/players/m0nesy): `02-bo3-m0nesy-1440x1024.png`
- [VLR.gg — aspas](https://www.vlr.gg/player/8480/aspas): `03-vlr-aspas-1440x1024.png`
- [FACEIT — player profile](https://www.faceit.com/en/players/--tohru--): `04-faceit-player-1440x1024.png`

Liquipedia was considered but excluded from visual grounding because the live page stopped at human verification.

## Observed patterns

### HLTV

- Identity, current team, age, prize money, and career distinctions are consolidated before detailed stats.
- The first performance module combines a headline rating with role-like dimensions and a comparison cue.
- Recent matches sit beside the stat profile, making current relevance visible without opening another page.
- Weakness: the useful profile is surrounded by advertising and unrelated portal content.

### BO3.gg

- A stable profile header and deep tab model separate overview, career, matches, maps, tournaments, stats, media, and equipment.
- The overview mixes biography, matches, news, and record-level data, supporting exploration.
- Weakness: the primary performance story is pushed below a large metadata region and competing modules.

### VLR.gg

- The player header is intentionally small; the data table becomes the actual hero.
- A time-window switch changes the interpretation context immediately above the table.
- Recent results follow in a dense, scannable list.
- Weakness: the table assumes domain literacy and provides little help interpreting unfamiliar metrics.

### FACEIT

- Persistent identity rail separates player identity from game-specific performance.
- Season rank, sample size, recent performance, W/L form, and match rows read as one connected competitive state.
- Weakness: account prompts and premium/advertising surfaces interrupt the profile.

## Design implications for Arena Passport

- Keep one dominant competitive answer: `PPR 541 · Рейтинг СНГ #2`.
- Bind `confidence 19%` directly to `5 матчей`; it is a reliability warning, not a decorative badge.
- Use tabs to prevent the public overview from becoming a full feature inventory.
- Prefer either a single comparison-led stat module or one direct table over six equal cards.
- Give current form a compact, evidence-based representation without inventing opponents, scores, or trends.
- Preserve explanations and verification, but move them to a narrow secondary layer after the primary result.
