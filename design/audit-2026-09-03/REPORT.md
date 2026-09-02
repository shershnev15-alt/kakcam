# UX/UI audit — public product and operations console

Date: 2026-09-03

Audited builds: public production preview on port 3202, admin production preview on port 3201.

## Flow health

1. **Public landing — pass after fixes.** The primary CTA now renders dark text on the green brand surface, the value proposition names all publication gates, and the advertising slot is visibly disclosed. Evidence: `07-public-home-updated-desktop.png`.
2. **Verified player profile — pass after fixes.** The profile shows the mandatory photo, federation approval, verified Steam and FACEIT accounts, free seven-day aggregate, and a clear paid-archive boundary. Evidence: `08-player-profile-updated-desktop.png`, `11-player-profile-updated-mobile.png`.
3. **Pricing and monetization — pass as a product matrix.** B2C and B2B are separated, free and paid windows are explicit, button labels remain readable, and feature text wraps inside cards. Evidence: `09-pricing-desktop.png`, `12-pricing-mobile.png`.
4. **Admin entry — pass visually.** The login view now uses the same cyberID visual system and the CTA has correct contrast. Evidence: `10-admin-updated-desktop.png`.
5. **Registration and verification — pass locally, external adapters pending.** Registration creates a session and email-verification token; the account cannot submit a claim until email confirmation. The cabinet exposes the full onboarding checklist through manual federation approval.
6. **Paid archive enforcement — pass at API boundary.** Anonymous access returns `401`; an authenticated B2C_FREE user returns `403`. Premium/B2B plans are the only accepted entitlements.

## Findings fixed

- Removed the global anchor color rule that overrode dark CTA text; computed CTA colors are now `rgb(16, 21, 18)` on `rgb(69, 255, 166)`.
- Added wrapping and minimum control heights to prevent clipped labels and overflow in public/admin interfaces.
- Confirmed `scrollWidth === viewport width` on the tested public profile and pricing screens at 390 px and 1280 px.
- Replaced the initials-only demo profile with a dedicated synthetic portrait asset and explicit synthetic demo verification records.
- Repaired the mobile navigation interaction; the menu expands and exposes eight destinations.
- Unified the admin login palette, typography, borders, and brand mark with the public product.

## Evidence limits

- The authenticated admin workspace was not opened during screenshot capture; this report covers the production login surface plus automated admin component tests.
- Browser checks covered desktop and 390 px mobile layouts. Tablet and unusual zoom levels were not exhaustively sampled.
- Keyboard focus styling and semantic labels were inspected in code, but a full screen-reader session and manual keyboard-only traversal remain a separate accessibility pass.
- Live email delivery, Steam/FACEIT ownership verification, document+liveness verification, and recurring billing require production provider credentials and contracts; the current preview exposes honest DEMO/provider-not-configured states.

## Synthetic demo asset

`apps/web/public/demo-player-frostbyte.png` was generated with the built-in image generator as a fictional adult esports headshot, with no logo, text, brand, weapon, or resemblance request. It is used only for local product QA and does not represent real identity verification.
