// Owner: Track C + D (F7). Letter contains needs + proposals only, never a diagnosis.
import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { advise } from '../services/adjustments.js';

const catalog = JSON.parse(readFileSync(new URL('../../data/dev_adjustments.json', import.meta.url), 'utf8'));
const r = Router();
r.get('/needs', (req, res) => res.json({ needs: catalog.needs.map(({ id, label }) => ({ id, label })) }));
r.post('/advise', async (req, res) => {
  if (env.mock) return res.json(mock('adjustments'));
  res.json(await advise(req.body?.need_ids ?? [], catalog, req.user));
});
export default r;
