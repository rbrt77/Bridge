// Owner: Track C (F4 UI). Grouped by file with headings; filter "Required only".
import { useAnnounce } from '../a11y/Announcer.jsx';

const LABEL = { required: 'Required', optional: 'Optional', question: 'Question' };

export default function ReviewList({ files = [], requiredOnly = false }) {
  const announce = useAnnounce();
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      announce('Reply copied. Paste it in the GitHub thread.');
    } catch {
      announce('Could not copy. Select the reply text and copy it by hand.', { urgent: true });
    }
  };

  return files.map((f) => {
    const comments = f.comments.filter((c) => !requiredOnly || c.kind === 'required');
    if (!comments.length) return null;
    return (
      <section key={f.path} aria-labelledby={`f-${f.path}`} className="card mt-4">
        <h3 id={`f-${f.path}`} className="font-mono font-semibold">{f.path}</h3>
        <ul className="mt-3 grid gap-4">
          {comments.map((c) => (
            <li key={c.id} className={`border-l-4 pl-3 ${c.kind === 'required' ? 'border-[var(--danger)]' : 'border-accent'}`}>
              <p><strong>{LABEL[c.kind]}</strong>: {c.what_to_change}</p>
              <p className="text-muted">Why: {c.why} ({c.source})</p>
              <details className="mt-1">
                <summary className="cursor-pointer">What @{c.author} wrote</summary>
                <p className="mt-1"><q>{c.original}</q></p>
              </details>
              {c.suggested_reply && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-muted">Reply: {c.suggested_reply}</p>
                  <button type="button" className="btn" onClick={() => copy(c.suggested_reply)}>
                    Copy reply<span className="sr-only"> to {LABEL[c.kind].toLowerCase()} comment {c.id}</span>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  });
}
