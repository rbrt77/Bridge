// Owner: Track B (F1). 5 questions → optional free text (parsed by AI, never stored) → review → save.
// Nothing is applied until the user confirms on the review step.
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { QUESTIONS, prefsFromAnswers, mergePrefs, diffPrefs } from '../a11y/workStyle.js';

const TEXT_STEP = QUESTIONS.length;
const REVIEW_STEP = QUESTIONS.length + 1;

function ChangeList({ changes, empty }) {
  if (!changes.length) return <p className="mt-2">{empty}</p>;
  return (
    <ul className="mt-2 list-disc pl-6">
      {changes.map((c) => <li key={`${c.group}.${c.key}`}>{c.label}: {c.from} → <strong>{c.to}</strong></li>)}
    </ul>
  );
}

function Question({ q, answer, onPick }) {
  return (
    <fieldset className="mt-3">
      <legend className="font-semibold">{q.legend}</legend>
      <div className="mt-2 flex flex-col gap-1">
        {q.options.map((o) => (
          <label key={o.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border-subtle px-3 hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
            <input
              type={q.multiple ? 'checkbox' : 'radio'}
              name={q.id}
              value={o.value}
              checked={q.multiple ? (answer ?? []).includes(o.value) : answer === o.value}
              onChange={(e) => onPick(q, o.value, e.target.checked)}
              className="size-5 min-h-0"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function WorkStyleWizard({ prefs, onSave, onCancel }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [text, setText] = useState('');
  const [suggestion, setSuggestion] = useState(null); // partial Prefs from /profile/parse
  const [useSuggestion, setUseSuggestion] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef(null);

  useEffect(() => { heading.current?.focus(); }, [step]);

  const fromAnswers = prefsFromAnswers(prefs, answers);
  const draft = suggestion && useSuggestion ? mergePrefs(fromAnswers, suggestion) : fromAnswers;

  const pick = (q, value, checked) =>
    setAnswers((a) => {
      if (!q.multiple) return { ...a, [q.id]: value };
      const cur = a[q.id] ?? [];
      return { ...a, [q.id]: checked ? [...cur, value] : cur.filter((v) => v !== value) };
    });

  const parse = async () => {
    setError('');
    setParsing(true);
    try {
      const res = await api('/profile/parse', { method: 'POST', body: { text } });
      setSuggestion(res.prefs);
      setUseSuggestion(true);
    } catch (e) {
      setError(e.message || 'Could not read that. You can skip this step.');
    } finally {
      setParsing(false);
    }
  };

  const title =
    step < TEXT_STEP ? `Question ${step + 1} of ${QUESTIONS.length}` : step === TEXT_STEP ? 'Anything else? (optional)' : 'Review your settings';

  return (
    <section aria-labelledby="wizard-step" className="card mt-6">
      <div aria-hidden="true" className="mb-4 h-2 overflow-hidden rounded-full bg-accent-soft">
        <div className="h-full rounded-full bg-accent" style={{ width: `${((step + 1) / (REVIEW_STEP + 1)) * 100}%` }} />
      </div>
      <h2 id="wizard-step" ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{title}</h2>

      {step < TEXT_STEP && <Question q={QUESTIONS[step]} answer={answers[QUESTIONS[step].id]} onPick={pick} />}

      {step === TEXT_STEP && (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor="ws-text" className="font-semibold">In your own words, what helps you work well?</label>
          <p id="ws-text-hint" className="text-muted">
            Describe what helps, not a diagnosis. We use the text once to suggest settings; it is never saved.
          </p>
          <textarea
            id="ws-text"
            rows={4}
            maxLength={2000}
            value={text}
            onChange={(e) => { setText(e.target.value); setSuggestion(null); }}
            aria-describedby={error ? 'ws-text-hint ws-text-error' : 'ws-text-hint'}
            className="field"
          />
          {error && <p id="ws-text-error" role="alert" className="text-danger">{error}</p>}
          <div>
            <button type="button" onClick={parse} disabled={!text.trim() || parsing} className="btn">
              {parsing ? 'Reading…' : 'Suggest settings'}
            </button>
          </div>
          {suggestion && (
            <div role="status" className="rounded-xl bg-accent-soft p-4">
              <p className="font-semibold">Suggested changes</p>
              <ChangeList changes={diffPrefs(fromAnswers, mergePrefs(fromAnswers, suggestion))} empty="Nothing to change from what you wrote." />
              <label className="mt-2 flex min-h-11 items-center gap-3">
                <input type="checkbox" checked={useSuggestion} onChange={(e) => setUseSuggestion(e.target.checked)} className="size-5 min-h-0" />
                Use these suggestions
              </label>
            </div>
          )}
        </div>
      )}

      {step === REVIEW_STEP && (
        <div className="mt-3">
          <p>These settings will change. Nothing is saved until you press Save.</p>
          <ChangeList changes={diffPrefs(prefs, draft)} empty="No changes: your current settings already match your answers." />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="btn">Back</button>}
        {step < REVIEW_STEP && (
          <button type="button" onClick={() => setStep(step + 1)} className="btn btn-primary">
            {step === TEXT_STEP && !text.trim() ? 'Skip' : 'Next'}
          </button>
        )}
        {step === REVIEW_STEP && (
          <button type="button" onClick={() => onSave(draft)} className="btn btn-primary">Save my work style</button>
        )}
        <button type="button" onClick={onCancel} className="btn ml-auto">Cancel</button>
      </div>
    </section>
  );
}
