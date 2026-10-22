// Owner: Track A. Used by the early deploy test (PLAN §11, 15:30): checks CORS + SSE + cold start.
import { Router } from 'express';
import { openSse } from '../utils/sse.js';

const r = Router();
r.get('/', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
r.get('/sse', (req, res) => {
  const sse = openSse(res);
  let i = 0;
  const t = setInterval(() => {
    sse.send('token', { text: `tick ${++i} ` });
    if (i === 5) { clearInterval(t); sse.send('done', {}); sse.end(); }
  }, 300);
  res.on('close', () => clearInterval(t));
});
export default r;
