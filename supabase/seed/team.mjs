// Owner: Track A. Team accounts with email + password: everyone is admin (sees manager/admin pages) and
// also has a manager (the next person in team.json), so each of us can both ask and answer questions.
// Also sets the same password on the demo users from seed.mjs, so nobody needs a magic link.
// Safe to run again: existing users get the password reset, members are upserted.
// Run from the repo root, after seed.mjs: node --env-file=.env supabase/seed/team.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../server/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SECRET_KEY, TEAM_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env');
if (!TEAM_PASSWORD || TEAM_PASSWORD.length < 8) throw new Error('Set TEAM_PASSWORD (8+ characters) in .env');
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const ORG_NAME = 'Brightline Software';
const DEMO_EMAILS = ['ana@brightline.test', 'andrei@brightline.test', 'maria@brightline.test', 'admin@brightline.test'];

// [{ "email": "...", "name": "...", "role"?: "admin" | "manager" | "member", "manager"?: "<email>" }]
// Gitignored: real emails stay out of the repo. Copy team.example.json to start.
const TEAM = JSON.parse(readFileSync(new URL('./team.json', import.meta.url), 'utf8'));

const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

const org = must(await db.from('organizations').select('id').eq('name', ORG_NAME).maybeSingle(), 'find org');
if (!org) throw new Error(`No "${ORG_NAME}" organization: run supabase/seed/seed.mjs first`);

const { users } = must(await db.auth.admin.listUsers({ perPage: 1000 }), 'list users');
const byEmail = new Map(users.map((u) => [u.email?.toLowerCase(), u.id]));

async function upsertUser(email) {
  const existing = byEmail.get(email);
  if (existing) {
    must(await db.auth.admin.updateUserById(existing, { password: TEAM_PASSWORD, email_confirm: true }), `update ${email}`);
    return existing;
  }
  const { user } = must(await db.auth.admin.createUser({ email, password: TEAM_PASSWORD, email_confirm: true }), `create ${email}`);
  byEmail.set(email, user.id);
  return user.id;
}

const ids = {};
for (const p of TEAM) {
  p.email = p.email.trim().toLowerCase();
  const isNew = !byEmail.has(p.email);
  ids[p.email] = await upsertUser(p.email);
  console.log(`${isNew ? 'created' : 'updated'} ${p.email}`);
}

must(
  await db.from('organization_members').upsert(
    TEAM.map((p, i) => {
      // Default manager: the next teammate (ring), so every question has someone to go to.
      const manager = p.manager?.toLowerCase() ?? TEAM[(i + 1) % TEAM.length].email;
      return {
        org_id: org.id,
        user_id: ids[p.email],
        display_name: p.name,
        role: p.role ?? 'admin',
        manager_id: manager === p.email ? null : ids[manager] ?? null,
      };
    }),
    { onConflict: 'org_id,user_id' },
  ),
  'upsert members',
);
for (const p of TEAM) console.log(`member  ${p.name} (${p.role ?? 'admin'})`);

for (const email of DEMO_EMAILS) {
  if (!byEmail.has(email)) continue;
  await upsertUser(email);
  console.log(`password set for demo user ${email}`);
}
