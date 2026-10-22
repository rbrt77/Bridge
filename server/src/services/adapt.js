// Owner: Track A (E1 generation + E3 adaptation rules). PLAN §7 Generation.
import { retrieve } from './retrieval.js';
import { notImplemented } from '../middleware/errors.js';

/** Profile → extra system rules. Track B owns the Prefs shape (docs/API.md). */
export function rulesFromPrefs(prefs = {}) {
  const o = prefs.output ?? {};
  const rules = [];
  if (o.tldr) rules.push('Start with a one-line TL;DR.');
  if (o.steps) rules.push('Use numbered steps for any procedure.');
  if (o.literal) rules.push('Use literal language: no idioms, metaphors or sarcasm.');
  if (o.screenReader) rules.push('Use headings and lists; never use tables or ASCII art.');
  return { rules, verbosity: { short: 'low', normal: 'medium', detailed: 'high' }[o.length] ?? 'medium' };
}

/**
 * TODO(A):
 * - retrieve(); if abstain → send('handoff', { helper, topic_owner, draft }) and return
 * - strict mode: docs in <documents> block in the INPUT (not system prompt), marked untrusted
 * - streamText → send('token'); strip citations [S#] that don't match a chunk → send('sources')
 * - in parallel gpt-5-nano enrich → send('enrich')
 * - send('done', { answer_id }); cache retrieval by answer_id for Shorter/Simpler/…
 */
export async function answerQuestion({ question, history, prefs, mode, answer_id, user, send }) {
  send('status', { message: 'Searching team docs…' });
  throw notImplemented('answerQuestion');
}
