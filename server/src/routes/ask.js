// Owner: Track A (E1 + F5). Flow: rewrite → hybrid_search → rerank → abstain? handoff : stream answer + enrich.
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { openSse } from '../utils/sse.js';
import { answerQuestion } from '../services/adapt.js';

const r = Router();
r.post('/', async (req, res) => {
  const sse = openSse(res);
  try {
    if (env.mock) return await streamMock(sse, req.body.question ?? '');
    await answerQuestion({ ...req.body, user: req.user, send: sse.send });
  } catch (err) {
    sse.send('error', { code: err.code ?? 'internal', message: err.expose ? err.message : 'Something went wrong' });
  } finally {
    sse.end();
  }
});

async function streamMock(sse, question) {
  const m = mock('ask');
  sse.send('status', { message: 'Searching team docs…' });
  if (/migration/i.test(question)) { // demo: "Who approves DB migrations?" → abstain + handoff
    sse.send('handoff', m.handoff);
    return sse.send('done', { answer_id: null });
  }
  for (const word of m.answer.split(' ')) {
    sse.send('token', { text: word + ' ' });
    await new Promise((ok) => setTimeout(ok, 25));
  }
  sse.send('sources', { sources: m.sources });
  sse.send('enrich', m.enrich);
  sse.send('done', { answer_id: 'mock-answer-1' });
}
export default r;
