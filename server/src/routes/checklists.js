// Owner: Track C. Checklists from F2 show up in Today (Track B UI). Owner-only rows.
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { notImplemented } from '../middleware/errors.js';

const r = Router();
r.get('/', (req, res) => {
  if (env.mock) return res.json(mock('checklists'));
  throw notImplemented('list checklists');
});
r.post('/', (req, res) => {
  if (env.mock) return res.json({ checklist: { id: crypto.randomUUID(), ...req.body } });
  throw notImplemented('create checklist');
});
r.patch('/:id/items/:itemId', (req, res) => {
  if (env.mock) return res.json({ ok: true });
  throw notImplemented('toggle item');
});
export default r;
