// Owner: Track C (F4 Code Review Helper).
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { explainReview } from '../services/reviews.js';

const r = Router();
r.post('/explain', async (req, res) => {
  if (env.mock) return res.json(mock('review'));
  res.json(await explainReview(req.body));
});
export default r;
