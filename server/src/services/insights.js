// Owner: Track A (F13, SHOULD). Only groups with k >= 5; zero per-person data.
import { notImplemented } from '../middleware/errors.js';
export async function getInsights(user) {
  throw notImplemented('insights'); // TODO(A): supabase.rpc('insights_themes', { min_k: 5 })
}
