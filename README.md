# OnRamp
AI onboarding for junior software developers with disabilities: AccessABILITY Hackathon 2026.

- Plan: [`PLAN.md`](PLAN.md) · Roles & tasks: [`docs/ROLES.md`](docs/ROLES.md) · API contract: [`docs/API.md`](docs/API.md)

## Run locally
```bash
npm install
cp .env.example .env   # MOCK=1 by default: works without any API keys
npm run dev            # server http://localhost:3001 · client http://localhost:5173
```
Set `MOCK=0` and fill in the keys in `.env` to use the real services.

## Structure
```
client/            React 19 + Vite + Tailwind (a11y/, lib/, components/, pages/)
server/src/        Express 5: routes/ → services/ → integrations/ ; prompts/ ; mocks/ (fixtures for MOCK=1)
server/data/       audit criteria, dev adjustments catalog, legal summaries
server/eval/       golden set + retrieval eval
supabase/          migrations + seed
demo-corpus/       Brightline Software: demo repo, company docs, meeting recording
```
