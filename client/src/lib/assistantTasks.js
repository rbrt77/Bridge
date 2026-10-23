// Owner: Track C. "Talk to Bridge" helpers: each one does a job with the existing APIs and returns what to say aloud
// (plus, where it fits, what to save next or how to undo it). No React here; Assistant.jsx decides when to ask for a yes.
import { api } from './api.js';
import { readAnon, saveAnon } from './help.js';
import { supabase } from './supabaseClient.js';

export const CHECKLISTS_CHANGED = 'bridge:checklists-changed'; // Today reloads its list on this event
const SETUP_KEY = 'bridge.setup.step'; // same key as the Setup page, so both stay on the same step
const TICKET_KEY = 'bridge.ticket'; // the Tickets page shows the last decoded ticket from here
const READ_THREADS = 3; // newest conversations read out by "read my messages"
const MAX_SPOKEN = 300; // characters of one message read aloud
const FILLER = new Set(['the', 'step', 'one', 'next', 'first', 'this', 'that', 'mark', 'done', 'as']);

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const short = (text, where) => (text.length > MAX_SPOKEN ? `${text.slice(0, MAX_SPOKEN).replace(/\s+\S*$/, '')}… The rest is on the ${where} page.` : text);
const words = (s) => s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
const changed = () => window.dispatchEvent(new Event(CHECKLISTS_CHANGED));

