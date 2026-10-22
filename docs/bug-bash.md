# Bug bash · 22 Oct 2026, 18:20 (D11)

Real API (`MOCK=0`) + real Supabase, `main` at `f684892` + `[A14] [B4] [C5]`. Logged in as the seeded users
(Andrei, Maria, Ana, Admin). UI driven with Playwright, accessibility checked with axe (WCAG 2.0–2.2 A/AA).

## Summary

- **Works end to end:** Ask with citations + enrich, Ask in Romanian, PR #57 review (exactly 2 required / 3 optional / 1 question),
  Meetings for Maria and Andrei (tasks, quotes, minutes, due dates and 4 speakers all match the answer key), diagram, TTS (slow),
  help thread Andrei → Ana → reply, Support letter, Setup steps + fixes, audit (score 58, all planted gaps), insights (k ≥ 5),
  role checks (Andrei gets 403 on insights).
- **Accessibility:** axe found **0 violations on 15 screens**; no console errors; no horizontal scroll at 320 px on Today, Support, Setup, About.
- **Demo blockers:** A1 (handoff), B1 (empty pages in the demo path), A3 (anonymous option fails).

## Track A · Stan Alexandru

| # | Severity | Bug | How to reproduce | Expected |
|---|---|---|---|---|
| A1 | **Critical (demo moment 2)** | "Who approves DB migrations?" is answered by inference instead of handing off: *"At least one approval from a CODEOWNER of the files you changed is required… which includes migrations"*. **6 of 6** times as the first question of a conversation. It handed off correctly only once, as a follow-up after the DoD question. | `POST /api/ask {"question":"Who approves DB migrations?","history":[]}` as Andrei | `NO_ANSWER` → `handoff` to Ana. Idea: a second strict check like in `services/insights.js` ("do the documents explicitly answer it?"), and run `npm run eval`: golden `o2` is this exact question |
| A2 | High | `GET /api/glossary` returns **501 not implemented**: the Glossary page and term popovers have no data | open `/glossary` | terms with definitions and sources (Hermes, Atlas, DoD, CAB, Keystone…) |
| A3 | High | `POST /api/anon` returns **501**, but the HelpChat (B4) offers "Send anonymously to the team FAQ" | Ask → no answer → choose "Send anonymously" → Send | `{ claim_token }`, question stored without user id |
| A4 | Low | Rerank timed out once and fell back to RRF order (`LLM rerank failed… Request timed out`) | seen during insights | fine as a fallback; watch it for TTFT |
| A5 | Low | Company docs were ingested from the `.md` files, so sources say "Brightline Software · Engineering Handbook" with no page; the mocks and the demo script say "Engineering Handbook, p.3" | Ask "What is the Definition of Done?" | upload `demo-corpus/company-docs/Engineering Handbook.pdf` (+ the other PDF/DOCX) instead of the `.md` files; DoD is on page 3 |
| A6 | Info | `POST /api/code-where` → 501 (F11, SHOULD) | | |

## Track B · Robert

| # | Severity | Bug | Where | Expected |
|---|---|---|---|---|
| B1 | **High (demo path)** | Glossary, Insights and Company pages, and "Your checklist" on Today, still show only a **"Load demo data"** button | `/glossary`, `/insights` (Ana), `/company` (Admin), `/today` | real UI. The APIs for Insights and Company are ready: shapes in `docs/API.md`, real examples in `server/src/mocks/{insights,audit}.json` |
| B2 | Medium | For Admin the header wraps onto two lines at 1280 px (logo and nav no longer aligned), because there are 2 more nav items | `/company` as Admin | one line, or a Menu button earlier |

## Track C · David Nedelcu

| # | Severity | Bug | How to reproduce | Expected |
|---|---|---|---|---|
| C1 | Medium (demo line) | Ticket #142 "Unclear" does not name the **date format** on its own: it says "Exact CSV columns and formats" | Tickets → `…/issues/142` | a separate "Date format is not specified" item with a ready question (demo script: "Unclear: date format → question ready") |
| C2 | Low | Ticket sources are duplicated (ARCHITECTURE.md ×2, CONTRIBUTING.md ×3) | same | one entry per document |
| C3 | Low | Speed: ticket #142 ~15 s, meeting for Andrei ~25 s (Maria ~12 s) | | cache the demo inputs before the pitch |
| C4 | Low | In one API run for Maria, the decision "Export button only for finance and admin" was missing (it was there in the UI run) | `POST /api/meetings/transcribe` me=Maria | decision present and `affects_me: true` |
| C5 | Info | `POST /api/standup/draft` → 501 (F12, SHOULD) | | |

## Track D · Onete Alexandru

No open bugs. Done in D11: content for `/about-ai` (models as configured, what is kept / never kept, what Bridge does not do, AI Act / GDPR).
Test data created during the bug bash (one help thread) was deleted.
