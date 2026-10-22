// Owner: Track A. Cohere Rerank 4 Fast; fallback gpt-5-nano; fallback RRF order. Test fallback BEFORE M1.
export async function rerank(query, candidates, topN = 6) {
  // TODO(A): POST https://api.cohere.com/v2/rerank ; on 429/error → llmRerank ; on error → candidates.slice(0, topN)
  return candidates.slice(0, topN);
}
