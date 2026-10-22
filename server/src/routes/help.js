// Owner: Track A (F5 backend). RLS: only requester + helper see a thread. Nothing is sent automatically.
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { requireRole } from '../middleware/auth.js';
import { notImplemented } from '../middleware/errors.js';

const r = Router();
r.post('/threads', (req, res) => {
  if (env.mock) return res.json({ thread: mock('help').threads[0] });
  throw notImplemented('create thread'); // TODO(A): insert help_threads (helper = req.user.managerId) + first help_message; Slack ping WITHOUT question text
});
r.get('/threads', (req, res) => {
  if (env.mock) return res.json({ threads: mock('help').threads });
  throw notImplemented('list threads');
});
r.get('/threads/:id/messages', (req, res) => {
  if (env.mock) return res.json({ messages: mock('help').messages });
  throw notImplemented('list messages');
});
r.post('/threads/:id/messages', (req, res) => {
  if (env.mock) return res.json({ message: { id: crypto.randomUUID(), thread_id: req.params.id, author: req.user.name, body: req.body.body, created_at: new Date().toISOString() } });
  throw notImplemented('send message');
});
r.post('/threads/:id/publish-faq', requireRole('manager', 'admin'), (req, res) => {
  if (env.mock) return res.json({ faq_id: 'mock-faq-1' });
  throw notImplemented('publish faq'); // TODO(A): kb_documents(doc_type='faq', approved_by) → chunk + embed → searchable
});
export default r;
