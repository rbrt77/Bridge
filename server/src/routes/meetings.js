// Owner: Track C (F3 Meeting → My tasks). Transcript lives in memory only; never persisted.
import { Router } from 'express';
import multer from 'multer';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { processMeeting, catchUp } from '../services/meetings.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const r = Router();
r.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (env.mock) return res.json(mock('meeting'));
  const { me, consent, speakers, meeting_date } = req.body;
  res.json(await processMeeting({ audio: req.file, me, consent, speakers, meeting_date, user: req.user }));
});
r.post('/catch-up', async (req, res) => {
  if (env.mock) return res.json({ summary: 'Team agreed to ship the CSV export behind a flag. You own the date-format question.' });
  res.json(await catchUp(req.body.last_minutes_text));
});
export default r;
