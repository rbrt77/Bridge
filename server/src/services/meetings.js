// Owner: Track C (F3). Output shape = server/src/mocks/meeting.json. Transcript never leaves memory.
import { notImplemented } from '../middleware/errors.js';

export async function processMeeting({ audio, me, user }) {
  // TODO(C): elevenlabs.transcribe(audio) (diarize, word timestamps) → map speakers → generateJson(prompts/meeting.js)
  // → insert meeting_notes (tasks, decisions, summary — NO transcript)
  throw notImplemented('processMeeting');
}
export async function catchUp(lastMinutesText) {
  throw notImplemented('catchUp');
}
