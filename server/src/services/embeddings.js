// Owner: Track A. TODO(A): port batch logic (processInBatches) from Internal_ai ingest.js:44-95.
import { openai } from './llm.js';
import { env } from '../env.js';

export async function embed(texts) {
  const res = await openai().embeddings.create({ model: env.embeddingModel, input: texts });
  return res.data.map((d) => d.embedding);
}
