// Owner: Track B (F6 UI). Clickable term → definition popover with source + Listen + link to the Glossary page.
// react-aria handles focus (moves into the popover, back to the term on close), Esc, and outside clicks.
// variant "chip": a pill in a list of terms. "inline": the word inside running text, dotted underline.
import { useMemo } from 'react';
import { Link } from 'react-router';
import { Button, Dialog, DialogTrigger, Heading, Popover } from 'react-aria-components';
import { useGlossary, termId, termMatcher } from '../lib/glossary.js';
import AudioButton from './AudioButton.jsx';

const STYLES = {
  chip: 'inline-flex min-h-9 cursor-pointer items-center rounded-full border border-border bg-surface px-3 text-sm font-medium hover:border-accent hover:bg-accent-soft',
  inline: 'inline min-h-0 cursor-help p-0 align-baseline font-[inherit] text-[length:inherit] underline decoration-accent decoration-dotted decoration-2 underline-offset-4 hover:bg-accent-soft',
};

function TermCard({ term }) {
  const { status, find } = useGlossary();
  const entry = find(term);
  const s = entry?.source;
  return (
    <>
      <Heading slot="title" className="text-lg font-semibold">{entry?.term ?? term}</Heading>
      {status === 'loading' && <p className="mt-1 text-muted">Loading…</p>}
      {status !== 'loading' && !entry && <p className="mt-1">No definition in the team docs yet. You can ask about it in Ask.</p>}
      {entry && (
        <>
          <p className="mt-1">{entry.definition}</p>
          {s && (
            <p className="mt-2 text-sm text-muted">
              From {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}<span className="sr-only"> (opens in a new tab)</span></a> : s.title}
              {s.section_path && s.section_path !== s.title && ` · ${s.section_path.startsWith(`${s.title} > `) ? s.section_path.slice(s.title.length + 3) : s.section_path}`}
              {s.page && ` · page ${s.page}`}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AudioButton text={`${entry.term}. ${entry.definition}`} />
            <Link to={`/glossary#${termId(entry.term)}`} className="text-sm">All terms</Link>
          </div>
        </>
      )}
    </>
  );
}

export default function GlossaryTerm({ term, children, variant = 'chip' }) {
  return (
    <DialogTrigger>
      <Button className={STYLES[variant]}>
        {children ?? term}
        {variant === 'inline' && <span className="sr-only"> (glossary term)</span>}
      </Button>
      {/* Rendered inside <main> (not at the end of <body>) so the popover and react-aria's hidden Dismiss button stay in a landmark. */}
      <Popover placement="bottom start" offset={6} UNSTABLE_portalContainer={document.getElementById('main') ?? undefined} className="w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-4 text-fg shadow-lg">
        <Dialog className="outline-none">
          <TermCard term={term} />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

/**
 * Running text with known glossary terms turned into inline GlossaryTerms.
 * Only the first mention of each term in this piece of text (a paragraph, a list item) becomes a button,
 * so answers don't turn into a sea of links.
 */
export function GlossaryText({ text }) {
  const { terms } = useGlossary();
  const re = useMemo(() => termMatcher(terms), [terms]);
  if (!re || !text) return text;
  const seen = new Set();
  const out = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const k = m[1].toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(text.slice(last, m.index), <GlossaryTerm key={m.index} term={m[1]} variant="inline" />);
    last = m.index + m[1].length;
  }
  out.push(text.slice(last));
  return out;
}
