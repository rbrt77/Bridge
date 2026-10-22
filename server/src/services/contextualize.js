// Owner: Track A. Contextual Retrieval: 1–2 sentences of context per chunk (gpt-5-nano, doc as cached prefix).
export async function contextualizeChunks(documentText, chunks) {
  // TODO(A): for each chunk → generate context; return chunks.map(c => ({ ...c, context }))
  return chunks.map((c) => ({ ...c, context: '' }));
}
