// Owner: Track A (E1). PLAN §7 Retrieval: rewrite → hybrid_search → rerank → abstain? → neighbours → [S#] labels.
import { env } from '../env.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { generateJson } from './llm.js';
import { embedOne } from './embeddings.js';
import { rerank } from './rerank.js';

// Calibrate with eval/run.js. Rerank scores are in [0,1]; similarity is cosine (RRF-only fallback).
export const ABSTAIN_THRESHOLD = 0.25;
export const ABSTAIN_SIMILARITY = 0.3;
const TOP_N = 6;
const CANDIDATES = 30;
const CONTEXT_CHAR_BUDGET = 48_000; // ~12k tokens

const REWRITE_SCHEMA = {
  type: 'object',
  properties: { query: { type: 'string' } },
  required: ['query'],
  additionalProperties: false,
};

// Docs are in English; a Romanian (or other) question matches them far worse (cosine ~0.3 vs ~0.6).
const NON_ENGLISH = /[ăâîșțşţ]|\b(ce|cand|când|cum|unde|cine|este|sunt|pentru|trebuie|și|si|despre|care|cât|cat)\b/i;

/**
 * Follow-ups ("and who approves it?") become standalone questions; non-English questions are
 * translated for search only (the answer stays in the user's language). Otherwise no LLM call.
 */
export async function rewriteQuery(question, history = []) {
  const recent = history.slice(-4);
  if (!recent.length && !NON_ENGLISH.test(question)) return question;
  const { query } = await generateJson({
    model: env.rerankModel, // fast non-reasoning model: this sits before the first token
    name: 'rewrite',
    schema: REWRITE_SCHEMA,
    system: 'Rewrite the last user question as one standalone search query in English. Resolve pronouns from the conversation. Keep company names and code names as they are. Do not answer it.',
    input: `${recent.map((m) => `${m.role}: ${String(m.content).slice(0, 500)}`).join('\n')}\nuser: ${question}`,
  });
  return query || question;
}

// Glossary is small and changes only on ingest; cache per org for a minute.
const glossaryCache = new Map();
async function glossaryFor(orgId) {
  const hit = glossaryCache.get(orgId);
  if (hit && hit.at > Date.now() - 60_000) return hit.terms;
  const { data } = await db.from('glossary_terms').select('term, definition').eq('org_id', orgId);
  glossaryCache.set(orgId, { terms: data ?? [], at: Date.now() });
  return data ?? [];
}

/** "Who owns Hermes?" → "Who owns Hermes? (Hermes: the invoicing queue)" so FTS and vectors see both words. */
export async function expandAcronyms(query, orgId) {
  const terms = await glossaryFor(orgId);
  const used = terms.filter(({ term }) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(query));
  if (!used.length) return query;
  return `${query} (${used.map((t) => `${t.term}: ${t.definition.split(/[.;]/)[0]}`).join('; ')})`;
}

async function search({ query, orgId, docTypes, mode }) {
  const { data, error } = await db.rpc('hybrid_search', {
    query_text: query,
    query_embedding: await embedOne(query),
    p_org_id: orgId,
    p_doc_types: docTypes?.length ? docTypes : null,
    match_count: CANDIDATES,
    mode,
  });
  if (error) throw error;
  return data;
}

/** Glue chunk_index ± 1 around each hit so answers don't lose the sentence before/after a split. */
async function withNeighbours(chunks) {
  const wanted = chunks.flatMap((c) => [c.chunk_index - 1, c.chunk_index + 1].map((i) => `${c.document_id}:${i}`));
  const docIds = [...new Set(chunks.map((c) => c.document_id))];
  const { data } = await db.from('documents').select('document_id, chunk_index, content').in('document_id', docIds);
  const byKey = new Map((data ?? []).map((n) => [`${n.document_id}:${n.chunk_index}`, n.content]));
  const used = new Set(chunks.map((c) => `${c.document_id}:${c.chunk_index}`));
  return chunks.map((c) => {
    const pick = (i) => {
      const key = `${c.document_id}:${i}`;
      if (!wanted.includes(key) || used.has(key) || !byKey.has(key)) return '';
      used.add(key);
      return byKey.get(key);
    };
    return { ...c, text: [pick(c.chunk_index - 1), c.content, pick(c.chunk_index + 1)].filter(Boolean).join('\n…\n') };
  });
}

export const toSource = (c, id) => ({
  id,
  title: c.title,
  section_path: c.section_path ?? null,
  page: c.page ?? null,
  url: c.url ?? null,
  doc_type: c.doc_type,
  approved_by: c.approved_by ?? null,
});

// No rerank and no vector score (pure FTS mode) → only "no hits at all" counts as weak.
const isWeak = (top) => {
  if (!top) return true;
  if (top.rerank_score != null) return top.rerank_score < ABSTAIN_THRESHOLD;
  if (top.similarity != null) return top.similarity < ABSTAIN_SIMILARITY;
  return false;
};

/**
 * @param {object} o
 * @param {'hybrid'|'vector'|'fts'} [o.mode]       search mode (eval compares them)
 * @param {'llm'|'none'} [o.rerankWith]
 * @param {boolean} [o.neighbours]               attach chunk_index ± 1 (off for eval)
 * @returns {Promise<{abstain:boolean, query:string, chunks:object[], sources:object[], candidates:object[]}>}
 */
export async function retrieve({ question, history = [], orgId, docTypes, mode = 'hybrid', rerankWith = 'llm', neighbours = true }) {
  const standalone = await rewriteQuery(question, history);
  const query = await expandAcronyms(standalone, orgId);
  const candidates = await search({ query, orgId, docTypes, mode });
  const ranked = await rerank(standalone, candidates, TOP_N, { using: rerankWith });

  if (isWeak(ranked[0])) return { abstain: true, query, chunks: [], sources: [], candidates: ranked };

  // Drop clearly irrelevant tail hits so the model is not tempted to cite them.
  const kept = ranked.filter((c, i) => i === 0 || c.rerank_score == null || c.rerank_score >= ABSTAIN_THRESHOLD / 2);
  let chunks = neighbours ? await withNeighbours(kept) : kept.map((c) => ({ ...c, text: c.content }));

  let budget = CONTEXT_CHAR_BUDGET;
  chunks = chunks.filter((c) => (budget -= c.text.length) >= 0 || c === chunks[0]);
  chunks = chunks.map((c, i) => ({ ...c, label: `S${i + 1}` }));
  return { abstain: false, query, chunks, sources: chunks.map((c) => toSource(c, c.label)), candidates: ranked };
}
