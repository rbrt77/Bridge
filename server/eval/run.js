// Owner: Track A (A15). Compares vector-only vs hybrid vs +context vs +rerank vs both. Table goes into the pitch.
// Usage: npm run eval -w server [-- <org_id>]   (default: the first organization)
//
// Fair comparison needs two indexes of the same corpus, so the run builds two temporary orgs and deletes them:
//   plain   = chunks without context, embedded without it (how ingest worked before Contextual Retrieval)
//   context = chunks with context (copied from the source org; generated if missing), embedded with it
// Team FAQs are left out: they are test data written during the hackathon, not part of the corpus.
// Metrics (doc level, as golden.json _how_to_match says): hit@1, hit@5, MRR on the top 6 for in-corpus questions;
// abstain_acc on out-of-corpus ones; false_abstain = in-corpus questions that would have got no answer.
import { readFileSync, writeFileSync } from 'node:fs';
import { supabaseAdmin as db } from '../src/utils/supabase.js';
import { retrieve } from '../src/services/retrieval.js';
import { contextualizeChunks } from '../src/services/contextualize.js';
import { embed } from '../src/services/embeddings.js';
import { embeddingText } from '../src/services/ingest.js';

const golden = JSON.parse(readFileSync(new URL('./golden.json', import.meta.url), 'utf8')).questions;
const EVAL_PREFIX = '[eval] ';
const PARALLEL = 3; // more parallel rerank calls start hitting the 4 s rerank timeout (→ RRF fallback)

const configs = [
  { name: 'vector', index: 'plain', mode: 'vector', rerankWith: 'none' },
  { name: 'hybrid', index: 'plain', mode: 'hybrid', rerankWith: 'none' },
  { name: 'hybrid+context', index: 'context', mode: 'hybrid', rerankWith: 'none' },
  { name: 'hybrid+rerank', index: 'plain', mode: 'hybrid', rerankWith: 'llm' },
  { name: 'hybrid+rerank+context', index: 'context', mode: 'hybrid', rerankWith: 'llm' },
];

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

async function deleteEvalOrgs() {
  const orgs = must(await db.from('organizations').select('id').like('name', `${EVAL_PREFIX}%`));
  if (orgs.length) must(await db.from('organizations').delete().in('id', orgs.map((o) => o.id))); // everything cascades
}

async function loadCorpus(orgId) {
  const docs = must(await db.from('kb_documents').select('id, title, source_id, url, doc_type').eq('org_id', orgId).neq('doc_type', 'faq'));
  const chunks = must(await db
    .from('documents')
    .select('document_id, content, context, section_path, page, chunk_index, doc_type')
    .in('document_id', docs.map((d) => d.id))
    .order('chunk_index'));
  const glossary = must(await db.from('glossary_terms').select('term, definition').eq('org_id', orgId));
  return { docs: docs.map((d) => ({ ...d, chunks: chunks.filter((c) => c.document_id === d.id) })), glossary };
}

/** Copy the corpus into a new org; withContext=false drops the context from the text and the vector. */
async function buildIndex(name, { docs, glossary }, withContext) {
  const [org] = must(await db.from('organizations').insert({ name: EVAL_PREFIX + name }).select('id'));
  let generated = 0;
  for (const doc of docs) {
    let chunks = doc.chunks.map((c) => ({ ...c, context: withContext ? c.context : null }));
    if (withContext && chunks.length > 1 && chunks.some((c) => !c.context)) {
      chunks = await contextualizeChunks(chunks.map((c) => c.content).join('\n\n'), chunks, { title: doc.title });
      generated += chunks.length;
    }
    const vectors = await embed(chunks.map((c) => embeddingText(doc.title, c)));
    const [kb] = must(await db
      .from('kb_documents')
      .insert({ org_id: org.id, title: doc.title, source_id: doc.source_id, url: doc.url, doc_type: doc.doc_type })
      .select('id'));
    must(await db.from('documents').insert(chunks.map((c, i) => ({
      document_id: kb.id,
      org_id: org.id,
      content: c.content,
      context: c.context || null,
      section_path: c.section_path,
      page: c.page,
      chunk_index: c.chunk_index,
      doc_type: c.doc_type,
      embedding: vectors[i],
    }))));
  }
  if (glossary.length) must(await db.from('glossary_terms').insert(glossary.map((g) => ({ ...g, org_id: org.id }))));
  if (generated) console.log(`  ${name}: generated context for ${generated} chunks (run scripts/contextualize-backfill.js to store it)`);
  return org.id;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);

