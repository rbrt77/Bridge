// Owner: Track B (F1). Profile is owner-only; NO diagnosis field ever.
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { parseFreeText } from '../services/profile.js';
import { notImplemented } from '../middleware/errors.js';

const r = Router();
r.post('/parse', async (req, res) => {
  if (env.mock) return res.json(mock('profile'));
  res.json({ prefs: await parseFreeText(req.body.text) }); // free text is never stored
});
r.get('/', (req, res) => {
  if (env.mock) return res.json(mock('profile'));
  throw notImplemented('GET /profile'); // TODO(B): select prefs from user_profiles where user_id = req.user.id
});
r.put('/', (req, res) => {
  if (env.mock) return res.json({ ok: true });
  throw notImplemented('PUT /profile'); // TODO(B): upsert user_profiles
});
r.delete('/', (req, res) => {
  if (env.mock) return res.json({ ok: true });
  throw notImplemented('DELETE /profile'); // TODO(B): delete row
});
export default r;
