// Owner: Track C (voice everywhere). Browser speechSynthesis/Web Speech first; these are server fallbacks.
import { Router } from 'express';
import multer from 'multer';
import { env } from '../env.js';
import { tts, stt } from '../services/voice.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const r = Router();
r.post('/tts', async (req, res) => {
  if (env.mock) return res.status(204).end(); // client falls back to speechSynthesis
  const audio = await tts(req.body);
  res.type('audio/mpeg').send(audio);
});
r.post('/stt', upload.single('audio'), async (req, res) => {
  if (env.mock) return res.json({ text: 'Who approves database migrations?' });
  res.json({ text: await stt(req.file, req.body.prompt) });
});
export default r;
