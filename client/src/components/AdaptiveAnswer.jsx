// Owner: Track B. Answer + TL;DR/steps from `enrich` + re-adapt buttons + Listen.
import SourceList from './SourceList.jsx';
import AudioButton from './AudioButton.jsx';

const MODES = [['shorter', 'Shorter'], ['simpler', 'Simpler'], ['more', 'More detail'], ['steps', 'As steps']];

export default function AdaptiveAnswer({ answer, sources, enrich, onReAdapt, busy }) {
  return (
    <article aria-labelledby="answer-h" className="mt-4">
      <h2 id="answer-h" className="text-lg font-semibold">Answer <span className="text-sm font-normal">(AI-generated)</span></h2>
      {enrich?.tldr && <p><strong>TL;DR:</strong> {enrich.tldr}</p>}
      <p className="whitespace-pre-wrap">{answer}</p>
      {enrich?.steps?.length > 0 && (
        <ol className="list-decimal pl-6">{enrich.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      )}
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Change the answer">
        {MODES.map(([m, label]) => <button key={m} type="button" disabled={busy} onClick={() => onReAdapt?.(m)} className="rounded border px-3">{label}</button>)}
        <AudioButton text={answer} />
      </div>
      <SourceList sources={sources} />
      {/* TODO(B): render glossary_terms_used as <GlossaryTerm> chips */}
    </article>
  );
}
