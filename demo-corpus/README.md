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
