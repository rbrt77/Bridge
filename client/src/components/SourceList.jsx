// Owner: Track B. Citations [S#] → numbered list with document, section, page and type.
// Each item has an id (`${idPrefix}-S1`) so the [S1] chips in the answer can jump to it.
const DOC_TYPES = {
  handbook: 'Handbook',
  procedure: 'Procedure',
  repo_doc: 'Repository doc',
  adr: 'Decision record',
  faq: 'Team FAQ',
  legal: 'Policy',
  code_map: 'Code map',
};

// section_path often starts with the document title ("Handbook > 3. Plan > 3.3 DoD"); show only the part after it.
const section = (s) => (s.section_path?.startsWith(`${s.title} > `) ? s.section_path.slice(s.title.length + 3) : s.section_path);

export default function SourceList({ sources = [], idPrefix = 'src' }) {
  if (!sources.length) return null;
  return (
    <section aria-labelledby={`${idPrefix}-h`} className="mt-5 border-t border-border-subtle pt-4">
      <h3 id={`${idPrefix}-h`} className="font-semibold">Sources</h3>
      <ol className="mt-2 flex flex-col gap-2">
        {sources.map((s) => (
          <li key={s.id} id={`${idPrefix}-${s.id}`} tabIndex={-1} className="flex gap-3 rounded-lg p-1 outline-offset-2 target:bg-accent-soft">
            <span aria-hidden="true" className="mt-0.5 grid h-6 min-w-8 place-items-center rounded-md bg-accent-soft px-1 font-mono text-sm font-semibold text-accent">
              {s.id}
            </span>
            <span className="min-w-0">
              <span className="sr-only">Source {s.id.slice(1)}: </span>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="font-medium">
                  {s.title}<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span className="font-medium">{s.title}</span>
              )}
              <span className="block text-sm text-muted">
                {[DOC_TYPES[s.doc_type], section(s), s.page && `page ${s.page}`].filter(Boolean).join(' · ')}
                {s.approved_by && ` · answered by ${s.approved_by}`}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
