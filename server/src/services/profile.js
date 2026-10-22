// Owner: Track B (F1). Free text → Prefs JSON. Medical words ignored; text never stored.
import { notImplemented } from '../middleware/errors.js';

export async function parseFreeText(text) {
  // TODO(B): generateJson({ system: prompts/profile.js, input: text, schema: PREFS_SCHEMA })
  throw notImplemented('parseFreeText');
}
