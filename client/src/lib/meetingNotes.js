// Owner: Track C (F3). Ticks on meeting tasks live in meeting_notes.my_tasks (owner-only RLS, no transcript in that table).
// The server keeps them when a live meeting or "Run again" updates the same row.
import { supabase } from './supabaseClient.js';

export const withDone = (tasks, index, done) => tasks.map((t, i) => (i === index ? { ...t, done } : t));

export async function saveTicks(noteId, myTasks) {
  if (!supabase || !noteId) return; // MOCK, or nothing saved yet: ticks stay on this page
  const { error } = await supabase.from('meeting_notes').update({ my_tasks: myTasks }).eq('id', noteId);
  if (error) throw error;
}

export const decisionsText = (decisions) => decisions.map((d) => `${d.text}${d.affects_me ? ' This affects you.' : ''}`).join('\n');
