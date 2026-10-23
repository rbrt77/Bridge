# Bridge
AI onboarding for junior software developers with disabilities: AccessABILITY Hackathon 2026.

- Plan: [`PLAN.md`](PLAN.md) · Roles & tasks: [`docs/ROLES.md`](docs/ROLES.md) · API contract: [`docs/API.md`](docs/API.md)

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
