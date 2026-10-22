// Owner: Track D (F10, SHOULD). One step per screen; paste error → known-issues match → fix with source.
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { getStep, findFix } from '../services/setup.js';

const r = Router();
r.post('/step', async (req, res) => {
  if (env.mock) {
    const m = mock('setup');
    return res.json({ step: m.step, fix: req.body?.error_text ? m.fix : null });
  }
  const [step, fix] = await Promise.all([getStep(req.body?.step_index ?? 0), findFix(req.body?.error_text, req.user)]);
  res.json({ step, fix });
});
export default r;
