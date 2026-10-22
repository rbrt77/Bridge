// Owner: Track A. Batched embeddings (OpenAI accepts many inputs per call; keep batches small enough to retry).
import { openai } from './llm.js';
import { env } from '../env.js';

const BATCH_SIZE = 96;

export async function embed(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const res = await openai().embeddings.create({ model: env.embeddingModel, input: texts.slice(i, i + BATCH_SIZE) });
    out.push(...res.data.map((d) => d.embedding));
  }
  return out;
}

export const embedOne = async (text) => (await embed([text]))[0];
