// Owner: Track B. Checklist with minutes and progress; used in Today and Tickets.
// items: [{ id?, text, minutes?, done?, note? }]. `note` is a short tag after the text (e.g. "inferred").
import { useId } from 'react';

export default function Checklist({ title, items = [], onToggle, hint }) {
  const id = useId();
  const done = items.filter((it) => it.done).length;
  const minutes = items.reduce((sum, it) => sum + (it.done ? 0 : it.minutes ?? 0), 0);
  return (
    <fieldset aria-describedby={`${id}-progress`} className="mt-4">
      <legend className="text-lg font-semibold">{title}</legend>
      <p id={`${id}-progress`} className="text-sm text-muted">
        {done} of {items.length} done{minutes > 0 && ` · about ${minutes} min left`}{hint && ` · ${hint}`}
      </p>
      <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent-soft">
        <div className="h-full rounded-full bg-accent" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
      </div>
      <ul className="mt-2 flex flex-col">
        {items.map((it, i) => (
          <li key={it.id ?? `${i}-${it.text}`}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-accent-soft">
              <input type="checkbox" checked={!!it.done} onChange={(e) => onToggle?.(it, e.target.checked, i)} className="mt-0.5 size-5 min-h-0 shrink-0" />
              <span className={it.done ? 'text-muted line-through' : undefined}>
                {it.text}
                {it.minutes ? <span className="text-muted"> · {it.minutes} min</span> : null}
                {it.note && <span className="ml-2 whitespace-nowrap rounded-full border border-border px-2 text-xs text-muted">{it.note}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
