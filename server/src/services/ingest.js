// Owner: Track A (A5, A6). PLAN §7 Ingest: parse → chunk → contextualize → embed → documents.
import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';
import { chunkMarkdown } from './chunker.js';
import { contextualizeChunks } from './contextualize.js';
import { embed } from './embeddings.js';
import { extractGlossary } from './glossary.js';
import { indexCode } from './codemap.js';
import { invalidateRetrieval } from './retrieval.js';
import { listRepoDocs, getText, parseCodeowners } from '../integrations/github.js';

const INSERT_BATCH = 200;

const badRequest = (message) => Object.assign(new Error(message), { status: 400, code: 'bad_request', expose: true });

export const sanitizeText = (text) =>
  text.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

/** Filename/path → doc_type (schema check: handbook|procedure|repo_doc|adr|faq|legal|code_map). */
export function guessDocType(name, fallback = 'handbook') {
  const n = name.toLowerCase();
  if (/(^|[/_\-\s])adr[-_\s]?\d|\/adr\//.test(n)) return 'adr';
  if (/legal|gdpr|directive|law|lege/.test(n)) return 'legal';
  if (/faq/.test(n)) return 'faq';
  if (/polic|procedure|process|training|security/.test(n)) return 'procedure';
  if (/handbook/.test(n)) return 'handbook';
  return fallback;
}

/** What gets embedded for a chunk: the title, section and context make short chunks findable. */
export const embeddingText = (title, c) => [title, c.section_path, c.context, c.content].filter(Boolean).join('\n');

const titleFrom = (markdown, fallback) => /^#\s+(.+)$/m.exec(markdown)?.[1].trim() ?? fallback;
const stripExt = (name) => name.replace(/\.[^.]+$/, '');

/** Uploaded file → { title, chunks } with chunk_index unique across pages. */
async function parseFile(file) {
  const name = file.originalname;
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(file.buffer));
    const { text: pages } = await extractText(pdf, { mergePages: false });
    const chunks = pages.flatMap((p, i) => chunkMarkdown(sanitizeText(p ?? ''), { page: i + 1 }));
    return { title: stripExt(name), text: pages.join('\n\n'), chunks };
  }
  let markdown;
  if (ext === 'docx') markdown = (await mammoth.convertToMarkdown({ buffer: file.buffer })).value;
  else if (['md', 'markdown', 'txt'].includes(ext)) markdown = file.buffer.toString('utf8');
  else throw badRequest(`Unsupported file type: .${ext} (use PDF, DOCX or Markdown)`);
  markdown = sanitizeText(markdown);
  return { title: titleFrom(markdown, stripExt(name)), text: markdown, chunks: chunkMarkdown(markdown) };
}

/**
 * Store one document and its chunks. Inserts the new version first and deletes the old one
 * (same org + source_id) only after everything succeeded, so search never sees an empty doc.
 */
export async function saveDocument({ orgId, title, sourceId, url = null, docType, text, chunks, approvedBy = null, glossary = true }) {
  if (!chunks.length) throw badRequest(`"${title}" contains no readable text`);
  const ordered = chunks.map((c, i) => ({ ...c, chunk_index: i }));
  const withContext = await contextualizeChunks(text, ordered, { title });
  const vectors = await embed(withContext.map((c) => embeddingText(title, c)));

  const { data: kb, error } = await db
    .from('kb_documents')
    .insert({ org_id: orgId, title, source_id: sourceId, url, doc_type: docType, approved_by: approvedBy })
    .select('id')
    .single();
  if (error) throw error;

  try {
    const rows = withContext.map((c, i) => ({
      document_id: kb.id,
      org_id: orgId,
      content: c.content,
      context: c.context || null,
      section_path: c.section_path || null,
      page: c.page ?? null,
      chunk_index: c.chunk_index,
      doc_type: docType,
      embedding: vectors[i],
    }));
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const { error: e } = await db.from('documents').insert(rows.slice(i, i + INSERT_BATCH));
      if (e) throw e;
    }
  } catch (err) {
    await db.from('kb_documents').delete().eq('id', kb.id); // chunks cascade
    throw err;
  }

  if (sourceId) await db.from('kb_documents').delete().eq('org_id', orgId).eq('source_id', sourceId).neq('id', kb.id);

  let glossaryTerms = 0;
  if (glossary) {
    try {
      glossaryTerms = (await extractGlossary(text, { orgId, documentId: kb.id, title })).length;
    } catch (err) {
      logger.warn('glossary extraction failed for', title, err.message);
    }
  }
  invalidateRetrieval(orgId); // cached answers may now miss this document (or cite its old version)
  return { id: kb.id, title, chunks: ordered.length, glossaryTerms };
}

export async function ingestFiles(files = [], user, { docType } = {}) {
  if (!files.length) throw badRequest('No files uploaded (field name: files)');
  const documents = [];
  for (const file of files) {
    const { title, text, chunks } = await parseFile(file);
    const doc = await saveDocument({
      orgId: user.orgId,
      title,
      sourceId: `upload:${file.originalname}`,
      docType: docType ?? guessDocType(file.originalname),
      text,
      chunks,
    });
    documents.push({ id: doc.id, title: doc.title, chunks: doc.chunks });
  }
  return { documents };
}

export async function ingestRepo(repo, user) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) throw badRequest('repo must look like "owner/name"');
  const { branch, docs, code, codeownersPath } = await listRepoDocs(repo);
  const sourcePrefix = `github:${repo}:`;

  let synced = 0;
  let glossaryTerms = 0;
  for (const { path } of docs) {
    const markdown = sanitizeText(await getText(repo, path));
    const chunks = chunkMarkdown(markdown);
    if (!chunks.length) continue;
    const doc = await saveDocument({
      orgId: user.orgId,
      title: path.includes('/') ? `${path.split('/').pop()} (${path})` : path,
      sourceId: sourcePrefix + path,
      url: `https://github.com/${repo}/blob/${branch}/${path}`,
      docType: guessDocType(path, 'repo_doc'),
      text: markdown,
      chunks,
    });
    synced++;
    glossaryTerms += doc.glossaryTerms;
  }

  // Files deleted from the repo disappear from search too.
  const keep = new Set(docs.map((d) => sourcePrefix + d.path));
  const { data: existing } = await db.from('kb_documents').select('id, source_id').eq('org_id', user.orgId).like('source_id', `${sourcePrefix}%`);
  const stale = (existing ?? []).filter((d) => !keep.has(d.source_id)).map((d) => d.id);
  if (stale.length) await db.from('kb_documents').delete().in('id', stale);
  invalidateRetrieval(user.orgId);

  // F11: code_map documents for "where is the code that…?" (docs above stay the source for "why").
  const codeFiles = await indexCode({ repo, branch, files: code, orgId: user.orgId });

  let topicOwners = 0;
  if (codeownersPath) {
    const rows = parseCodeowners(await getText(repo, codeownersPath)).flatMap(({ pattern, owners }) =>
      owners.map((owner_login) => ({ org_id: user.orgId, pattern, owner_login })));
    await db.from('topic_owners').delete().eq('org_id', user.orgId);
    if (rows.length) {
      const { error } = await db.from('topic_owners').insert(rows);
      if (error) throw error;
    }
    topicOwners = rows.length;
  }

  return { synced, glossary_terms: glossaryTerms, topic_owners: topicOwners, code_files: codeFiles };
}
