// Owner: Track D. Demo users + 12 seed anonymous questions for F13. Safe to run again:
// existing users are kept, members are upserted, seed questions (is_seed = true) are replaced.
// Run from the repo root: node --env-file=.env supabase/seed/seed.mjs
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../server/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env');
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const ORG_NAME = 'Brightline Software';
// Magic-link login: the inbox does not exist, so sign in through the Supabase dashboard ("Send magic link"/"Generate link").
const USERS = [
  { email: 'ana@brightline.test', name: 'Ana', role: 'manager' },
  { email: 'andrei@brightline.test', name: 'Andrei', role: 'member', manager: 'ana@brightline.test' },
  { email: 'maria@brightline.test', name: 'Maria', role: 'member', manager: 'ana@brightline.test' },
  { email: 'admin@brightline.test', name: 'Admin', role: 'admin' },
];

// F13 shows a topic only when it has at least k = 5 questions: "code review" and "meetings" are shown,
// "adjustments" (2) stays hidden. Questions are written as the anonymous route stores them: no names.
const QUESTIONS = [
  ['code review', 0, 'Is it ok to merge after one approval if the second reviewer is on holiday?'],
  ['code review', 0, "What should I do when a reviewer only writes 'why?' on my pull request?"],
  ['code review', 1, 'How long should I wait for a review before I ping someone?'],
  ['code review', 1, 'Do I have to fix every nit before I merge?'],
  ['code review', 2, 'Who should review changes to the Hermes worker?'],
  ['meetings', 0, 'Can I skip sprint planning and read the notes instead?'],
  ['meetings', 0, 'Standups are too fast for me to follow. Is there another way to give my update?'],
  ['meetings', 1, 'Is it ok to keep my camera off in refinement?'],
  ['meetings', 2, 'Where are the decisions from planning written down?'],
  ['meetings', 2, 'Can retros be recorded or captioned?'],
  ['adjustments', 1, 'Who sees my request if I ask for a workplace adjustment?'],
  ['adjustments', 2, 'How long does it take to get an answer to an adjustment request?'],
];

const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

async function getOrg() {
  const found = must(await db.from('organizations').select('id').eq('name', ORG_NAME).maybeSingle(), 'find org');
  if (found) return found.id;
  return must(await db.from('organizations').insert({ name: ORG_NAME }).select('id').single(), 'create org').id;
}

async function getUserIds() {
  const { users } = must(await db.auth.admin.listUsers({ perPage: 1000 }), 'list users');
  const ids = {};
  for (const u of USERS) {
    const existing = users.find((x) => x.email === u.email);
    ids[u.email] = existing
      ? existing.id
      : must(await db.auth.admin.createUser({ email: u.email, email_confirm: true }), `create ${u.email}`).user.id;
    console.log(`${existing ? 'kept   ' : 'created'} ${u.email}`);
  }
  return ids;
}

function mondayWeeksAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7 * n);
  return d.toISOString().slice(0, 10);
}

const orgId = await getOrg();
const ids = await getUserIds();

must(
  await db.from('organization_members').upsert(
    USERS.map((u) => ({
      org_id: orgId,
      user_id: ids[u.email],
      display_name: u.name,
      role: u.role,
      manager_id: u.manager ? ids[u.manager] : null,
    })),
    { onConflict: 'org_id,user_id' },
  ),
  'upsert members',
);
console.log(`members: ${USERS.map((u) => u.name).join(', ')}`);

must(await db.from('anonymous_questions').delete().eq('org_id', orgId).eq('is_seed', true), 'delete old seed questions');
must(
  await db.from('anonymous_questions').insert(
    QUESTIONS.map(([topic, weeksAgo, question]) => ({
      org_id: orgId,
      question_redacted: question,
      topic,
      week: mondayWeeksAgo(weeksAgo),
      // Nobody can claim seed questions: the token is thrown away.
      claim_token_hash: createHash('sha256').update(randomBytes(32)).digest('hex'),
      is_seed: true,
    })),
  ),
  'insert seed questions',
);
console.log(`anonymous_questions: ${QUESTIONS.length} seed questions`);
