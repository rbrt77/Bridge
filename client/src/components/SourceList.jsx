// Owner: Track B. Citations [S#] → list with doc, section, page. TODO(B): port source logic from Internal_ai MessageBubble.jsx:50-94.
export default function SourceList({ sources = [] }) {
  if (!sources.length) return null;
  return (
    <section aria-labelledby="sources-h" className="mt-4">
      <h3 id="sources-h" className="font-semibold">Sources</h3>
      <ol className="list-none">
        {sources.map((s) => (
          <li key={s.id}>
            <span className="font-mono">[{s.id}]</span>{' '}
            {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
            {s.section_path && ` — ${s.section_path}`}{s.page && `, page ${s.page}`}
            {s.approved_by && ` (Team FAQ, answered by ${s.approved_by})`}
          </li>
        ))}
      </ol>
    </section>
  );
}
