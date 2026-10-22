// Owner: Track B. One answer: TL;DR/steps from `enrich`, Markdown body with [S#] chips → SourceList, re-adapt buttons, Listen.
// While streaming the text is aria-busy and never announced token by token (Ask announces "Answer ready" once).
import Markdown, { parseBlocks, plainText } from '../lib/markdown.jsx';
import SourceList from './SourceList.jsx';
import AudioButton from './AudioButton.jsx';
import GlossaryTerm, { GlossaryText } from './GlossaryTerm.jsx';
import { useGlossary } from '../lib/glossary.js';

const MODES = [['shorter', 'Shorter'], ['simpler', 'Simpler'], ['more', 'More detail'], ['steps', 'As steps']];

/**
 * @param {{ turn: { key, answer, sources, enrich, status, statusText, error, answerId }, prefs, busy: boolean,
 *   onReAdapt: (mode: string) => void, onRetry: () => void, onStop: () => void }} props
 */
export default function AdaptiveAnswer({ turn, prefs, busy, onReAdapt, onRetry, onStop }) {
  const { key, answer, sources = [], enrich, status, statusText, error } = turn;
  const streaming = status === 'streaming';
  const prefix = `${key}-src`;
  const byId = Object.fromEntries(sources.map((s) => [s.id, s]));

  const cite = (label) => (
    <a
      href={`#${prefix}-${label}`}
      onClick={() => setTimeout(() => document.getElementById(`${prefix}-${label}`)?.focus(), 0)}
      className="mx-0.5 inline-flex rounded-md bg-accent-soft px-1.5 align-baseline font-mono text-xs font-semibold text-accent no-underline hover:underline"
    >
      {label}
      <span className="sr-only">{byId[label] ? `, source: ${byId[label].title}` : ', source'}</span>
    </a>
  );

  // Don't repeat what the answer already has: a TL;DR line (profile asks for it) or its own numbered list.
  const tldr = !prefs?.output?.tldr && enrich?.tldr;
  const hasList = answer && parseBlocks(answer).some((b) => b.type === 'ol');
  const steps = !hasList && !prefs?.output?.steps && enrich?.steps?.length > 0 && enrich.steps;
  const deadlines = enrich?.deadlines ?? [];
  const glossary = useGlossary();
  const terms = [...new Set(enrich?.glossary_terms_used ?? [])].filter((t) => glossary.find(t));
  const renderText = (text) => <GlossaryText text={text} />;

  return (
    <div aria-busy={streaming} className="mt-3">
      {streaming && !answer && (
        <p aria-hidden="true" className="flex items-center gap-2 text-muted">
          <span className="size-2 animate-pulse rounded-full bg-accent" />
          {statusText || 'Searching team docs…'}
        </p>
      )}

      {tldr && (
        <p className="mb-3 rounded-lg bg-accent-soft p-3"><strong>TL;DR:</strong> {tldr}</p>
      )}

      {answer && <Markdown text={answer} cite={cite} renderText={streaming ? undefined : renderText} />}

      {status === 'stopped' && <p className="mt-2 text-muted">You stopped this answer.</p>}
      {status === 'error' && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-danger">{error || 'Something went wrong.'}</p>
          <button type="button" onClick={onRetry} disabled={busy} className="btn">Try again</button>
        </div>
      )}

      {steps && (
        <section aria-labelledby={`${key}-steps`} className="mt-4">
          <h3 id={`${key}-steps`} className="font-semibold">Steps</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-6">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </section>
      )}

      {deadlines.length > 0 && (
        <section aria-labelledby={`${key}-due`} className="mt-4">
          <h3 id={`${key}-due`} className="font-semibold">Deadlines</h3>
          <ul className="mt-2 list-disc pl-6">{deadlines.map((d) => <li key={d.what + d.date}>{d.what}: <time dateTime={d.date}>{d.date}</time></li>)}</ul>
        </section>
      )}

      <SourceList sources={sources} idPrefix={prefix} />
      {terms.length > 0 && (
        <section aria-labelledby={`${key}-terms`} className="mt-4">
          <h3 id={`${key}-terms`} className="font-semibold">Terms in this answer</h3>
          <ul className="mt-2 flex flex-wrap gap-2">{terms.map((t) => <li key={t}><GlossaryTerm term={t} /></li>)}</ul>
        </section>
      )}

      {streaming ? (
        <div className="mt-4">
          <button type="button" onClick={onStop} className="btn">Stop</button>
        </div>
      ) : (
        answer && status === 'done' && (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Change this answer">
            {turn.answerId && MODES.map(([m, label]) => (
              <button key={m} type="button" disabled={busy} onClick={() => onReAdapt(m)} className="btn">{label}</button>
            ))}
            <AudioButton text={plainText(answer)} />
          </div>
        )
      )}
    </div>
  );
}
