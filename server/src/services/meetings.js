// Owner: Track C (F3). Output shape = server/src/mocks/meeting.json. Transcript never leaves memory.
import { generateJson } from './llm.js';
import { transcribe } from '../integrations/elevenlabs.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { SYSTEM, SCHEMA, LIVE_SYSTEM, LIVE_SCHEMA, SPEAKERS_SYSTEM, SPEAKERS_SCHEMA, CATCH_UP_SYSTEM, CATCH_UP_SCHEMA } from '../prompts/meeting.js';

const MAX_LIVE_CHARS = 60_000; // about an hour of captions; the latest part wins

const badRequest = (msg) => Object.assign(new Error(msg), { status: 400, code: 'bad_request', expose: true });
const dateOf = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d ?? '') ? d : new Date().toISOString().slice(0, 10));
const DAY_MS = 86_400_000;
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const weekday = (ms, style = 'long') => new Date(ms).toLocaleDateString('en-GB', { weekday: style, timeZone: 'UTC' });
// The model copies "by Thursday" from a calendar instead of counting days (it got that wrong).
const dateLine = (date) => {
  const t = Date.parse(`${date}T12:00:00Z`);
  const days = Array.from({ length: 14 }, (_, i) => t + (i + 1) * DAY_MS).map((d) => `${weekday(d, 'short')} ${isoDay(d)}`);
  return `MEETING DATE: ${date} (${weekday(t)})\nCALENDAR: ${days.join(', ')}`;
};

/** Drops decisions that are really tasks; a deadline is never before the meeting (a weekday then means next week). */
function tidy(out, date) {
  const decisions = out.decisions.filter((d) => !d.is_task).map(({ is_task, ...d }) => d);
  const my_tasks = out.my_tasks.map((t) => {
    if (!t.due) return t;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.due) || Number.isNaN(Date.parse(t.due))) return { ...t, due: null };
    let due = Date.parse(`${t.due}T12:00:00Z`);
    while (isoDay(due) < date) due += 7 * DAY_MS;
    return { ...t, due: isoDay(due) };
  });
  return { ...out, decisions, my_tasks };
}

/**
 * @param {object} o
 * @param {object} o.audio      multer file (memory storage)
 * @param {string} o.me         first name of the person the tasks are for
 * @param {string} [o.consent]  'true' once the uploader confirmed everyone agreed to the recording
 * @param {string} [o.speakers] JSON [{label,name}] from a manual correction; overrides the LLM mapping
 * @param {string} [o.meeting_date] YYYY-MM-DD, used to resolve "by Thursday"; defaults to today
 * @param {string} [o.note_id]  meeting_notes row of the live meeting this recording comes from; updated instead of a new row
 */
export async function processMeeting({ audio, me, consent, speakers, meeting_date, note_id, user }) {
  if (consent !== 'true') throw badRequest('Confirm that everyone in the recording agreed to it');
  if (!audio?.buffer?.length) throw badRequest('Attach the recording as "audio"');
  if (!me?.trim()) throw badRequest('Say whose tasks to extract ("me")');
  const manualSpeakers = parseSpeakers(speakers);
  const date = dateOf(meeting_date);

  const stt = await transcribe(audio);
  const turns = toTurns(stt.words ?? []);
  const lines = toTurns(stt.words ?? [], { bySentence: true }).map((t) => `[${mmss(t.start)}] ${t.speaker}: ${t.text}`);
  if (!lines.length) throw badRequest('No speech found in the recording');
  const [people, terms] = await Promise.all([knownPeople(user?.orgId), knownTerms(user?.orgId)]);
  const knownSpeakers = manualSpeakers ?? (await mapSpeakers(turns, people));

  const raw = await generateJson({
    system: SYSTEM,
    schema: SCHEMA,
    name: 'meeting_result',
    input: [
      `ME: ${me.trim()}`,
      dateLine(date),
      `KNOWN PEOPLE: ${people.join(', ') || '(none)'}`,
      `KNOWN SPEAKERS: ${knownSpeakers.map((s) => `${s.label} = ${s.name}`).join(', ')}`,
      `KNOWN TERMS: ${terms.join(', ') || '(none)'}`,
      `TRANSCRIPT:\n${lines.join('\n')}`,
    ].join('\n\n'),
  });
  const out = tidy(raw, date);
  out.speakers = knownSpeakers;
  const names = new Map(out.speakers.map((s) => [s.label, s.name]));
  for (const t of out.my_tasks) t.who = names.get(t.who) ?? t.who;
  const { speakers: mapped, ...rest } = out;
  const result = { ...rest, speakers: mapped }; // same key order as mocks/meeting.json

  const saved = await saveNotes(user?.id, date, result, note_id);
  return { ...result, my_tasks: saved.my_tasks, note_id: saved.id };
}

