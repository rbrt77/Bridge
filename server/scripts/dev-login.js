// Owner: Track B. Local testing only: prints a one-time sign-in link without sending an email,
// so Supabase's built-in email rate limit (a few emails per hour) never blocks testing.
// Usage: npm run login -- [email]   (default: the seeded member andrei@brightline.test)
// Needs SUPABASE_SECRET_KEY, which already gives full admin access, so this adds no new power.
import { env } from '../src/env.js';
import { supabaseAdmin as db } from '../src/utils/supabase.js';

if (process.env.NODE_ENV === 'production') throw new Error('dev-login is for local testing only');
if (!db) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env');

const email = process.argv[2] ?? 'andrei@brightline.test';
const redirectTo = `${env.clientOrigin}/today`;

const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } });
if (error) throw error;

const { data: member } = await db.from('organization_members').select('display_name, role').eq('user_id', data.user.id).maybeSingle();
console.log(`\nSign-in link for ${email}${member ? ` (${member.display_name}, ${member.role})` : ' (NOT in any organization: real API calls will be refused)'}:`);
console.log(`\n${data.properties.action_link}\n`);
console.log('Open it in the browser where you test. It works once and expires in about an hour.\n');
