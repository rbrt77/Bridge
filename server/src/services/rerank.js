// Owner: Track A (A8). LLM rerank (env.rerankModel, default gpt-4.1-mini) → fallback RRF order on error/timeout.
// Every candidate that comes back has rerank_score in [0,1] or null (RRF fallback), plus rerank_by.
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import { generateJson } from './llm.js';

const RERANK_POOL = 15;        // RRF already puts the answer in the top 15; fewer passages = faster
const SNIPPET_CHARS = 500;
const TIMEOUT_MS = 4000;       // past this, RRF order is better than a slow answer

const docText = (c) => [c.title, c.section_path, c.context, c.content].filter(Boolean).join('\n');

const SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: { i: { type: 'integer' }, score: { type: 'integer', minimum: 0, maximum: 10 } },
        required: ['i', 'score'],
        additionalProperties: false,
      },
    },
  },
  required: ['scores'],
  additionalProperties: false,
};

async function llmRerank(query, candidates, topN) {
  const pool = candidates.slice(0, RERANK_POOL);
  const list = pool.map((c, i) => `[${i}] ${docText(c).slice(0, SNIPPET_CHARS)}`).join('\n\n');
  const { scores } = await generateJson({
    model: env.rerankModel,
    name: 'rerank',
    schema: SCHEMA,
    timeoutMs: TIMEOUT_MS,
    system:
      `You rank passages by how directly they answer the question. Score EVERY passage (indexes 0..${pool.length - 1}) 0-10: ` +
      '10 = answers it fully, 5 = related but incomplete, 0 = unrelated. Return one score per index.',
    input: `Question: ${query}\n\nPassages:\n${list}`,
  });
  // A half-empty answer would score everything 0 and trigger a false abstain; RRF order is safer.
  if (scores.length < pool.length / 2) throw new Error(`rerank returned ${scores.length}/${pool.length} scores`);
  const byIndex = new Map(scores.map((s) => [s.i, s.score]));
  return pool
    .map((c, i) => ({ ...c, rerank_score: (byIndex.get(i) ?? 0) / 10, rerank_by: 'llm' }))
    .sort((a, b) => b.rerank_score - a.rerank_score)
    .slice(0, topN);
}

/** @param {'llm'|'none'} using  'none' keeps RRF order (eval baseline). */
export async function rerank(query, candidates, topN = 6, { using = 'llm' } = {}) {
  if (!candidates.length) return [];
  const rrf = () => candidates.slice(0, topN).map((c) => ({ ...c, rerank_score: null, rerank_by: 'rrf' }));
  if (using === 'none') return rrf();
  try {
    return await llmRerank(query, candidates, topN);
  } catch (err) {
    logger.warn('LLM rerank failed, falling back to RRF order:', err.message);
    return rrf();
  }
}
