// Owner: Track C (F3). Scribe v2: diarize=true, timestamps_granularity=word.
import { env } from '../env.js';

export async function transcribe(file) {
  const form = new FormData();
  form.append('model_id', 'scribe_v2');
  form.append('diarize', 'true');
  form.append('timestamps_granularity', 'word');
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': env.elevenlabsKey }, body: form });
  if (!res.ok) throw Object.assign(new Error(`ElevenLabs ${res.status}`), { status: 502, expose: true });
  return res.json();
}
