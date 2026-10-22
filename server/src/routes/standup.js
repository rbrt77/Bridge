// Owner: Track C (F12, SHOULD).
import { Router } from 'express';
import { env } from '../env.js';
import { draftStandup } from '../services/standup.js';
import { postToSlack } from '../integrations/slack.js';

const r = Router();
r.post('/draft', async (req, res) => {
  if (env.mock) return res.json({ yesterday: 'Read ticket #142, set up local env.', today: 'Implement CSV export (steps 1–3).', blockers: 'Waiting for date-format answer from Ana.' });
  res.json(await draftStandup({ ...req.body, user: req.user }));
});
r.post('/post-slack', async (req, res) => {
  if (env.mock) return res.json({ ok: true });
  await postToSlack(req.body.text);
  res.json({ ok: true });
});
export default r;
