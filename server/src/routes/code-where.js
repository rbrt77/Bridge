// Owner: Track A (F11, SHOULD, first in SHOULD order). Uses doc_type='code_map' in the hybrid index
// (built by POST /api/company/ingest-repo, see services/codemap.js).
import { Router } from 'express';
import { env } from '../env.js';
import { codeWhere } from '../services/codemap.js';

const MAX_QUESTION = 500;

const r = Router();
r.post('/', async (req, res) => {
  if (env.mock) return res.json({ found: true, path: 'src/services/billing/notify.ts', symbol: 'sendInvoiceEmail', flow: 'invoice.cron.ts picks due invoices, pushes them to Hermes, notify.ts emails the customer.', adr: 'ADR-007', owners: [{ login: 'brightline-ana', name: 'Ana' }], url: null, sources: [] });
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question || question.length > MAX_QUESTION) {
    return res.status(400).json({ error: { code: 'bad_request', message: `question is required (max ${MAX_QUESTION} characters)` } });
  }
  res.json(await codeWhere({ question, user: req.user }));
});
export default r;
