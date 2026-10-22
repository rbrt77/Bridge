// Owner: Track C. Checklists from F2 (and F3 tasks) shown in Today. Owner-only: every query filters on user_id.
import { supabaseAdmin as db } from '../utils/supabase.js';

const SELECT = 'id, title, source_url, created_at, items:checklist_items(id, text, minutes, due, done, position)';
const notFound = () => Object.assign(new Error('Checklist not found'), { status: 404, code: 'not_found', expose: true });
const badRequest = (msg) => Object.assign(new Error(msg), { status: 400, code: 'bad_request', expose: true });

const shape = (c) => ({ ...c, items: [...(c.items ?? [])].sort((a, b) => a.position - b.position).map(({ position, ...it }) => it) });

export async function listChecklists(userId) {
  const { data, error } = await db.from('checklists').select(SELECT).eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(shape);
}

export async function getChecklist(userId, id) {
  const { data, error } = await db.from('checklists').select(SELECT).eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  return shape(data);
}

export async function createChecklist(userId, { title, source_url = null, items }) {
  if (!title?.trim()) throw badRequest('title is required');
  if (!Array.isArray(items) || !items.length || items.some((it) => !it?.text?.trim())) throw badRequest('items must be a non-empty list of { text, minutes? }');

  const { data: cl, error } = await db.from('checklists').insert({ user_id: userId, title: title.trim(), source_url }).select('id').single();
  if (error) throw error;
  const rows = items.map((it, position) => ({
    checklist_id: cl.id,
    text: it.text.trim(),
    minutes: Number.isInteger(it.minutes) ? it.minutes : null,
    due: it.due ?? null,
    position,
  }));
  const { error: itemsError } = await db.from('checklist_items').insert(rows);
  if (itemsError) {
    await db.from('checklists').delete().eq('id', cl.id);
    throw itemsError;
  }
  return getChecklist(userId, cl.id);
}

export async function setItemDone(userId, id, itemId, done) {
  if (typeof done !== 'boolean') throw badRequest('done must be true or false');
  await getChecklist(userId, id); // ownership check
  const { data, error } = await db.from('checklist_items').update({ done }).eq('id', itemId).eq('checklist_id', id).select('id');
  if (error) throw error;
  if (!data.length) throw notFound();
}

export async function deleteChecklist(userId, id) {
  const { data, error } = await db.from('checklists').delete().eq('user_id', userId).eq('id', id).select('id');
  if (error) throw error;
  if (!data.length) throw notFound();
}
