// Owner: Track C (F12, SHOULD).
import { Router } from 'express';
import { env } from '../env.js';
import { draftStandup, formatForSlack } from '../services/standup.js';
import { postToSlack } from '../integrations/slack.js';

const r = Router();
r.post('/draft', async (req, res) => {
  if (env.mock) return res.json({ yesterday: 'Read ticket #142, set up local env.', today: 'Implement CSV export (steps 1–3).', blockers: 'Waiting for date-format answer from Ana.' });
  res.json(await draftStandup({ ...req.body, user: req.user }));
});
// Body: { text } as written by the user, or { yesterday, today, blockers } to format here.
r.post('/post-slack', async (req, res) => {
  if (env.mock) return res.json({ ok: true });
  const { text, yesterday, today, blockers } = req.body;
  const message = text?.trim() || (yesterday && today && blockers ? formatForSlack({ yesterday, today, blockers }, req.user.name) : '');
  if (!message) return res.status(400).json({ error: { code: 'bad_request', message: 'Send text, or yesterday, today and blockers' } });
  if (!(await postToSlack(message))) return res.status(503).json({ error: { code: 'slack_not_configured', message: 'Slack is not connected yet. Copy the update and post it by hand.' } });
  res.json({ ok: true });
});
export default r;
