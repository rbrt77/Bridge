// Owner: Track A (F5 backend). RLS: only requester + helper see a thread. Nothing is sent automatically.
// The server uses the service role, so every route checks participation itself.
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { requireRole } from '../middleware/auth.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { saveDocument } from '../services/ingest.js';
import { chunkMarkdown } from '../services/chunker.js';

const MAX_TEXT = 4000;
const fail = (status, code, message) => Object.assign(new Error(message), { status, code, expose: true });

function text(value, field) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) throw fail(400, 'bad_request', `${field} is required`);
  if (s.length > MAX_TEXT) throw fail(400, 'bad_request', `${field} is too long (max ${MAX_TEXT} characters)`);
  return s;
}

/** user_id → display name, for everyone in the org (small table, one query). */
async function namesFor(orgId) {
  const { data, error } = await db.from('organization_members').select('user_id, display_name').eq('org_id', orgId);
  if (error) throw error;
  return new Map(data.map((m) => [m.user_id, m.display_name]));
}

const toThread = (t, names) => ({
  id: t.id,
  question: t.question,
  ticket_url: t.ticket_url,
  requester: names.get(t.requester_id) ?? 'Unknown',
  requester_id: t.requester_id,
  helper: { id: t.helper_id, name: names.get(t.helper_id) ?? 'Unknown' },
  status: t.status,
  created_at: t.created_at,
});

const toMessage = (m, names) => ({
  id: m.id,
  thread_id: m.thread_id,
  author: names.get(m.author_id) ?? 'Unknown',
  author_id: m.author_id,
  body: m.body,
  created_at: m.created_at,
});

/** Thread the current user takes part in, or 404 (no hint whether it exists). */
async function participantThread(id, user) {
  const { data, error } = await db.from('help_threads').select('*').eq('id', id).eq('org_id', user.orgId).maybeSingle();
  if (error && error.code !== '22P02') throw error; // 22P02: not a uuid
  if (!data || ![data.requester_id, data.helper_id].includes(user.id)) throw fail(404, 'not_found', 'Thread not found');
  return data;
}

const r = Router();

r.post('/threads', async (req, res) => {
  if (env.mock) return res.json({ thread: mock('help').threads[0] });
  const question = text(req.body?.question, 'question');
  const draft = text(req.body?.draft ?? question, 'draft');
  const helperId = req.user.managerId;
  if (!helperId) throw fail(400, 'no_manager', 'You have no manager set; ask an admin to add one');

  const { data: thread, error } = await db
    .from('help_threads')
    .insert({ org_id: req.user.orgId, requester_id: req.user.id, helper_id: helperId, question, ticket_url: req.body?.ticket_url || null })
    .select()
    .single();
  if (error) throw error;
  const { error: msgError } = await db.from('help_messages').insert({ thread_id: thread.id, author_id: req.user.id, body: draft });
  if (msgError) {
    await db.from('help_threads').delete().eq('id', thread.id);
    throw msgError;
  }

  res.json({ thread: toThread(thread, await namesFor(req.user.orgId)) });
});

r.get('/threads', async (req, res) => {
  if (env.mock) return res.json({ threads: mock('help').threads });
  const { data, error } = await db
    .from('help_threads')
    .select('*')
    .eq('org_id', req.user.orgId)
    .or(`requester_id.eq.${req.user.id},helper_id.eq.${req.user.id}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const names = await namesFor(req.user.orgId);
  res.json({ threads: data.map((t) => toThread(t, names)) });
});

r.get('/threads/:id/messages', async (req, res) => {
  if (env.mock) return res.json({ messages: mock('help').messages });
  const thread = await participantThread(req.params.id, req.user);
  const { data, error } = await db.from('help_messages').select('*').eq('thread_id', thread.id).order('created_at');
  if (error) throw error;
  const names = await namesFor(req.user.orgId);
  res.json({ messages: data.map((m) => toMessage(m, names)) });
});

r.post('/threads/:id/messages', async (req, res) => {
  if (env.mock) return res.json({ message: { id: crypto.randomUUID(), thread_id: req.params.id, author: req.user.name, body: req.body.body, created_at: new Date().toISOString() } });
  const thread = await participantThread(req.params.id, req.user);
  const body = text(req.body?.body, 'body');
  const { data, error } = await db.from('help_messages').insert({ thread_id: thread.id, author_id: req.user.id, body }).select().single();
  if (error) throw error;
  if (req.user.id === thread.helper_id && thread.status === 'open') {
    await db.from('help_threads').update({ status: 'answered' }).eq('id', thread.id);
  }
  res.json({ message: toMessage(data, await namesFor(req.user.orgId)) });
});

// The manager's answer becomes a "Team FAQ" document: searchable by RAG and cited with approved_by.
r.post('/threads/:id/publish-faq', requireRole('manager', 'admin'), async (req, res) => {
  if (env.mock) return res.json({ faq_id: 'mock-faq-1' });
  const thread = await participantThread(req.params.id, req.user);
  if (req.user.id !== thread.helper_id && req.user.role !== 'admin') throw fail(403, 'forbidden', 'Only the helper on this thread can publish its answer');
  const question = text(req.body?.question ?? thread.question, 'question');
  const answer = text(req.body?.answer, 'answer');

  const markdown = `# ${question}\n\n${answer}`;
  const doc = await saveDocument({
    orgId: req.user.orgId,
    title: `Team FAQ: ${question}`,
    sourceId: `faq:${thread.id}`,
    docType: 'faq',
    approvedBy: req.user.id,
    text: markdown,
    chunks: chunkMarkdown(markdown),
  });
  await db.from('help_threads').update({ status: 'answered' }).eq('id', thread.id);
  res.json({ faq_id: doc.id });
});

export default r;