/** Live meeting: captions so far → summary, my tasks, decisions, terms. Saved to one meeting_notes row per meeting; the captions are not stored. */
export async function liveNotes({ text, me, meeting_date, note_id, user }) {
  if (!text?.trim()) throw badRequest('Send the captions so far as "text"');
  if (!me?.trim()) throw badRequest('Say whose tasks to extract ("me")');
  const date = dateOf(meeting_date);
  const [people, terms] = await Promise.all([knownPeople(user?.orgId), knownTerms(user?.orgId)]);
  const raw = await generateJson({
    system: LIVE_SYSTEM,
    schema: LIVE_SCHEMA,
    name: 'meeting_live',
    input: [
      `ME: ${me.trim()}`,
      dateLine(date),
      `KNOWN PEOPLE: ${people.join(', ') || '(none)'}`,
      `KNOWN TERMS: ${terms.join(', ') || '(none)'}`,
      `CAPTIONS:\n${text.slice(-MAX_LIVE_CHARS)}`,
    ].join('\n\n'),
  });
  const out = tidy(raw, date);
  const saved = await saveNotes(user?.id, date, out, note_id);
  return { ...out, my_tasks: saved.my_tasks, note_id: saved.id };
}

export async function catchUp(lastMinutesText) {
  if (!lastMinutesText?.trim()) throw badRequest('Send last_minutes_text');
  return generateJson({ system: CATCH_UP_SYSTEM, schema: CATCH_UP_SCHEMA, name: 'catch_up', input: lastMinutesText.slice(-8000) });
}

