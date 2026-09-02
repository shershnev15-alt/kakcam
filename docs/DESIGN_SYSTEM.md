# Design System — Arena Passport

## Принципы

1. **Доказательность:** статус, источник и полнота данных видимы рядом с фактами.
2. **Спортивная иерархия:** сначала субъект и результат, затем объяснение и детали.
3. **Тихая технологичность:** минимум glow/градиентов; выразительность создают типографика, сетка и контраст.
4. **Доступность:** WCAG 2.2 AA, keyboard-first, reduced motion, semantic landmarks.
5. **Адаптивность по задачам:** мобильный экран меняет порядок и плотность, а не просто сжимается.

## Tokens

### Color

| Token       | Dark      | Light     | Usage                 |
| ----------- | --------- | --------- | --------------------- |
| `canvas`    | `#090C12` | `#F4F6F8` | page background       |
| `surface-1` | `#10151E` | `#FFFFFF` | primary cards         |
| `surface-2` | `#161D28` | `#E9EDF2` | nested surfaces       |
| `surface-3` | `#1D2633` | `#DEE4EB` | hover/selected        |
| `text-1`    | `#F4F7FB` | `#101722` | primary text          |
| `text-2`    | `#A9B4C3` | `#516071` | secondary text        |
| `text-3`    | `#6F7C8E` | `#728092` | metadata              |
| `border`    | `#263142` | `#D5DCE5` | dividers              |
| `brand`     | `#5F8BFF` | `#315FD4` | actions and selected  |
| `accent`    | `#D6FF5F` | `#527A00` | performance highlight |
| `success`   | `#43D17D` | `#158447` | positive/verified     |
| `warning`   | `#F3B64B` | `#9A6100` | attention             |
| `danger`    | `#F16975` | `#C32D3B` | destructive/error     |
| `info`      | `#55B7E8` | `#126A9A` | neutral status        |

Верификация использует один hue и различия в label/icon/pattern, чтобы цвет не был единственным сигналом. Редкости ачивок: Common neutral, Rare blue, Epic violet, Legendary amber, Mythic crimson.

### Typography

- Display: `Space Grotesk`, fallback `Inter, system-ui`; 700, tight tracking;
- Body/UI: `Inter`, fallback system; 400/500/600;
- Data: `IBM Plex Mono`, `ui-monospace`; tabular numerals;
- scale: 12, 14, 16, 18, 22, 28, 36, 48, 64 px;
- body line-height 1.55; dense data 1.35.

Шрифты могут self-hosted; прототип использует системные fallbacks без внешнего runtime-запроса.

### Spacing, shape, elevation

- 4px base: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`;
- radius: 6 controls, 10 cards, 16 feature cards, pill only for compact status;
- borders чаще shadows; shadow: `0 12px 32px rgb(0 0 0 / .24)` для overlay;
- tap target ≥44px, input height 44/48px.

### Grid and breakpoints

- mobile `<640`: 4 columns, 16px gutters;
- tablet `640–1023`: 8 columns, 24px gutters;
- desktop `1024–1439`: 12 columns, 28px gutters, max 1280px;
- wide `≥1440`: max 1440px, 32px gutters.

## Component inventory

### Foundation

Button, IconButton, Input, SearchInput, Select, Checkbox, Radio, Switch, Tabs, Badge, VerificationBadge, Avatar, Tooltip, Dropdown, Divider, Spinner.

### Content

PlayerCard, TeamCard, MatchCard, TournamentCard, RankingCard, AchievementCard, StatCard, FormIndicator, RatingDelta, SourceStamp, CareerTimeline, ChartCard, DataTable.

### Feedback/overlay

Modal, Drawer, Toast, Alert, Skeleton, EmptyState, ErrorState, PartialDataNotice, ConfirmationDialog.

Каждый component contract включает variants, states, keyboard behavior, ARIA, responsive rules, data completeness и test id только при необходимости.

## Key patterns

### Player passport hero

На desktop: identity слева, current affiliation по центру, PPR/rank справа. На mobile: identity → PPR/rank → team/roles → trust; вторичные accounts скрыты за action sheet. За 5–10 секунд доступны «кто», «где», «насколько силен», «место», «динамика», «главное достижение».

### Data presentation

Число всегда имеет контекст: `842 PPR · #14 CIS · +23 / 30 дней`. Tooltip объясняет методику, но ключевая интерпретация доступна без hover. Unknown отличается от zero. Partial/unverified данные имеют label и источник.

### Tables

На mobile ranking table превращается в ordered cards, приоритетные столбцы остаются видимыми. Sticky header допускается только когда не перекрывает контент.

## Motion

- durations: 120ms feedback, 180ms transitions, 240ms overlay;
- easing: standard `cubic-bezier(.2,.8,.2,1)`;
- анимации не блокируют ввод и отключаются при `prefers-reduced-motion`;
- числа могут мягко обновляться, но рейтинг не «слот-машина».

## Icons and media

Единый outline icon set, stroke 1.75–2px. Флаги не заменяют текст страны. Avatar/logo assets используют focal point и pre-generated responsive sizes. Для fictional demo используются инициалы/абстрактные marks, чтобы не изображать реальных людей.

## UX states

Каждый экран обязан иметь loading/skeleton, empty, error/retry, partial, stale и unverified. Skeleton повторяет конечную геометрию. Ошибка формулирует, что недоступно, что осталось доступно и что можно сделать.

## Accessibility checklist

- контраст AA, focus ring 2px + offset;
- полная клавиатурная навигация и skip link;
- charts имеют текстовое summary/table;
- form errors связаны с полем;
- live scores используют ненавязчивый `aria-live`;
- не полагаться только на цвет, hover или gesture.
