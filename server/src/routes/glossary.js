// Owner: Track A (F6). Terms are extracted at ingest time (services/glossary.js).
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { notImplemented } from '../middleware/errors.js';

const r = Router();
r.get('/', (req, res) => {
  if (env.mock) return res.json(mock('glossary'));
  throw notImplemented('glossary');
});
r.get('/:term', (req, res) => {
  if (env.mock) {
    const t = mock('glossary').terms.find((x) => x.term.toLowerCase() === req.params.term.toLowerCase());
    return t ? res.json(t) : res.status(404).json({ error: { code: 'not_found', message: 'Unknown term' } });
  }
  throw notImplemented('glossary term');
});
export default r;
