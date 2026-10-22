# Accessibility pass 1 · 22 Oct 2026 (B8)

Real API (`MOCK=0`) and real Supabase on `b/TaskB` (base `4bcbd06`), signed in as the seeded users. Raw numbers are in [results.json](results.json).

## Result

| Check | Scope | Result |
|---|---|---|
| **axe-core 4.14** (WCAG 2.0, 2.1, 2.2 A/AA + best practice) | 15 screens at 1280 px, the 11 member screens at 320 px in **high contrast**, Company and Insights at 320 px | **0 violations** on 27 runs |
| axe on dynamic states | Ask answer (sources, terms), glossary popover open (1280 and 320 px), decoded ticket with diagram, Work style wizard, Menu open at 1100 px | **0 violations** |
| **Lighthouse 12.8** Accessibility | 15 screens, mobile and desktop, as signed out, member, manager and admin | **100 on all 27 runs** (goal ≥ 95) |
| Keyboard only (real Tab / Enter / Space / Esc) | Tab walk on 11 screens and 6 flows | Every stop has a visible focus ring and a name, nothing hidden or trapped; **6/6 flows pass** |
| Reflow | All screens at 320 px | No horizontal scroll |

Keyboard flows checked:

1. **Skip link**: it is the first Tab stop, visible when focused, and Enter moves focus to `<main>`.
2. **Glossary term** in an answer: Enter opens the popover with focus inside, Esc closes it, and focus returns to the term.
3. **Menu** (below 1280 px): Enter opens it, Esc closes it, and focus stays on Menu.
4. **Tickets**: type the ticket, Enter decodes it, Space ticks a checklist item.
5. **Diagram**: Enter draws it, and Download SVG is reachable with Tab.
6. **Work style**: Enter starts the wizard, focus moves to the step heading, and the options are reachable.

## Fixed in this pass

| Problem | Where | Fix |
|---|---|---|
| Page scrolled sideways at 320 px: the file input made the whole form wider than the screen | Meetings | The form column can shrink (`grid-cols-1`, `min-w-0`) |
| Command box scrolled sideways but could not be reached by keyboard (axe `scrollable-region-focusable`) | Setup, code blocks in Ask | `pre` wraps long lines instead of scrolling (`styles.css`) |
| No focus ring on the date field's inner parts (day, month, year and the calendar button) | Meetings | `:focus-within` ring on date and time inputs (`styles.css`) |
| Caption size buttons (L / XL / XXL) showed no focus: the radio inside them is visually hidden | Meetings → Live captions | The label shows the ring when its radio is focused |
| The popover's hidden Dismiss button sat outside any landmark (axe `region`) | Glossary popover | The popover renders inside `<main>` |

## How it was run

- **axe**: `axe.run` injected into each screen in Chrome (headless, same-origin frame, signed-in session). Each screen was checked at 1280 px and at 320 px, both normal and high contrast. In high contrast, transitions were turned off first, so a button is never measured halfway between two colours.
- **Lighthouse**: Lighthouse with puppeteer on Chrome headless shell 156, Accessibility category, run once with mobile emulation and once with desktop, keeping the signed-in session (`disableStorageReset`).
- **Keyboard**: puppeteer sends real key events. Each Tab walk starts at the top of the page and checks every focused element for a visible outline of at least 2 px (or a shadow), a non-empty accessible name and a non-zero size.

## Pass 2, automated part (B9) · 23 Oct 2026

Checked on 14 screens, Company, Insights and Login included. The checks used the browser's accessibility tree.

| Check | Result |
|---|---|
| Page title per screen (WCAG 2.4.2) | **Fixed.** It was "Bridge" everywhere. It now follows the h1: "Today · Bridge", "Sign in · Bridge" |
| Focus after changing page | **Changed.** Focus now moves to the page's h1, not `<main>`, so a screen reader says "Today, heading level 1" instead of reading the whole page. The skip link still goes to `<main>` |
| Focus not hidden by the floating "Talk to Bridge" button (WCAG 2.4.11) | **Fixed.** At 320 px it covered focused elements (one link fully). `scroll-padding-bottom` and room under the footer now keep focus in view |
| One h1 per screen, no skipped heading levels, landmarks, control names | Pass |
| Zoom 200 % (640 × 450 CSS px), also with text size XL | No sideways scroll, nothing clipped |
| Text spacing (WCAG 1.4.12) at 1280 and 320 px | **Fixed on Login.** The password row overflowed at 320 px. Everything else passes |
| `prefers-reduced-motion: reduce` | Nothing animates or transitions |
| axe with the Talk to Bridge panel open | 0 violations. Closing the panel returns focus to its button |

## Still to do by hand

The full demo with a screen reader only (VoiceOver on Mac, or NVDA on Windows). The live meeting (top bar, floating caption window) and Talk to Bridge by voice need a person: picking a tab to share and speaking cannot be automated.

Glossary has about 70 Tab stops, because each term has Listen and a source link. That is correct, but long; the search box at the top is the quick way in.
