// Owner: Track A (E1). PLAN §7 Retrieval.
import { notImplemented } from '../middleware/errors.js';

export const ABSTAIN_THRESHOLD = 0.25; // calibrate with eval/run.js

/**
 * TODO(A):
 * 1. rewriteQuery(question, history) + acronym expansion from glossary_terms
 * 2. supabase.rpc('hybrid_search', { query_text, query_embedding, org_id, doc_types, match_count: 30 })  (FTS 40 + vector 40 → RRF k=60)
 * 3. rerank(question, candidates) → top 6
 * 4. abstain if top score < ABSTAIN_THRESHOLD
 * 5. add neighbours (chunk_index ± 1), dedupe, ~12k token budget, label [S1..S6]
 * @returns {Promise<{abstain:boolean, chunks:object[], sources:object[]}>}
 */
export async function retrieve({ question, history, orgId, docTypes }) {
  throw notImplemented('retrieval');
}
