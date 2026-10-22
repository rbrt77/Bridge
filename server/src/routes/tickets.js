// Owner: Track C (F2 Ticket Decoder).
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { decodeTicket } from '../services/tickets.js';

const r = Router();
r.post('/decode', async (req, res) => {
  if (env.mock) return res.json(mock('ticket'));
  res.json(await decodeTicket({ ...req.body, orgId: req.user.orgId }));
});
export default r;
