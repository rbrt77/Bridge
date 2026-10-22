// Owner: Track D. F10 (SHOULD): one step per screen — command (copy + audio), what you should see, what to do if it fails, paste error → fix with source.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import AudioButton from '../components/AudioButton.jsx';
import WorkTabs from '../components/WorkTabs.jsx';

const STORE_KEY = 'onramp.setup.step';
const readStep = () => {
  try {
    return Number(localStorage.getItem(STORE_KEY)) || 0;
  } catch {
    return 0;
  }
};

/** "run `npm ci` now" → text with <code> for the backtick parts. */
function Inline({ text }) {
  return text.split(/`([^`]+)`/).map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

export default function Setup() {
  const announce = useAnnounce();
  const heading = useRef(null);
  const [index, setIndex] = useState(readStep);
  const [step, setStep] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [fix, setFix] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const first = useRef(true);

  useEffect(() => {
    let active = true;
    api('/setup/step', { method: 'POST', body: { step_index: index } })
      .then((d) => {
        if (!active) return;
        setStep(d.step);
        setFix(null);
        try {
          localStorage.setItem(STORE_KEY, String(d.step.index));
        } catch {
          /* per-viewer convenience only */
        }
        // Move focus to the new step for keyboard and screen reader users (not on first load).
        if (!first.current) heading.current?.focus();
        first.current = false;
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [index]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(step.command);
      announce('Command copied.');
    } catch {
      announce('Copy failed. Select the command and copy it yourself.', { urgent: true });
    }
  };

  const findFix = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    announce('Looking for a fix…');
    try {
      const d = await api('/setup/step', { method: 'POST', body: { step_index: step.index, error_text: errorText } });
      setFix(d.fix);
      announce(d.fix?.found ? 'Fix found.' : 'No fix found in the team docs.');
    } catch (err) {
      setError(err.message);
      announce('Could not search for a fix.', { urgent: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <WorkTabs />
      <h1 className="text-3xl font-bold">Local setup</h1>
      <p className="mt-2 max-w-prose text-muted">One step at a time, from the team's setup guide. If something fails, paste the error and get the fix from the docs.</p>

      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}

      {step && (
        <>
          <section aria-labelledby="step-h" className="card mt-6">
            <p className="text-muted">
              Step {step.index + 1} of {step.total}
            </p>
            <progress value={step.index + 1} max={step.total} className="mt-1 w-full" aria-label={`Step ${step.index + 1} of ${step.total}`} />
            <h2 id="step-h" ref={heading} tabIndex={-1} className="mt-3 text-2xl font-semibold">
              {step.title}
            </h2>
            <p className="mt-2">
              <Inline text={step.text} />
            </p>

            {step.command && (
              <div className="mt-4">
                <p className="font-semibold">Run this command</p>
                <pre className="mt-1 rounded-lg bg-[var(--bg)] p-3">
                  <code>{step.command}</code>
                </pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={copy} className="btn">Copy command</button>
                  <AudioButton text={`${step.title}. ${step.text.replace(/`/g, '')}`} label="Listen to this step" />
                </div>
              </div>
            )}

            {step.expect && (
              <p className="mt-4">
                <span className="font-semibold">You should see: </span>
                <Inline text={step.expect} />
              </p>
            )}

            <nav aria-label="Setup steps" className="mt-6 flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => setIndex(step.index - 1)} disabled={step.index === 0}>
                Previous step
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setIndex(step.index + 1)} disabled={step.index + 1 >= step.total}>
                Next step
              </button>
            </nav>
          </section>

          <form onSubmit={findFix} className="card mt-6">
            <h2 className="text-xl font-semibold">Something went wrong?</h2>
            <label htmlFor="setup-error" className="mt-2 block">
              Paste the error you see
            </label>
            <textarea id="setup-error" value={errorText} onChange={(e) => setErrorText(e.target.value)} rows={4} className="field mt-1 w-full font-mono text-sm" />
            <button type="submit" className="btn btn-primary mt-3" disabled={!errorText.trim() || busy}>
              {busy ? 'Looking…' : 'Find a fix'}
            </button>

            {fix?.found && (
              <section aria-labelledby="fix-h" className="mt-4 rounded-lg border border-[var(--border)] p-4">
                <h3 id="fix-h" className="text-lg font-semibold">{fix.issue ? `Known issue: ${fix.issue}` : 'Fix from the team docs'}</h3>
                {fix.why && (
                  <p className="mt-2">
                    <span className="font-semibold">Why: </span>
                    <Inline text={fix.why} />
                  </p>
                )}
                <p className="mt-2">
                  <span className="font-semibold">Fix: </span>
                  <Inline text={fix.fix} />
                </p>
                {fix.source && (
                  <p className="mt-2 text-sm text-muted">
                    Source: {fix.source.url ? <a href={fix.source.url}>{fix.source.title}</a> : fix.source.title}
                    {fix.source.section_path ? ` › ${fix.source.section_path}` : ''}
                  </p>
                )}
              </section>
            )}
            {fix && !fix.found && (
              <p className="mt-4">
                This error is not in the team docs yet. <Link to="/ask">Ask your manager from the Ask page</Link>, and the answer can be saved to the team docs.
              </p>
            )}
          </form>
        </>
      )}
    </>
  );
}
