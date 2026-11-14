# Bridge
AI onboarding for junior software developers with disabilities. **2nd place at the AccessABILITY Hackathon 2026** (22–23 Oct 2026).

Bridge adapts the company to the new hire, not the other way around. The developer describes how they work best (shorter answers,
larger text, high contrast, step-by-step instructions), and every screen and every AI answer follows that profile.

## What it does
- **Ask**: answers questions about the team's code and docs, streamed, with cited sources; when it is not sure, it hands the question to a person.
- **Work style**: a 5-question setup (or free text) that changes text size, spacing, contrast, motion and answer length across the whole app.
  Settings stay on the device unless the user opts in to sync.
- **Tickets**: turns a GitHub issue into steps, acceptance criteria and open questions, with an optional diagram.
- **Meetings**: live captions and a list of "my tasks" from a meeting recording.
- **Help**: questions to a manager, by name or anonymously, with live replies; good answers become team FAQ.
- **Company audit**: a "junior-ready" score for the team's docs, with the gaps and the first step to fix each one.

## Team
| Track | Who | Scope |
|---|---|---|
| A | Stan Alexandru | RAG pipeline and backend core |
| **B** | **Tudorache Robert** | **Frontend and accessibility** |
| C | David Nedelcu | AI features: tickets, meetings, reviews, voice |
| D | Onete Alexandru | Demo corpus, data, adjustments and audit logic |

### My part (Track B)
- App shell: design tokens (contrast ≥ 4.5:1, high contrast 7:1), responsive navigation down to 320 px, sign-in and role guard.
- Screens: Work style, Ask, Help / Messages, Today, Glossary, Company and Insights, plus the decoded ticket view and the diagram component.
- Accessibility audit of the whole app: **0 axe-core violations in 27 runs** (WCAG 2.2 A/AA), **Lighthouse accessibility 100** on every
  screen (mobile and desktop), all keyboard-only flows passing. Full report: [`docs/a11y`](docs/a11y/README.md).
- [My commits](https://github.com/rbrt77/Bridge/commits/main?author=roby975312%40gmail.com)

**Stack:** React 19, Vite, Tailwind CSS, react-aria, Mermaid · Express 5, Supabase (Postgres, Auth, Realtime) · OpenAI API, ElevenLabs.

Planning docs (in Romanian): [`PLAN.md`](PLAN.md) · [`docs/ROLES.md`](docs/ROLES.md) · API contract: [`docs/API.md`](docs/API.md)

## Run locally
```bash
npm install
cp .env.example .env   # MOCK=1 by default: works without any API keys
npm run dev            # server http://localhost:3001 · client http://localhost:5173
```
Set `MOCK=0` and fill in the keys in `.env` to use the real services.

### Real services (`MOCK=0`)
1. Supabase: run `supabase/migrations/*.sql` in order, then the seed (demo users + anonymous questions) and the team accounts:
   ```bash
   node --env-file=.env supabase/seed/seed.mjs
   node --env-file=.env supabase/seed/team.mjs   # needs supabase/seed/team.json and TEAM_PASSWORD
   ```
2. In `.env`, set the server keys (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `GITHUB_TOKEN`, `SUPABASE_*`) **and** the client ones
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` = the publishable key). Without the `VITE_*` keys the client stays in demo mode
   as "Andrei", with no sign-in or sign-out.
3. Restart `npm run dev` after any change to `.env`, then sign in with email + password. `npm run login -- <email>` prints a
   one-time sign-in link instead.

Live captions and voice input work in Chrome or Edge; for a meeting in another tab, share the tab with "Also share tab audio".

## Structure
```
client/            React 19 + Vite + Tailwind (a11y/, lib/, components/, pages/)
server/src/        Express 5: routes/ → services/ → integrations/ ; prompts/ ; mocks/ (fixtures for MOCK=1)
server/data/       audit criteria, dev adjustments catalog, legal summaries
server/eval/       golden set + retrieval eval
supabase/          migrations + seed
demo-corpus/       Brightline Software: demo repo, company docs, meeting recording
```
