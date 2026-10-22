// Owner: Track A (ingest) + Track A/D (F9 audit) + F13 insights. Admin/manager only.
import { Router } from 'express';
import multer from 'multer';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { requireRole } from '../middleware/auth.js';
import { ingestFiles, ingestRepo } from '../services/ingest.js';
import { runAudit } from '../services/audit.js';
import { getInsights } from '../services/insights.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const r = Router();
const admin = env.mock ? (req, res, next) => next() : requireRole('admin', 'manager');

r.post('/ingest', admin, upload.array('files'), async (req, res) => {
  if (env.mock) return res.json({ documents: [{ id: 'doc-1', title: 'Engineering Handbook', chunks: 42 }] });
  res.json(await ingestFiles(req.files, req.user));
});
r.post('/ingest-repo', admin, async (req, res) => {
  if (env.mock) return res.json({ synced: 18, glossary_terms: 17, topic_owners: 4 });
  res.json(await ingestRepo(req.body.repo ?? env.demoRepo, req.user));
});
r.post('/audit', admin, async (req, res) => {
  if (env.mock) return res.json(mock('audit'));
  res.json(await runAudit(req.body.repo ?? env.demoRepo, req.user));
});
r.get('/insights', admin, async (req, res) => {
  if (env.mock) return res.json(mock('insights'));
  res.json(await getInsights(req.user));
});
export default r;
