// Owner: Track C (F4 UI). Grouped by file with headings; filter "Required only".
export default function ReviewList({ files = [], requiredOnly = false }) {
  return files.map((f) => (
    <section key={f.path} aria-labelledby={`f-${f.path}`}>
      <h3 id={`f-${f.path}`} className="font-mono font-semibold">{f.path}</h3>
      <ul>
        {f.comments.filter((c) => !requiredOnly || c.kind === 'required').map((c) => (
          <li key={c.id} className="my-2 border-l-4 pl-3">
            <p><strong>{c.kind.toUpperCase()}</strong> — {c.what_to_change}</p>
            <p className="text-[var(--muted)]">Why: {c.why} ({c.source})</p>
            {/* TODO(C): "Copy reply" button with c.suggested_reply */}
          </li>
        ))}
      </ul>
    </section>
  ));
}
