// Owner: Track C (F3). Output shape = server/src/mocks/meeting.json. Transcript never leaves memory.
import { generateJson } from './llm.js';
import { transcribe } from '../integrations/elevenlabs.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { SYSTEM, SCHEMA, SPEAKERS_SYSTEM, SPEAKERS_SCHEMA, CATCH_UP_SYSTEM, CATCH_UP_SCHEMA } from '../prompts/meeting.js';

const badRequest = (msg) => Object.assign(new Error(msg), { status: 400, code: 'bad_request', expose: true });

/**
 * @param {object} o
 * @param {object} o.audio      multer file (memory storage)
 * @param {string} o.me         first name of the person the tasks are for
 * @param {string} [o.consent]  'true' once the uploader confirmed everyone agreed to the recording
 * @param {string} [o.speakers] JSON [{label,name}] from a manual correction; overrides the LLM mapping
 * @param {string} [o.meeting_date] YYYY-MM-DD, used to resolve "by Thursday"; defaults to today
 */
export async function processMeeting({ audio, me, consent, speakers, meeting_date, user }) {
  if (consent !== 'true') throw badRequest('Confirm that everyone in the recording agreed to it');
  if (!audio?.buffer?.length) throw badRequest('Attach the recording as "audio"');
  if (!me?.trim()) throw badRequest('Say whose tasks to extract ("me")');
  const manualSpeakers = parseSpeakers(speakers);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(meeting_date ?? '') ? meeting_date : new Date().toISOString().slice(0, 10);

  const stt = await transcribe(audio);
  const turns = toTurns(stt.words ?? []);
  const lines = turns.map((t) => `[${mmss(t.start)}] ${t.speaker}: ${t.text}`);
  if (!lines.length) throw badRequest('No speech found in the recording');
  const [people, terms] = await Promise.all([knownPeople(user?.orgId), knownTerms(user?.orgId)]);
  const knownSpeakers = manualSpeakers ?? (await mapSpeakers(turns, people));

  const out = await generateJson({
    system: SYSTEM,
    schema: SCHEMA,
    name: 'meeting_result',
    input: [
      `ME: ${me.trim()}`,
      `MEETING DATE: ${date} (${new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })})`,
      `KNOWN PEOPLE: ${people.join(', ') || '(none)'}`,
      `KNOWN SPEAKERS: ${knownSpeakers.map((s) => `${s.label} = ${s.name}`).join(', ')}`,
      `KNOWN TERMS: ${terms.join(', ') || '(none)'}`,
      `TRANSCRIPT:\n${lines.join('\n')}`,
    ].join('\n\n'),
  });
  out.speakers = knownSpeakers;
  const names = new Map(out.speakers.map((s) => [s.label, s.name]));
  for (const t of out.my_tasks) t.who = names.get(t.who) ?? t.who;
  const { speakers: mapped, ...rest } = out;
  const result = { ...rest, speakers: mapped }; // same key order as mocks/meeting.json

  await saveNotes(user?.id, date, result);
  return result;
}

export async function catchUp(lastMinutesText) {
  if (!lastMinutesText?.trim()) throw badRequest('Send last_minutes_text');
  return generateJson({ system: CATCH_UP_SYSTEM, schema: CATCH_UP_SCHEMA, name: 'catch_up', input: lastMinutesText.slice(-8000) });
}

/** Scribe words → speaker turns { speaker, start, text }. */
function toTurns(words) {
  const turns = [];
  for (const w of words) {
    if (w.type === 'audio_event') continue;
    const last = turns.at(-1);
    if (last && last.speaker === w.speaker_id) last.text += w.text;
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

// Only the extracted result is stored; the transcript stays in this request.
async function saveNotes(userId, date, out) {
  if (!db || !userId) return;
  const { error } = await db.from('meeting_notes').insert({
    user_id: userId,
    title: `Meeting ${date}`,
    summary: out.summary,
    my_tasks: out.my_tasks,
    decisions: out.decisions,
  });
  if (error) console.warn('meeting_notes insert failed', error.message);
}
