// Owner: Track A (F8 backend). Validate with mermaid.parse is done client-side; server retries once with the error.
import { notImplemented } from '../middleware/errors.js';

export async function textToDiagram({ text, kind }) {
  // TODO(A): gpt-5-mini → { title, summary, mermaid, outline[] } ; outline is ALWAYS present (text equivalent)
  throw notImplemented('textToDiagram');
}
export async function describeImage(imageUrl) {
  throw notImplemented('describeImage'); // TODO(A): gpt-5-mini vision
}
export async function simplify({ text, mode }) {
  throw notImplemented('simplify');
}
