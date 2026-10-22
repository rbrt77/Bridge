// Owner: Track A (F6). Extract acronyms + internal code names (Hermes, Atlas, DoD, CAB…) at ingest time.
export async function extractGlossary(documentText, source) {
  // TODO(A): gpt-5-nano + JSON schema { terms:[{term, definition}] } → upsert glossary_terms
  return [];
}
