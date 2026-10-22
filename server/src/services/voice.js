// Owner: Track C. Server-side fallbacks: gpt-4o-mini-tts (slow pace via instructions), gpt-4o-mini-transcribe.
import { toFile } from 'openai';
import { openai } from './llm.js';

const TTS_MODEL = 'gpt-4o-mini-tts';
const STT_MODEL = 'gpt-4o-mini-transcribe';
const MAX_TTS_CHARS = 4000;
const PACE = {
  normal: 'Speak clearly at a calm, natural pace.',
  slow: 'Speak slowly and clearly, with a short pause after each sentence and each list item. Pronounce code names and acronyms carefully.',
};

const badRequest = (msg) => Object.assign(new Error(msg), { status: 400, code: 'bad_request', expose: true });

/** @returns {Promise<Buffer>} mp3 */
export async function tts({ text, pace = 'normal' }) {
  if (!text?.trim()) throw badRequest('Send text to read out');
  const res = await openai().audio.speech.create({
    model: TTS_MODEL,
    voice: 'coral',
    input: text.trim().slice(0, MAX_TTS_CHARS),
    instructions: PACE[pace] ?? PACE.normal,
    response_format: 'mp3',
  });
  return Buffer.from(await res.arrayBuffer());
}

/** @param {object} file multer file (memory storage) */
export async function stt(file) {
  if (!file?.buffer?.length) throw badRequest('Attach the recording as "audio"');
  const res = await openai().audio.transcriptions.create({
    model: STT_MODEL,
    file: await toFile(file.buffer, file.originalname || 'speech.webm', { type: file.mimetype }),
  });
  return res.text.trim();
}