async function runConfig(cfg, orgId) {
  const rows = await mapLimit(golden, PARALLEL, async (q) => {
    const t0 = Date.now();
    const res = await retrieve({ question: q.question, orgId, mode: cfg.mode, rerankWith: cfg.rerankWith, neighbours: false });
    const ms = Date.now() - t0;
    const titles = res.candidates.map((c) => c.title);
    const rank = q.in_corpus ? titles.findIndex((t) => t.toLowerCase().includes(q.expected_doc.toLowerCase())) + 1 : 0;
    return { q, abstain: res.abstain, rank, ms, top: titles[0] ?? '-', score: res.candidates[0]?.rerank_score ?? null };
  });
  const inC = rows.filter((r) => r.q.in_corpus);
  const outC = rows.filter((r) => !r.q.in_corpus);
  return {
    config: cfg.name,
    'hit@1': pct(inC.filter((r) => r.rank === 1).length, inC.length),
    'hit@5': pct(inC.filter((r) => r.rank >= 1 && r.rank <= 5).length, inC.length),
    MRR: +(inC.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / inC.length).toFixed(3),
    abstain_acc: pct(outC.filter((r) => r.abstain).length, outC.length),
    false_abstain: pct(inC.filter((r) => r.abstain).length, inC.length),
    p50_ms: median(rows.map((r) => r.ms)),
    // Top rerank score per question: ABSTAIN_THRESHOLD should sit between the two lists.
    scores: cfg.rerankWith === 'none' ? null : {
      in_corpus: inC.map((r) => r.score).sort((a, b) => a - b),
      out_of_corpus: outC.map((r) => `${r.q.id}=${r.score}`),
    },
    misses: [
      ...inC.filter((r) => r.rank !== 1).map((r) => `${r.q.id} rank ${r.rank || '>6'} (top: ${r.top})`),
      ...inC.filter((r) => r.abstain).map((r) => `${r.q.id} abstained`),
      ...outC.filter((r) => !r.abstain).map((r) => `${r.q.id} answered (top: ${r.top})`),
    ],
  };
}

const sourceOrg = process.argv[2] ?? must(await db.from('organizations').select('id').not('name', 'like', `${EVAL_PREFIX}%`).order('created_at').limit(1))[0]?.id;
if (!sourceOrg) throw new Error('No organization to evaluate');
process.on('SIGINT', async () => {
  await deleteEvalOrgs();
  process.exit(130);
});

await deleteEvalOrgs(); // leftovers from an interrupted run
const results = [];
try {
  const corpus = await loadCorpus(sourceOrg);
  const chunkCount = corpus.docs.reduce((s, d) => s + d.chunks.length, 0);
  console.log(`Golden: ${golden.filter((q) => q.in_corpus).length} in-corpus + ${golden.filter((q) => !q.in_corpus).length} out-of-corpus. Corpus: ${corpus.docs.length} docs, ${chunkCount} chunks.`);
  console.log('Building plain and context indexes…');
  const index = {
    plain: await buildIndex('plain', corpus, false),
    context: await buildIndex('context', corpus, true),
  };
  for (const cfg of configs) {
    console.log(`Running ${cfg.name}…`);
    results.push(await runConfig(cfg, index[cfg.index]));
  }
} finally {
  await deleteEvalOrgs();
}

console.table(results.map(({ misses, scores, ...r }) => r));
for (const r of results) {
  if (r.misses.length) console.log(`\n${r.config} misses:\n  ${r.misses.join('\n  ')}`);
  if (r.scores) console.log(`  top rerank score · in-corpus: ${r.scores.in_corpus.join(' ')} · out-of-corpus: ${r.scores.out_of_corpus.join(' ')}`);
}
writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + '\n');
console.log('\nSaved eval/results.json');
