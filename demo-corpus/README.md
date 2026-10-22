# Demo corpus — Owner: Track D (PLAN §10)
Fictional company **Brightline Software** (EN).

- `invoicing-service/` → pushed as a **public GitHub repo** (planted gaps: PR template without "How to test", no issue templates, 3 images without alt text). Issues: #142 (ambiguous, with screenshot) + 4–5 others. PR #57 with 6 review comments (nit, blocking, question, a terse "why?").
- `company-docs/`: Engineering Handbook (DoD, standup, Slack, on-call), Workplace Adjustments Policy (**deliberately incomplete**), Security training.
- `meeting/`: 2–3 min sprint planning recording (tasks for Andrei and Maria, uses Hermes/Atlas).
- Code names: Hermes = invoicing queue, Atlas = gateway.

## invoicing-service: what is in it (D1)

**People** (CODEOWNERS handles → names, for `topic_owners` and the seed):
`@brightline-ana` = Ana, Engineering Manager, owns billing · `@brightline-radu` = Radu, senior (Hermes, DB) · `@brightline-ioana` = Ioana, senior (Atlas, web).
Juniors: Andrei (backend), Maria (frontend).

**Glossary terms used in the repo:** Hermes, Atlas, Beacon (monitoring), DLQ (dead-letter view), dunning, idempotency key, CODEOWNER, ADR, `nit:` / `blocking:` / `question:` / `suggestion:`.

**Planted gaps (F9 audit must find them):**
| Gap | Where |
|---|---|
| PR template has no "How to test" | `.github/pull_request_template.md` |
| No issue templates | no `.github/ISSUE_TEMPLATE/` |
| 3 images without alt text | `ARCHITECTURE.md` (1), `docs/setup.md` (2) |
| Only ADR-007 in the repo (001–006 "in the old wiki") | `docs/adr/` |

**Things deliberately NOT answered anywhere (keep it that way):**
- **Who approves DB migrations** (demo handoff to Ana). CODEOWNERS lists `/db/ @brightline-radu`, but no doc says who approves migrations for production.
- **Date format for CSV exports** (#142 "Unclear"). `src/utils/dates.ts` has both ISO and local formats, and `OrderExport.ts` uses local dates.

**Hooks for the other features:**
- F2 (#142): `OrderExport.ts` (streaming CSV to reuse), `InvoicesPage.tsx` (no Export button yet), the `finance` role in `src/atlas/`.
- F4 (PR #57, `csv.ts`): CONTRIBUTING has the "Performance" (streaming) and "Review conventions" sections. A comment without a prefix counts as a question.
- F10: `docs/setup.md` has 12 steps, and each error in `docs/known-issues.md` is quoted exactly.
- F11: `notify.ts`, `invoice.cron.ts` and `hermes/*` match the "How an invoice travels" section in ARCHITECTURE.md and ADR-007.

## Issues and PR #57 (D2)

GitHub numbers issues from #1, so #1–#56 and #58–#141 are a closed backlog (mostly without
acceptance criteria, ~15% with). The ones that matter for the demo:

| # | What | Used by |
|---|---|---|
| **#57** (PR, open) | "Add CSV export of a customer's invoices": `src/services/billing/csv.ts` + a route. 6 review comments: 2 `blocking:` (loads everything in memory / no role check), 2 `nit:`, 1 `suggestion:`, 1 bare "why?" (= question) → **2 required, 3 optional, 1 question** | F4 (C4) |
| **#142** | "Export invoices as CSV": vague on purpose (no columns, no filters, **no date format**), screenshot without alt text. One comment: "Only finance users should see the export" | F2 (C1), demo with Andrei |
| #143 | Dunning on Saturdays: bug, no acceptance criteria | F9, F13 |
| #144, #145 | `good first issue` with acceptance criteria | F9 |
| #146 | `good first issue`, docs, no acceptance criteria | F9 |
| #147 | Vague request from support, no acceptance criteria | F9 |

The "why?" on PR #57 has no answer on purpose: it is on the `toIsoDate` line, and #142 does not say
which date format finance wants either.

## Company documents (D3)

Upload these through `POST /api/company/ingest` (the `.md` files are the editable sources):

| File to upload | Source | Notes |
|---|---|---|
| `company-docs/engineering-handbook.pdf` (5 pages) | `engineering-handbook.md` | **DoD is on page 3** (matches the mocks). Buddy, async standup, focus time, cameras optional, on-call after 6 months, CAB (only Atlas routing + payment providers) |
| `company-docs/workplace-adjustments-policy.pdf` (2 pages) | `workplace-adjustments-policy.md` | **Incomplete on purpose:** no response time, no confidentiality / health data clause (GDPR art. 9), no assistive technology (screen readers, captioning), no appeal, and it sends people to a public Slack channel |
| `company-docs/security-training.docx` | `security-training.md` | Deadline: **30 days after start date** (good for `enrich.deadlines`) |

**Process criteria for F9:** present: DoD, buddy, async standup, focus norms, agenda the day before + written decisions, on-call deferred.
Partial: captions (only Pulse is captioned; planning, refinement and retro are not recorded).
Missing / partial in the policy: adjustments process timelines, assistive tech, health data confidentiality.

**Glossary terms in the company docs:** Hermes, Atlas, Keystone (SSO), Beacon, Ledger (finance data warehouse), Pulse (all-hands), DoD, CODEOWNER, CAB, RFC, ADR, P1/P2/P3, MFA, buddy.

**Still not answered anywhere:** who approves DB migrations; CSV date format; parental leave (golden out-of-corpus question).
