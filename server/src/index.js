// Owner: Track A. TODO(A): port compression/rate limiter from Internal_ai index.js (compression must skip SSE).
import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { auth } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';
import health from './routes/health.js';
import profile from './routes/profile.js';
import ask from './routes/ask.js';
import help from './routes/help.js';
import anon from './routes/anon.js';
import glossary from './routes/glossary.js';
import tickets from './routes/tickets.js';
import reviews from './routes/reviews.js';
import checklists from './routes/checklists.js';
import meetings from './routes/meetings.js';
import adjustments from './routes/adjustments.js';
import convert from './routes/convert.js';
import voice from './routes/voice.js';
import company from './routes/company.js';
import standup from './routes/standup.js';
import setup from './routes/setup.js';
import codeWhere from './routes/code-where.js';
import { startDemoWarmup } from './services/warmup.js';

const app = express();
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.use('/api/health', health);
app.use('/api', auth);
app.use('/api/profile', profile);
app.use('/api/ask', ask);
app.use('/api/help', help);
app.use('/api/anon', anon);
app.use('/api/glossary', glossary);
app.use('/api/tickets', tickets);
app.use('/api/reviews', reviews);
app.use('/api/checklists', checklists);
app.use('/api/meetings', meetings);
app.use('/api/adjustments', adjustments);
app.use('/api/convert', convert);
app.use('/api/voice', voice);
app.use('/api/company', company);
app.use('/api/standup', standup);
app.use('/api/setup', setup);
app.use('/api/code-where', codeWhere);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Bridge server on :${env.port}${env.mock ? ' (MOCK mode)' : ''}`);
  if (env.warmDemo && !env.mock) startDemoWarmup();
});
