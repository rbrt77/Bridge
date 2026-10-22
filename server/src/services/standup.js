// Owner: Track C (F12, SHOULD). Checklist progress (F2) + meeting tasks (F3) + voice note → Yesterday / Today / Blockers.
import { generateJson } from './llm.js';
import { listChecklists } from './checklists.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { SYSTEM, SCHEMA } from '../prompts/standup.js';

const MEETING_DAYS = 14;

export async function draftStandup({ voice_note_text, user }) {
  const [checklists, tasks] = await Promise.all([listChecklists(user.id), meetingTasks(user.id)]);
  const steps = (done) => checklists.flatMap((c) => c.items.filter((it) => it.done === done).map((it) => `${c.title}: ${it.text}`));
  const done = steps(true);
  const open = steps(false);

  return generateJson({
    system: SYSTEM,
    schema: SCHEMA,
    name: 'standup',
    input: [
      `NAME: ${user.name ?? 'me'}`,
      `TODAY: ${new Date().toISOString().slice(0, 10)}`,
      `DONE:\n${list(done)}`,
      `OPEN:\n${list(open.slice(0, 8))}`,
      `MEETING TASKS:\n${list(tasks.map((t) => `${t.task}${t.ticket ? ` (${t.ticket})` : ''}${t.due ? `, due ${t.due}` : ''}`))}`,
      `VOICE NOTE: ${voice_note_text?.trim() || '(none)'}`,
    ].join('\n\n'),
  });
}

const list = (lines) => (lines.length ? lines.map((l) => `- ${l}`).join('\n') : '(none)');

async function meetingTasks(userId) {
  if (!db) return [];
  const since = new Date(Date.now() - MEETING_DAYS * 86_400_000).toISOString();
  const { data, error } = await db.from('meeting_notes').select('my_tasks').eq('user_id', userId).gte('created_at', since).order('created_at', { ascending: false }).limit(3);
  if (error) throw error;
  return data.flatMap((n) => n.my_tasks ?? []);
}
