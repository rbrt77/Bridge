// Owner: Track A (F6). Terms are extracted at ingest time (services/glossary.js).
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { listGlossary } from '../services/glossary.js';

const notFound = (res) => res.status(404).json({ error: { code: 'not_found', message: 'Unknown term' } });

const r = Router();
r.get('/', async (req, res) => {
  if (env.mock) return res.json(mock('glossary'));
  res.json({ terms: await listGlossary(req.user.orgId) });
});
r.get('/:term', async (req, res) => {
  if (env.mock) {
    const t = mock('glossary').terms.find((x) => x.term.toLowerCase() === req.params.term.toLowerCase());
    return t ? res.json(t) : notFound(res);
  }
  const [t] = await listGlossary(req.user.orgId, { term: req.params.term });
  return t ? res.json(t) : notFound(res);
});
export default r;
