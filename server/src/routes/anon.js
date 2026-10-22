// Owner: Track A (F5 anonymous). NO user_id stored, NO IP logged on this route.
import { Router } from 'express';
import { env } from '../env.js';
import { notImplemented } from '../middleware/errors.js';

const r = Router();
r.post('/', (req, res) => {
  if (env.mock) return res.json({ claim_token: crypto.randomUUID() });
  throw notImplemented('anon question'); // TODO(A): redact PII, store hash(claim_token) only, topic via gpt-5-nano
});
r.get('/:token', (req, res) => {
  if (env.mock) return res.json({ status: 'open' });
  throw notImplemented('anon status');
});
export default r;
