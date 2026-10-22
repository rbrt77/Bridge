// Owner: Track C (F2 Ticket Decoder).
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { decodeTicket } from '../services/tickets.js';
import { listOpen } from '../integrations/github.js';

const r = Router();
r.post('/decode', async (req, res) => {
  if (env.mock) return res.json(mock('ticket'));
  res.json(await decodeTicket({ ...req.body, orgId: req.user.orgId }));
});
// Open issues and PRs of the demo repo, for "which tickets are there" (voice assistant).
r.get('/open', async (req, res) => {
  if (env.mock) return res.json(mock('open-tickets'));
  const toItem = (i) => ({ number: i.number, title: i.title, labels: i.labels.map((l) => l.name), url: i.html_url });
  const all = await listOpen(env.demoRepo);
  res.json({ issues: all.filter((i) => !i.pull_request).map(toItem), pulls: all.filter((i) => i.pull_request).map(toItem) });
});
export default r;
