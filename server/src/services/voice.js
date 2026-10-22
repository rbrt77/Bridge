// Owner: Track C. Server-side fallbacks: gpt-4o-mini-tts (slow pace via instructions), gpt-4o-mini-transcribe.
import { notImplemented } from '../middleware/errors.js';
export async function tts({ text, pace }) {
  throw notImplemented('tts');
}
export async function stt(file) {
  throw notImplemented('stt');
}
