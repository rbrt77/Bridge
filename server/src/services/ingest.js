// Owner: Track A. PLAN §7 Ingest. TODO(A): port Internal_ai ingest.js:98-219 (PDF per page, DOCX→markdown).
import { notImplemented } from '../middleware/errors.js';

export async function ingestFiles(files, user) {
  // parse → sanitizeText → chunkMarkdown → contextualizeChunks → embed(context+content) → insert documents
  // → extractGlossary → readability score
  throw notImplemented('ingestFiles');
}

export async function ingestRepo(repo, user) {
  // integrations/github.listRepoDocs(repo) → runSync (insert new BEFORE deleting old) ; parse CODEOWNERS → topic_owners
  throw notImplemented('ingestRepo');
}
