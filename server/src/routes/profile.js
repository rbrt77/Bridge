// Owner: Track B (F1). Profile is owner-only (req.user.id); NO diagnosis field ever.
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { parseFreeText, getProfile, saveProfile, deleteProfile } from '../services/profile.js';

const r = Router();
r.post('/parse', async (req, res) => {
  if (env.mock) return res.json(mock('profile'));
  res.json({ prefs: await parseFreeText(req.body?.text) }); // free text is never stored or logged
});
r.get('/', async (req, res) => {
  if (env.mock) return res.json({ prefs: null }); // a fresh device keeps defaults in the demo
  res.json({ prefs: await getProfile(req.user.id) });
});
r.put('/', async (req, res) => {
  if (!env.mock) await saveProfile(req.user.id, req.body?.prefs);
  res.json({ ok: true });
});
r.delete('/', async (req, res) => {
  if (!env.mock) await deleteProfile(req.user.id);
  res.json({ ok: true });
});
export default r;
