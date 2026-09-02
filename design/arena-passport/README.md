# Arena Passport — public player profile redesign

## Branch isolation

- Worktree: `/private/tmp/arena-passport-public-redesign`
- Branch: `codex/arena-passport-public-redesign`
- Base: `main` at `13338c7`
- Application code is intentionally unchanged until a concept is selected.

## Captured source

- Route: `http://localhost:3000/players/frostbyte`
- Viewport: `1440 × 1024`
- Screenshot: `00-current-player-profile-1440x1024.png`
- Captured: 2026-09-02

## Relevant product structure

- Page composition: `apps/web/app/players/[slug]/page.tsx`
- Global tokens and shared surface utilities: `apps/web/app/globals.css`
- Reusable profile/stat primitives: `apps/web/components/ui.tsx`
- Global navigation: `apps/web/components/header.tsx`
- Product principles and token documentation: `docs/DESIGN_SYSTEM.md`

## Existing design language to preserve at product level

- Evidence and data quality stay visible near the numbers.
- Subject and competitive result precede explanation and details.
- Data uses tabular mono numerals; display and UI type remain distinct.
- Core tokens: canvas `#090C12`, surface `#10151E`, text `#F4F7FB`, brand `#5F8BFF`, performance accent `#D6FF5F`, success `#43D17D`, border `#263142`.
- Existing type roles: display `Space Grotesk`, UI/body `Inter`, data `IBM Plex Mono`.
- Accessibility target: WCAG 2.2 AA, keyboard-first, visible focus, chart summaries, reduced motion.

## Required facts

`frostbyte`; `Алексей Морозов`; `RU`; `23 года`; `AWP`; `Northern Lights`; `PPR 541`; `Рейтинг СНГ #2`; `confidence 19%`; `K/D 1.60`; `ADR 94.9`; `KAST 82.9%`; `Win rate 100%`; `Rating 1.28`; `5 матчей`.

## Concept files

All concept images are normalized to exactly `1440 × 1024`.

Initial exploration (rejected by the user):

- `01-broadcast-esports.png`
- `02-editorial-passport.png`
- `03-analytical-lab.png`

Research-grounded second exploration:

- `04-scout-overview.png`
- `05-season-form-board.png`
- `06-table-first-public-record.png`

Third exploration after the user rejected both earlier sets:

- `07-arena-index-brutal.png`
- `08-aurora-athlete-space.png`
- `09-split-signal.png`

User-selected visual foundation:

- `reference-user-selected-hero.png`

Fourth exploration, keeping the selected hero architecture while changing the visual system:

- `10-broadcast-lime-refined.png`
- `11-league-daylight.png`
- `12-carbon-signal.png`

Fifth exploration, grounded in the current FACEIT profile pattern and designed for users without uploaded photos:

- `13-rank-console.png`
- `14-matchroom-ledger.png`
- `15-season-deck.png`

Refined hybrid requested by the user, combining the dramatic reference with the photo-independent FACEIT-grounded concepts:

- `16-arena-competitive-hybrid.png`

Comparable-site screenshots and notes are stored in `research/`.

Current FACEIT reference captured on 2026-09-02:

- `research/faceit-player-profile-2026-09-02.png`
