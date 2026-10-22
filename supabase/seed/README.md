# Seed — Owner: Track D

```bash
node --env-file=.env supabase/seed/seed.mjs   # from the repo root, needs SUPABASE_URL + SUPABASE_SECRET_KEY
```

Safe to run again: existing users are kept, members are upserted, seed questions are replaced.

**Organisation:** Brightline Software.

**Demo users** (`@brightline.test` inboxes do not exist: get a login link from the Supabase dashboard → Authentication → Users):

| Name | Email | Role | Manager |
|---|---|---|---|
| Ana | ana@brightline.test | manager | – |
| Andrei | andrei@brightline.test | member | Ana |
| Maria | maria@brightline.test | member | Ana |
| Admin | admin@brightline.test | admin | – |

CODEOWNERS logins in the demo repo map to people as: `brightline-ana` = Ana, `brightline-radu` = Radu,
`brightline-ioana` = Ioana (Radu and Ioana are not app users).

**12 anonymous questions** (`is_seed = true`, no user id, the claim token is thrown away), for F13. The UI says it's seed data.

| Topic | Questions | Shown in F13 (k ≥ 5)? |
|---|---|---|
| code review | 5 | yes |
| meetings | 5 | yes |
| adjustments | 2 | **no**, below k: shows that small groups stay hidden |
