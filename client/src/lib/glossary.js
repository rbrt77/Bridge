// Owner: Track B (F6 UI). The org glossary, fetched once per page load and shared by every GlossaryTerm.
import { useEffect, useState } from 'react';
import { api } from './api.js';

let cache = null; // Promise<{ terms, byKey }>

const key = (term) => term.toLowerCase();

function load() {
  cache ??= api('/glossary')
    .then(({ terms }) => ({ terms, byKey: new Map(terms.map((t) => [key(t.term), t])) }))
    .catch((e) => { cache = null; throw e; }); // retry on the next mount
  return cache;
}

/** { status: 'loading'|'ready'|'error', terms, find(term), error } */
export function useGlossary() {
  const [state, setState] = useState({ status: 'loading', terms: [], byKey: new Map(), error: '' });
  useEffect(() => {
    let alive = true;
    load()
      .then((g) => alive && setState({ status: 'ready', ...g, error: '' }))
      .catch((e) => alive && setState((s) => ({ ...s, status: 'error', error: e.message })));
    return () => { alive = false; };
  }, []);
  return { ...state, find: (term) => state.byKey.get(key(term)) ?? null };
}

export const termId = (term) => `term-${term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/**
 * One regex that finds any glossary term in running text, longest first ("Hermes worker" before "Hermes").
 * Acronyms and names match case-sensitively; all-lowercase jargon ("buddy") also matches capitalised ("Buddy").
 */
export function termMatcher(terms) {
  if (!terms.length) return null;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const variants = terms.flatMap(({ term }) => (term === term.toLowerCase() ? [term, term[0].toUpperCase() + term.slice(1)] : [term]));
  const parts = variants.sort((a, b) => b.length - a.length).map(esc);
  return new RegExp(`(?<![\\w-])(${parts.join('|')})(?![\\w-])`, 'g');
}
