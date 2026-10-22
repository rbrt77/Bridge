// Owner: Track B (F6 UI). Clickable term → definition popover + source + audio. TODO(B): use react-aria DialogTrigger/Popover.
export default function GlossaryTerm({ term }) {
  return <button type="button" className="rounded-full border px-3 text-sm">{term}</button>;
}
