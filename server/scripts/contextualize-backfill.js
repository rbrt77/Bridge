// Owner: Track A (A15). Adds Contextual Retrieval context (+ re-embeds) to chunks ingested before it existed.
// Usage: node --env-file=../.env scripts/contextualize-backfill.js [org_id] [--force]   (default: every organization)
// --force regenerates context for chunks that already have one (e.g. after a prompt change).
import { supabaseAdmin as db } from '../src/utils/supabase.js';
import { contextualizeChunks } from '../src/services/contextualize.js';
import { embed } from '../src/services/embeddings.js';
import { embeddingText } from '../src/services/ingest.js';

const force = process.argv.includes('--force');
const orgArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const orgIds = orgArg ? [orgArg] : ((await db.from('organizations').select('id')).data ?? []).map((o) => o.id);

for (const orgId of orgIds) {
  const { data: docs, error } = await db.from('kb_documents').select('id, title').eq('org_id', orgId);
  if (error) throw error;
  let updated = 0;
  for (const doc of docs) {
    const { data: chunks } = await db
      .from('documents')
      .select('id, content, section_path, context')
      .eq('document_id', doc.id)
      .order('chunk_index');
    if (!chunks?.length || (!force && chunks.every((c) => c.context))) continue;

    const withContext = await contextualizeChunks(chunks.map((c) => c.content).join('\n\n'), chunks, { title: doc.title });
    if (withContext.every((c) => !c.context)) continue; // one-chunk doc or every call failed: keep the old vectors
    const vectors = await embed(withContext.map((c) => embeddingText(doc.title, c)));
    await Promise.all(withContext.map(async (c, i) => {
      const { error: e } = await db.from('documents').update({ context: c.context || null, embedding: vectors[i] }).eq('id', c.id);
      if (e) throw e;
    }));
    updated += chunks.length;
    console.log(`  ${doc.title}: ${chunks.length} chunks`);
  }
  console.log(orgId, '→', updated, 'chunks contextualized');
}
