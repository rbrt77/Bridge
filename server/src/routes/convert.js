// Owner: Track A backend (F8); UI in Track B (components/Diagram.jsx).
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { textToDiagram, describeImage, simplify } from '../services/diagrams.js';

const r = Router();
r.post('/diagram', async (req, res) => {
  if (env.mock) return res.json(mock('diagram'));
  res.json(await textToDiagram(req.body));
});
r.post('/describe-image', async (req, res) => {
  if (env.mock) return res.json({ description: 'Screenshot of the Invoices table with an "Export" button in the top-right corner.' });
  res.json(await describeImage(req.body.image_url));
});
r.post('/simplify', async (req, res) => {
  if (env.mock) return res.json({ text: '1. Open the invoices page.\n2. Click Export.\n3. Choose CSV.' });
  res.json(await simplify(req.body));
});
export default r;
