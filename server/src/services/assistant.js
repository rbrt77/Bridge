// Owner: Track C. "Talk to Bridge": what the person said → { say, action }. Nothing runs here: the browser runs the action,
// and asks for a spoken yes first for anything that sends or records (enforced in the client, whatever the model says).
import { env } from '../env.js';
import { generateJson } from './llm.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { SYSTEM, SCHEMA, buildContext } from '../prompts/assistant.js';

const MAX_TEXT = 1000;
const MAX_TURNS = 12;
const ROLE_PAGES = { '/insights': ['manager', 'admin'], '/company': ['admin'] };

const badRequest = (msg) => Object.assign(new Error(msg), { status: 400, code: 'bad_request', expose: true });
const clip = (s) => String(s ?? '').trim().slice(0, MAX_TEXT);

async function managerName(user) {
  if (!user.managerId) return null;
  const { data, error } = await db.from('organization_members').select('display_name').eq('user_id', user.managerId).maybeSingle();
  if (error && error.code !== '22P02') throw error;
  return data?.display_name ?? null;
}

/**
 * @param {object} p
 * @param {string} p.text      what the person just said (or typed)
 * @param {{role:'user'|'assistant', text:string}[]} [p.history]  earlier turns, oldest first
 * @param {{path:string, title?:string, live?:boolean}} [p.page]
 * @param {object} [p.settings]     current Work style values (flat: textSize, pace, audio…), so "smaller" has a starting point
 * @param {object|null} [p.pending]  the action waiting for yes/no, when the person answers something else
 * @param {object} p.user      req.user
 * @param {string|null} [p.manager]  skip the lookup (mock)
 */
export async function reply({ text, history = [], page, settings, pending = null, user, manager }) {
  const said = clip(text);
  if (!said) throw badRequest('Say something first');
  const helper = manager !== undefined ? manager : await managerName(user);

  const turns = (Array.isArray(history) ? history : [])
    .filter((t) => (t?.role === 'user' || t?.role === 'assistant') && t.text)
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, content: clip(t.text) }));
  const input = [
    ...turns,
    { role: 'developer', content: buildContext({ user, manager: helper, page, settings, pending }) },
    { role: 'user', content: said },
  ];
  const out = await generateJson({ system: SYSTEM, input, schema: SCHEMA, name: 'assistant_turn', timeoutMs: 20_000 });
  return checked(out, { user, manager: helper });
}

/** Keep the model inside what this person may do; turn impossible actions into a spoken explanation. */
export function checked({ say, action }, { user, manager }) {
  const a = { ...action };
  const no = (msg) => ({ say: msg, action: { type: 'none' } });
  // "Would you like me to open Support?" waits for the answer: it must not open the page already.
  if (a.type === 'navigate' && say.trim().endsWith('?')) return { say: say.trim(), action: { type: 'none' } };
  if (a.type === 'navigate' && (!a.path || (ROLE_PAGES[a.path] && !ROLE_PAGES[a.path].includes(user.role)))) {
    return no('That page is not available for your account.');
  }
  if (a.type === 'message_manager') {
    if (!manager) return no('You have no manager set yet. An admin can add one. You can ask the team anonymously instead.');
    if (!a.draft?.trim()) return no('What would you like to ask your manager?');
    a.recipient = manager;
  }
  if ((a.type === 'ask' || a.type === 'ask_anonymously') && !a.question?.trim()) return no('What is your question?');
  if (a.type === 'meeting_notes' && !a.which) a.which = 'missed';
  if (a.type === 'explain_ticket' || a.type === 'explain_review') {
    // No number: read the open ones out, so the person hears the numbers instead of being asked for one.
    if (!a.number) return { say: 'Here are the open ones.', action: { type: 'list_tickets' } };
    a.url = `https://github.com/${env.demoRepo}/${a.type === 'explain_ticket' ? 'issues' : 'pull'}/${a.number}`;
  }
  if (a.type === 'change_settings' && !Object.values(a.settings ?? {}).some((v) => v != null)) return no('Which setting would you like to change?');
  if (a.type === 'define_term' && !a.term?.trim()) return no('Which word?');
  if (a.type === 'reply_message' && !a.draft?.trim()) return no('What would you like to reply?');
  return { say: say.trim(), action: a };
}