/** Scribe words → speaker turns { speaker, start, text }; bySentence also splits a turn at . ? ! so each line has its own time. */
function toTurns(words, { bySentence = false } = {}) {
  const turns = [];
  for (const w of words) {
    if (w.type === 'audio_event') continue;
    const last = turns.at(-1);
    const sentenceEnded = bySentence && /[.?!]["”]?$/.test(last?.text.trimEnd() ?? '');
    if (last && last.speaker === w.speaker_id && !(sentenceEnded && w.type === 'word')) last.text += w.text;
    else if (w.type === 'word') turns.push({ speaker: w.speaker_id ?? 'speaker_0', start: w.start ?? 0, text: w.text });
  }
  return turns.map((t) => ({ ...t, text: t.text.trim() }));
}

// Discourse words that look like "Name," at the start of a sentence.
const NOT_NAMES = new Set('Okay Ok Yes No Agreed Great Good Thanks Sure Then So Next Well Right Also And But Now Last First Please Sorry Hi Hello Morning Everyone'.split(' '));

/**
 * Votes first: a turn that ends by addressing someone ("Radu, the retries." / "Ioana?") is answered by that person.
 * Labels without votes (e.g. the facilitator) come from a small LLM call on turn openings/endings.
 */
async function mapSpeakers(turns, people) {
  const votes = new Map();
  turns.forEach((t, i) => {
    const next = turns[i + 1];
    if (!next || next.speaker === t.speaker) return;
    const tail = t.text.split(/(?<=[.?!])\s+/).slice(-2).join(' ');
    for (const [, name] of tail.matchAll(/(?:^|[.?!]\s+)([A-Z][a-z]+)(?=,|\?)/g)) {
      if (NOT_NAMES.has(name)) continue;
      const fixed = people.find((p) => p.toLowerCase().startsWith(name.toLowerCase().slice(0, 4))) ?? name;
      const v = votes.get(next.speaker) ?? new Map();
      votes.set(next.speaker, v.set(fixed, (v.get(fixed) ?? 0) + 1));
    }
  });
  const fromVotes = new Map([...votes].map(([label, v]) => [label, [...v].sort((a, b) => b[1] - a[1])[0][0]]));
  const llm = await askSpeakers(turns, people);
  const labels = [...new Set(turns.map((t) => t.speaker))];
  return labels.map((label) => ({ label, name: fromVotes.get(label) ?? llm.find((s) => s.label === label)?.name ?? 'Unknown' }));
}

async function askSpeakers(turns, people) {
  const clip = (text) => {
    const w = text.split(/\s+/);
    return w.length <= 30 ? text : `${w.slice(0, 12).join(' ')} … ${w.slice(-15).join(' ')}`;
  };
  const { speakers } = await generateJson({
    system: SPEAKERS_SYSTEM,
    schema: SPEAKERS_SCHEMA,
    name: 'meeting_speakers',
    input: `KNOWN PEOPLE: ${people.join(', ') || '(none)'}\nLABELS: ${[...new Set(turns.map((t) => t.speaker))].join(', ')}\n\nTURNS:\n${turns.map((t, i) => `${i + 1}. ${t.speaker}: ${clip(t.text)}`).join('\n')}`,
  });
  return speakers;
}

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function parseSpeakers(raw) {
  if (!raw) return null;
  try {
    const list = JSON.parse(raw);
    if (Array.isArray(list) && list.every((s) => typeof s?.label === 'string' && typeof s?.name === 'string')) return list;
  } catch {}
  throw badRequest('speakers must be JSON [{ "label", "name" }]');
}

async function knownPeople(orgId) {
  if (!db || !orgId) return [];
  const { data } = await db.from('organization_members').select('display_name').eq('org_id', orgId).limit(100);
  return data?.map((m) => m.display_name).filter(Boolean) ?? [];
}

async function knownTerms(orgId) {
  if (!db || !orgId) return [];
  const { data } = await db.from('glossary_terms').select('term').eq('org_id', orgId).limit(200);
  return data?.map((t) => t.term) ?? [];
}

const taskKeys = (t) => [t.task, t.quote].filter(Boolean).map((x) => x.toLowerCase().replace(/\W+/g, ' ').trim());

// Only the extracted result is stored; the transcript stays in this request.
// With noteId (a live meeting) the same row is updated, and tasks already ticked in Today stay ticked.
// Returns { id, my_tasks } with those ticks, so the page shows them too.
async function saveNotes(userId, date, out, noteId) {
  if (!db || !userId) return { id: null, my_tasks: out.my_tasks };
  const row = { title: `Meeting ${date}`, summary: out.summary, my_tasks: out.my_tasks, decisions: out.decisions };
  const { data: old } = noteId ? await db.from('meeting_notes').select('my_tasks').eq('id', noteId).eq('user_id', userId).maybeSingle() : { data: null };
  if (old) {
    const done = new Set((old.my_tasks ?? []).filter((t) => t.done).flatMap(taskKeys));
    row.my_tasks = out.my_tasks.map((t) => (taskKeys(t).some((k) => done.has(k)) ? { ...t, done: true } : t));
    const { error } = await db.from('meeting_notes').update(row).eq('id', noteId).eq('user_id', userId);
    if (error) console.warn('meeting_notes update failed', error.message);
    return { id: noteId, my_tasks: row.my_tasks };
  }
  const { data, error } = await db.from('meeting_notes').insert({ user_id: userId, ...row }).select('id').single();
  if (error) console.warn('meeting_notes insert failed', error.message);
  return { id: data?.id ?? null, my_tasks: row.my_tasks };
}