/** Markdown → something a voice can read: no code blocks, links, citation chips or symbols. */
export const spoken = (md) =>
  md
    .replace(/```[\s\S]*?```/g, ' There is code on the screen. ')
    .replace(/\s*\[S\d+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*#`>|]/g, '')
    .replace(/(^|\s)_+|_+(?=\s|$)/g, '$1') // _emphasis_ only; DATABASE_URL keeps its underscore
    .replace(/\s+/g, ' ')
    .trim();

/** What is on the page now: its title, intro line and section headings. */
export function describePage(live) {
  const main = document.querySelector('main');
  const title = main?.querySelector('h1')?.textContent.trim() ?? 'Bridge';
  const intro = main?.querySelector('h1 + p')?.textContent.trim();
  const sections = [...(main?.querySelectorAll('h2') ?? [])].map((h) => h.textContent.trim()).filter(Boolean).slice(0, 6);
  return [
    `You are on ${title}.`,
    intro,
    sections.length && `Sections: ${sections.join(', ')}.`,
    live && 'Live captions are running.',
    'Tell me what you want to do here and I will do it.',
  ].filter(Boolean).join(' ');
}

export async function todayText() {
  const { checklists } = await api('/checklists');
  if (!checklists.length) return 'Nothing on your list yet. Say "explain ticket" and its number to get steps.';
  const steps = checklists.flatMap((c) => c.items.filter((i) => !i.done).map((i) => ({ ...i, list: c.title })));
  if (!steps.length) return `All steps in your ${plural(checklists.length, 'checklist')} are done.`;
  const [next, after] = steps;
  return `You have ${plural(steps.length, 'open step')}. Next: ${next.text}${next.minutes ? `, about ${next.minutes} minutes` : ''}, for ${next.list}.${after ? ` After that: ${after.text}.` : ''}`;
}

/** Marks the step the person named (word match), or the next one. Returns { say, undo? }. */
export async function tickStep({ item, done = true }) {
  const { checklists } = await api('/checklists');
  const all = checklists.flatMap((c) => c.items.map((i) => ({ ...i, listId: c.id })));
  const candidates = all.filter((i) => i.done !== done);
  if (!candidates.length) return { say: done ? 'All your steps are already done.' : 'No finished steps to reopen.' };
  let pick = candidates[0];
  const want = words(item ?? '').filter((w) => !FILLER.has(w));
  if (want.length) {
    const score = (i) => want.filter((w) => words(i.text).some((x) => x.startsWith(w) || w.startsWith(x))).length;
    const best = candidates.map((i) => ({ i, s: score(i) })).sort((a, b) => b.s - a.s)[0];
    if (!best.s) return { say: `I could not find that step. ${done ? 'Open' : 'Finished'} steps: ${candidates.slice(0, 3).map((i) => i.text).join('; ')}.` };
    pick = best.i;
  }
  const set = (value) => api(`/checklists/${pick.listId}/items/${pick.id}`, { method: 'PATCH', body: { done: value } }).then(changed);
  await set(done);
  const open = all.filter((i) => !i.done).length + (done ? -1 : 1);
  const left = open ? `${plural(open, 'open step')} left.` : 'No open steps left.';
  return { say: `Marked "${pick.text}" as ${done ? 'done' : 'not done'}. ${left} Say undo to take it back.`, undo: () => set(!done) };
}

export async function saveChecklist({ title, source_url, items }) {
  await api('/checklists', { method: 'POST', body: { title, source_url, items } });
  changed();
}

/** The newest conversations (last message of each) and the anonymous questions asked from this browser. */
export async function messagesText(userId) {
  const { threads } = await api('/help/threads'); // newest first
  const parts = await Promise.all(threads.slice(0, READ_THREADS).map(async (t) => {
    const { messages } = await api(`/help/threads/${t.id}/messages`);
    const last = messages.at(-1);
    const who = !last ? '' : last.author_id === userId ? 'You wrote' : `${last.author} wrote`;
    return `With ${otherPerson(t, userId)}, about "${t.question}". ${last ? `${who}: ${short(last.body, 'Messages')}` : 'No messages yet.'}`;
  }));
  const anon = await Promise.all(readAnon().map(async (q) => {
    if (q.status !== 'open') return q;
    try { return { ...q, ...(await api(`/anon/${q.token}`)) }; } catch { return q; }
  }));
  saveAnon(anon);
  for (const q of anon.slice(0, 2)) {
    parts.push(q.status === 'answered' ? `Your anonymous question "${q.question}" was answered: ${short(q.answer, 'Messages')}` : `Your anonymous question "${q.question}" has no answer yet.`);
  }
  if (!parts.length) return 'You have no messages yet. Say "ask my manager" followed by your question to start one.';
  const more = threads.length > READ_THREADS ? ` You have ${threads.length - READ_THREADS} older conversations on the Messages page.` : '';
  return `${parts.join(' ')}${more}`;
}

const otherPerson = (t, userId) => (t.helper?.id === userId ? t.requester : t.helper?.name);

/** The conversation with `person` (first name), or the newest one. */
export async function findThread(person, userId) {
  const { threads } = await api('/help/threads');
  const name = person?.toLowerCase();
  const t = (name && threads.find((x) => otherPerson(x, userId)?.toLowerCase().startsWith(name))) || threads[0];
  return t ? { id: t.id, recipient: otherPerson(t, userId) } : null;
}

export const sendReply = (threadId, body) => api(`/help/threads/${threadId}/messages`, { method: 'POST', body: { body } });

/** A few glossary terms with their meaning, or (all) every term's name. */
export async function termsText(all) {
  const { terms } = await api('/glossary');
  if (!terms.length) return 'The glossary is empty.';
  if (all) return `The glossary has ${plural(terms.length, 'term')}: ${terms.map((t) => t.term).join(', ')}. Say "what does" and a word to hear its meaning.`;
  const some = terms.slice(0, 5).map((t) => `${t.term}: ${t.definition}`).join(' ');
  const more = terms.length > 5 ? ` There are ${terms.length - 5} more. Say "all terms" to hear every name, or "what does" and a word.` : '';
  return spoken(`A few words from the team glossary. ${some}${more}`);
}

/** The text of the page as it is on screen (main content only), for anything no other action reads. `topic`: only the lines about it. */
export function pageText(topic) {
  const main = document.querySelector('main');
  const controls = new Set([...(main?.querySelectorAll('button, select, [role=button]') ?? [])].map((b) => b.innerText.trim())); // "Listen", "Search"… are not content
  const lines = (main?.innerText ?? '').split('\n').map((l) => l.trim()).filter((l) => l && !controls.has(l));
  const want = words(topic ?? '').filter((w) => w.length > 3);
  if (want.length) {
    const hits = lines.filter((l) => words(l).some((x) => want.some((w) => x.startsWith(w.slice(0, 5)))));
    if (hits.length) return spoken(hits.slice(0, 8).join('. '));
    return `This page does not mention ${topic}. Say "read this page" to hear all of it.`;
  }
  const text = spoken(lines.join('. ').replace(/\.\./g, '.'));
  if (!text) return 'This page has no text yet.';
  return text.length > 1500 ? `${text.slice(0, 1500).replace(/\s+\S*$/, '')}… That is the first part of the page. Ask me about anything specific on it.` : text;
}

export async function termText(term) {
  const { terms } = await api('/glossary');
  const q = term.toLowerCase().trim();
  const t = terms.find((x) => x.term.toLowerCase() === q) ?? terms.find((x) => x.term.toLowerCase().includes(q) || q.includes(x.term.toLowerCase()));
  return t ? `${t.term}: ${t.definition}${t.source?.title ? ` Source: ${t.source.title}.` : ''}` : null;
}

/** Open issues (good first issues first) and open PRs of the team's repository. */
export async function ticketsText() {
  const { issues, pulls } = await api('/tickets/open');
  if (!issues.length && !pulls.length) return 'There are no open tickets or pull requests right now.';
  const item = (i) => `${i.number}, ${i.title}`;
  const first = issues.filter((i) => i.labels.includes('good first issue'));
  const rest = issues.filter((i) => !first.includes(i));
  return [
    `There ${issues.length === 1 ? 'is 1 open ticket' : `are ${issues.length} open tickets`}.`,
    first.length && `Good first issues: ${first.map(item).join('; ')}.`,
    rest.length && `${first.length ? 'Others' : 'They are'}: ${rest.map(item).join('; ')}.`,
    pulls.length && `Open pull requests: ${pulls.map(item).join('; ')}.`,
    'Say "explain ticket" and a number to hear one in detail.',
  ].filter(Boolean).join(' ');
}

/** The newest meeting saved in Today (summary, decisions, my tasks; no voices), when this session has none. */
export async function latestSavedMeeting(userId) {
  if (!supabase || !userId) return null;
  const { data } = await supabase.from('meeting_notes').select('title, summary, decisions, my_tasks').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

/**
 * A processed meeting read aloud. `parts`: any of summary, decisions, tasks, speakers (empty = summary, decisions and tasks).
 * There is no transcript (Bridge never keeps one), so "who said what" = the voices plus who gave each of my tasks, with the quote.
 */
export function meetingText(d, parts) {
  const summary = d.summary?.length ? `Summary: ${d.summary.join(' ')}` : 'There is no summary for this meeting.';
  const decisions = d.decisions?.length
    ? `${plural(d.decisions.length, 'decision')}: ${d.decisions.map((x, i) => `${i + 1}, ${x.text}${x.affects_me ? ', this affects you' : ''}.`).join(' ')}`
    : 'No decisions were made.';
  const tasks = d.my_tasks?.length
    ? `${plural(d.my_tasks.length, 'task')} for you: ${d.my_tasks.map((t, i) => `${i + 1}, ${t.task}${t.who ? `, from ${t.who}` : ''}${t.due ? `, due ${t.due}` : ''}${t.done ? ', done' : ''}.`).join(' ')}`
    : 'No tasks for you.';
  const voices = d.speakers?.length ? `People in the meeting: ${d.speakers.map((s) => s.name).join(', ')}.` : '';
  const quotes = (d.my_tasks ?? []).filter((t) => t.who && t.quote).map((t) => `${t.who} said${t.minute ? ` at ${t.minute}` : ''}: "${t.quote}"`).join(' ');
  const speakers = [voices, quotes, 'Bridge does not keep the full transcript, so I can only tell you who gave you each task.'].filter(Boolean).join(' ');
  const text = { summary, decisions, tasks, speakers };
  const wanted = parts?.length ? parts : ['summary', 'decisions', 'tasks'];
  return spoken(Object.keys(text).filter((k) => wanted.includes(k)).map((k) => text[k]).join(' '));
}

/** Decodes a GitHub issue; returns { say, save } where save is the checklist to offer. Also shown on the Tickets page. */
export async function ticketText(url) {
  const d = await api('/tickets/decode', { method: 'POST', body: { issue_url: url } });
  try { sessionStorage.setItem(TICKET_KEY, JSON.stringify({ url, text: '', data: d, saved: null, ticks: {} })); } catch { /* private mode */ }
  const minutes = d.steps.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const say = [
    `${d.title}. ${d.summary}`,
    `${plural(d.steps.length, 'step')}${minutes ? `, about ${minutes} minutes in total` : ''}.`,
    d.steps[0] && `First: ${d.steps[0].text}.`,
    d.unclear?.length && `One thing is unclear: ${d.unclear[0].question}`,
  ].filter(Boolean).join(' ');
  return { say: spoken(say), save: d.steps.length ? { title: d.title, source_url: url, items: d.steps } : null };
}

/** Explains PR review comments; returns { say, save } with the required changes as a checklist. */
export async function reviewText(url) {
  const d = await api('/reviews/explain', { method: 'POST', body: { pr_url: url } });
  const required = d.files.flatMap((f) => f.comments.filter((c) => c.kind === 'required').map((c) => ({ text: `${c.what_to_change} (${f.path})`, said: c.what_to_change })));
  const s = d.summary;
  const say = `${d.pr}: ${plural(s.required, 'required change')}, ${s.optional} optional, ${plural(s.questions, 'question')}. ${required.map((c, i) => `${i + 1}: ${c.said}`).join(' ')}`;
  return { say: spoken(say), save: required.length ? { title: `Review ${d.pr}`, source_url: url, items: required.map(({ text }) => ({ text })) } : null };
}

/** One setup step (the Setup page's current step, moved by `step`), or the fix for an error. */
export async function setupText({ step, question }) {
  let index = 0;
  try { index = Number(localStorage.getItem(SETUP_KEY)) || 0; } catch { /* private mode */ }
  index = step === 'first' ? 0 : Math.max(0, index + (step === 'next' ? 1 : step === 'previous' ? -1 : 0));
  const d = await api('/setup/step', { method: 'POST', body: { step_index: index, ...(question && { error_text: question }) } });
  try { localStorage.setItem(SETUP_KEY, String(d.step.index)); } catch { /* private mode */ }
  const s = d.step;
  if (d.fix) return spoken(d.fix.found ? `${d.fix.why} Fix: ${d.fix.fix}` : `I could not find this error in the known issues. Say "ask my manager" to get help.`);
  return spoken([
    `Step ${s.index + 1} of ${s.total}: ${s.title}.`,
    s.text,
    s.command && `Run: ${s.command}.`,
    s.expect && `You should see: ${s.expect.replace(/\.$/, '')}.`,
    s.index + 1 < s.total && 'Say "next step" when it works, or tell me the error.',
  ].filter(Boolean).join(' '));
}

export async function standupDraft() {
  const d = await api('/standup/draft', { method: 'POST', body: {} });
  return { say: `Here is your standup. Yesterday: ${d.yesterday} Today: ${d.today} Blockers: ${d.blockers}`, draft: d };
}

/**
 * Flat settings from the model (textSize, pace, tldr…) → { patch, limit }. textSize "smaller"/"bigger" moves one step from now;
 * at the end of the scale it is left out and `limit` says so.
 */
const GROUP = { textSize: 'display', contrast: 'display', font: 'display', spacing: 'display', motion: 'display' };
const SIZES = ['m', 'l', 'xl'];
export function settingsPatch(settings, prefs) {
  const patch = { display: {}, output: {} };
  let limit = '';
  for (const [k, v] of Object.entries(settings ?? {})) {
    if (v == null) continue;
    if (k === 'textSize' && (v === 'smaller' || v === 'bigger')) {
      const at = SIZES.indexOf(prefs.display.textSize) + (v === 'bigger' ? 1 : -1);
      if (at < 0 || at >= SIZES.length) limit = `The text is already the ${v === 'bigger' ? 'biggest' : 'smallest'} size.`;
      else patch.display.textSize = SIZES[at];
      continue;
    }
    patch[GROUP[k] ?? 'output'][k] = v;
  }
  return { patch, limit };
}
export const flatSettings = (prefs) => ({ ...prefs.display, ...prefs.output });
