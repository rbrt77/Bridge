// Owner: Track A (F11, SHOULD, first in SHOULD order). Uses doc_type='code_map' in the hybrid index.
import { Router } from 'express';
import { env } from '../env.js';
import { notImplemented } from '../middleware/errors.js';

const r = Router();
r.post('/', (req, res) => {
  if (env.mock) return res.json({ path: 'services/billing/notify.ts', symbol: 'sendInvoiceEmail', flow: 'invoice.cron.ts picks due invoices, pushes them to Hermes, notify.ts emails the customer.', adr: 'ADR-007', sources: [] });
  throw notImplemented('code-where');
});
export default r;
