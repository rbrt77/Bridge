// Owner: Track C (F10, SHOULD). One step per screen; paste error → known-issues search.
import { Router } from 'express';
import { env } from '../env.js';
import { notImplemented } from '../middleware/errors.js';

const r = Router();
r.post('/step', (req, res) => {
  if (env.mock) return res.json({ step: { index: 0, total: 12, title: 'Install dependencies', command: 'npm install', expect: 'added 312 packages', if_fails: 'See known issue #3: delete node_modules and retry.' }, fix: null });
  throw notImplemented('setup step'); // TODO(C): parse docs/setup.md into steps; error_text → retrieval(doc_type known-issues)
});
export default r;
