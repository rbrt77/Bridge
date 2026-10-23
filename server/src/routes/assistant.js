// Owner: Track C. "Talk to Bridge": POST /api/assistant { text, history?, page?, settings?, pending? } → { say, action }.
import { Router } from 'express';
import { env } from '../env.js';
import { reply, checked } from '../services/assistant.js';

const r = Router();
r.post('/', async (req, res) => {
  if (env.mock) return res.json(checked(mockTurn(req.body?.text ?? ''), { user: req.user, manager: 'Ana' }));
  res.json(await reply({ ...req.body, user: req.user }));
});

const FIELDS = { path: null, question: null, draft: null, person: null, item: null, done: null, term: null, number: null, step: null, which: null, parts: null, source: null, get_tasks: null, settings: null };

/** Without keys: a few keyword rules, enough to click through every action. */
function mockTurn(text) {
  const t = text.toLowerCase();
  const act = (type, fields = {}) => ({ type, ...FIELDS, ...fields });
  const num = Number(/\d+/.exec(t)?.[0]) || null;
  const rules = [
    [/\bclose\b|\bbye\b|that's all/, () => ({ say: 'Closing. Press Alt+V to open me again.', action: act('close') })],
    [/smaller|bigger|calm|slower|contrast/, () => ({
      say: 'Changing your settings.',
      action: act('change_settings', { settings: { textSize: /bigger/.test(t) ? 'bigger' : /smaller/.test(t) ? 'smaller' : null, motion: /calm/.test(t) ? 'reduced' : null, spacing: /calm/.test(t) ? 'wide' : null, pace: /slower/.test(t) ? 'slow' : null, contrast: /contrast/.test(t) ? 'high' : null } }),
    })],
    [/reply/, () => ({ say: 'Here is the reply.', action: act('reply_message', { draft: 'Thanks, I will add the migration label.' }) })],
    [/manager|ana\b/, () => ({ say: 'Here is the message.', action: act('message_manager', { question: 'Who approves DB migrations?', draft: 'Hi Ana, who approves database migrations for invoicing-service?' }) })],
    [/which tickets|tickets are there|\blist\b|see the tickets|work on/, () => ({ say: 'Here are the open tickets.', action: act('list_tickets') })],
    [/ticket|issue/, () => ({ say: 'Reading the ticket. This takes a moment.', action: act('explain_ticket', { number: num }) })],
    [/\bpr\b|pull request|review/, () => ({ say: 'Reading the review. This takes a moment.', action: act('explain_review', { number: num }) })],
    [/setup/, () => ({ say: 'Here is the setup step.', action: act('setup_step', { step: /next/.test(t) ? 'next' : 'current', question: /error/.test(t) ? text : null }) })],
    [/standup/, () => ({ say: 'Writing your standup. This takes a moment.', action: act('standup') })],
    [/done|tick|mark/, () => ({ say: 'Marking it done.', action: act('tick_step', { done: true }) })],
    [/glossary|some words|examples|all terms/, () => ({ say: '', action: act('list_terms', { which: /all/.test(t) ? 'all' : null }) })],
    [/read (this|the) page|read it/, () => ({ say: '', action: act('read_page') })],
    [/mean|what is/, () => ({ say: '', action: act('define_term', { term: /(?:mean|what is)\s+(\w+)|(\w+)\s+mean/.exec(t)?.slice(1).find(Boolean) ?? 'Hermes' }) })],
    [/message|repl(y|ies)|answer/, () => ({ say: 'Here are your messages.', action: act('read_messages') })],
    [/where am i|this page/, () => ({ say: '', action: act('describe_page') })],
    [/today|tasks|next/, () => ({ say: 'Here is your day.', action: act('read_today') })],
    [/start captions|start the meeting/, () => ({ say: '', action: act('start_captions', { source: /tab|teams|meet|zoom/.test(t) ? 'tab' : 'room' }) })],
    [/decision|who said|meeting summary|the meeting/, () => ({ say: '', action: act('read_meeting', { parts: ['summary', 'decisions', 'tasks', 'speakers'].filter((k) => t.includes(k === 'speakers' ? 'who said' : k.replace(/s$/, ''))) }) })],
    [/miss|summary so far/, () => ({ say: 'Here is what you missed.', action: act('meeting_notes', { which: /summary/.test(t) ? 'summary' : 'missed' }) })],
    [/meeting|caption/, () => ({ say: 'Opening Meetings.', action: act('navigate', { path: '/meetings' }) })],
    [/\?|how|what|who|where/, () => ({ say: 'Let me look in the team docs.', action: act('ask', { question: text }) })],
  ];
  const hit = rules.find(([re]) => re.test(t));
  return hit ? hit[1]() : { say: 'I can open a page, read your day, answer a question from the team docs, change your settings, or write to your manager. What would you like?', action: act('none') };
}
export default r;
