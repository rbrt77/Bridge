// Owner: Track B. F6 page: searchable list of the team's terms with definition, source and Listen.
// Terms come from the team docs at ingest time (Track A); /glossary#term-hermes opens on that term.
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useGlossary, termId } from '../lib/glossary.js';
import AudioButton from '../components/AudioButton.jsx';

const sectionOf = (s) => (s.section_path?.startsWith(`${s.title} > `) ? s.section_path.slice(s.title.length + 3) : s.section_path);

export default function Glossary() {
  const { status, terms, error } = useGlossary();
  const [query, setQuery] = useState('');
  const { hash } = useLocation();
  const jumped = useRef(false);

  // Arriving from a term popover ("All terms"): bring that term into view and focus it.
  useEffect(() => {
    if (status !== 'ready' || !hash || jumped.current) return;
    jumped.current = true;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ block: 'center' });
    el?.focus({ preventScroll: true });
  }, [status, hash]);

  const q = query.trim().toLowerCase();
  const shown = q ? terms.filter((t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)) : terms;

  return (
    <>
      <h1 className="text-3xl font-bold">Glossary</h1>
      <p className="mt-2 max-w-prose text-muted">
        Code names, acronyms and team words, explained from your team&apos;s own documents. The same terms are clickable
        in answers, tickets and meeting notes.
      </p>

      <div className="mt-6 flex max-w-md flex-col gap-1">
        <label htmlFor="gl-q" className="font-medium">Search terms</label>
        <input id="gl-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Hermes, CAB, on-call" aria-describedby="gl-count" className="field" />
        <p id="gl-count" role="status" className="text-sm text-muted">
          {status === 'ready' && (q ? `${shown.length} of ${terms.length} terms match` : `${terms.length} terms`)}
        </p>
      </div>

      {status === 'loading' && <p className="mt-6 text-muted">Loading…</p>}
      {status === 'error' && <p role="alert" className="mt-6 text-danger">Could not load the glossary: {error}</p>}
      {status === 'ready' && terms.length === 0 && (
        <p className="card mt-6">No terms yet. They appear after an admin adds the team&apos;s documents under Company.</p>
      )}

      {shown.length > 0 && (
        <dl className="mt-6 grid gap-3 md:grid-cols-2">
          {shown.map((t) => (
            <div key={t.term} id={termId(t.term)} tabIndex={-1} className="card flex flex-col gap-1 outline-offset-2 target:border-accent">
              <dt className="text-lg font-semibold">{t.term}</dt>
              <dd>{t.definition}</dd>
              {t.source && (
                <dd className="text-sm text-muted">
                  From {t.source.url ? <a href={t.source.url} target="_blank" rel="noreferrer">{t.source.title}<span className="sr-only"> (opens in a new tab)</span></a> : t.source.title}
                  {sectionOf(t.source) && sectionOf(t.source) !== t.source.title && ` · ${sectionOf(t.source)}`}
                  {t.source.page && ` · page ${t.source.page}`}
                </dd>
              )}
              <dd className="mt-auto flex flex-wrap gap-2 pt-2"><AudioButton text={`${t.term}. ${t.definition}`} /></dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
