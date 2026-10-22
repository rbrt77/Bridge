// Owner: Track B. Checklist with minutes; used in Today and Tickets.
export default function Checklist({ title, items = [], onToggle }) {
  return (
    <fieldset className="my-4">
      <legend className="font-semibold">{title}</legend>
      <ul>
        {items.map((it) => (
          <li key={it.id ?? it.text}>
            <label className="inline-flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={!!it.done} onChange={(e) => onToggle?.(it, e.target.checked)} className="size-5" />
              {it.text}{it.minutes && <span className="text-[var(--muted)]"> ({it.minutes} min)</span>}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
