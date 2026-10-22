// Owner: Track A (A8). Cohere Rerank → fallback gpt-5-nano → fallback RRF order.
// Every candidate that comes back has rerank_score in [0,1] or null (RRF fallback), plus rerank_by.
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import { generateJson } from './llm.js';

const COHERE_MODEL = 'rerank-v3.5';
const COHERE_TIMEOUT_MS = 4000;
const LLM_SNIPPET_CHARS = 700;

const docText = (c) => [c.title, c.section_path, c.context, c.content].filter(Boolean).join('\n');

async function cohereRerank(query, candidates, topN) {
  const res = await fetch('https://api.cohere.com/v2/rerank', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.cohereKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: COHERE_MODEL, query, documents: candidates.map(docText), top_n: topN }),
    signal: AbortSignal.timeout(COHERE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Cohere ${res.status}`);
  const { results } = await res.json();
  return results.map((r) => ({ ...candidates[r.index], rerank_score: r.relevance_score, rerank_by: 'cohere' }));
}

const LLM_SCHEMA = {
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
  const list = candidates.map((c, i) => `[${i}] ${docText(c).slice(0, LLM_SNIPPET_CHARS)}`).join('\n\n');
  const { scores } = await generateJson({
    model: env.backgroundModel,
    name: 'rerank',
    schema: LLM_SCHEMA,
    system:
      'You rank passages by how directly they answer the question. Score every passage 0-10: ' +
      '10 = answers it fully, 5 = related but incomplete, 0 = unrelated. Return one score per index.',
    input: `Question: ${query}\n\nPassages:\n${list}`,
  });
  const byIndex = new Map(scores.map((s) => [s.i, s.score]));
  return candidates
    .map((c, i) => ({ ...c, rerank_score: (byIndex.get(i) ?? 0) / 10, rerank_by: 'llm' }))
    .sort((a, b) => b.rerank_score - a.rerank_score)
    .slice(0, topN);
}

/** @param {'auto'|'cohere'|'llm'|'none'} using  'auto' tries Cohere, then the LLM, then RRF order. */
export async function rerank(query, candidates, topN = 6, { using = 'auto' } = {}) {
  if (!candidates.length) return [];
  const rrf = () => candidates.slice(0, topN).map((c) => ({ ...c, rerank_score: null, rerank_by: 'rrf' }));
  if (using === 'none') return rrf();
  if ((using === 'auto' || using === 'cohere') && env.cohereKey) {
    try {
      return await cohereRerank(query, candidates, topN);
    } catch (err) {
      logger.warn('cohere rerank failed, falling back to LLM:', err.message);
    }
  }
  if (using !== 'cohere') {
    try {
      return await llmRerank(query, candidates, topN);
    } catch (err) {
      logger.warn('LLM rerank failed, falling back to RRF order:', err.message);
    }
  }
  return rrf();
}
