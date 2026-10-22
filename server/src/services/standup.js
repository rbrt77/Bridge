// Owner: Track C (F12, SHOULD).
import { notImplemented } from '../middleware/errors.js';
export async function draftStandup({ voice_note_text, user }) {
  throw notImplemented('standup'); // TODO(C): checklist progress + meeting tasks + voice note → Yesterday/Today/Blockers (≤3 lines)
}
