// Owner: Track C + D. F7: pick needs → adjustments with source + how to ask → editable letter (needs only) → send via help chat / copy.
// Nothing is stored or sent until the person presses Send. Disclaimer: informational, not legal advice.
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAnnounce } from '../a11y/Announcer.jsx';

export default function Support() {
  const announce = useAnnounce();
  const [needs, setNeeds] = useState([]);
  const [picked, setPicked] = useState([]);
  const [result, setResult] = useState(null);
  const [letter, setLetter] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | ready | sending | sent
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/adjustments/needs')
      .then((d) => setNeeds(d.needs))
      .catch((e) => setError(e.message));
  }, []);

  const toggle = (id, on) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));

  const advise = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    announce('Finding adjustments…');
    try {
      const data = await api('/adjustments/advise', { method: 'POST', body: { need_ids: picked } });
      setResult(data);
      setLetter(data.letter);
      setStatus('ready');
      announce(`${data.adjustments.length} adjustments found. Your letter is ready to edit.`);
    } catch (err) {
      setError(err.message);
      setStatus('idle');
      announce('Could not load adjustments.', { urgent: true });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      announce('Letter copied.');
    } catch {
      announce('Copy failed. Select the text and copy it yourself.', { urgent: true });
    }
  };

  const send = async () => {
    setStatus('sending');
    try {
      await api('/help/threads', { method: 'POST', body: { question: 'Workplace adjustments', draft: letter } });
      setStatus('sent');
      announce(`Sent to ${managerName}.`);
    } catch (err) {
      setError(err.message);
      setStatus('ready');
      announce('Sending failed.', { urgent: true });
    }
  };

  const managerName = result?.to?.name ?? 'your manager';

  return (
    <>
      <h1 className="text-3xl font-bold">Support and adjustments</h1>
      <p className="mt-2 max-w-prose text-muted">
        Pick what makes work harder for you. You get changes you can ask for, where the company already allows them, and a letter you
        can edit. You never have to say why: the letter describes needs, not a diagnosis.
      </p>

      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}

      <form onSubmit={advise} className="card mt-6">
        <fieldset>
          <legend className="text-xl font-semibold">What makes work harder for you?</legend>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {needs.map((n) => (
              <li key={n.id}>
                <label className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" checked={picked.includes(n.id)} onChange={(e) => toggle(n.id, e.target.checked)} className="size-5 min-h-0" />
                  {n.label}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <button type="submit" className="btn btn-primary mt-4" disabled={!picked.length || status === 'loading'}>
          {status === 'loading' ? 'Finding adjustments…' : 'Show adjustments'}
        </button>
      </form>

      {result && (
        <>
          <section aria-labelledby="adj-h" className="mt-8">
            <h2 id="adj-h" className="text-xl font-semibold">Changes you can ask for</h2>
            <ul className="mt-3 grid gap-3">
              {result.adjustments.map((a) => (
                <li key={a.id} className="card">
                  <h3 className="text-lg font-semibold">{a.title}</h3>
                  <p className="mt-1">{a.what}</p>
                  <dl className="mt-3 grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4">
                    <dt className="font-semibold">Cost</dt>
                    <dd>{a.cost}</dd>
                    <dt className="font-semibold">How to ask</dt>
                    <dd>“{a.how_to_ask}”</dd>
                    {a.company_source && (
                      <>
                        <dt className="font-semibold">Already at Brightline</dt>
                        <dd>{a.company_source}</dd>
                      </>
                    )}
                    {a.company_gap && (
                      <>
                        <dt className="font-semibold">Not covered yet</dt>
                        <dd>{a.company_gap}</dd>
                      </>
                    )}
                    <dt className="font-semibold">Based on</dt>
                    <dd>{a.sources.join(' · ')}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="letter-h" className="card mt-8">
            <h2 id="letter-h" className="text-xl font-semibold">Your letter to {managerName}</h2>
            <label htmlFor="letter" className="mt-2 block text-muted">
              Edit it as you like. Nothing is sent until you press Send.
            </label>
            <textarea
              id="letter"
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              rows={14}
              className="field mt-2 w-full"
              disabled={status === 'sent'}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={send} className="btn btn-primary" disabled={!letter.trim() || status === 'sending' || status === 'sent'}>
                {status === 'sent' ? `Sent to ${managerName}` : status === 'sending' ? 'Sending…' : `Send to ${managerName} in Bridge`}
              </button>
              <button type="button" onClick={copy} className="btn">Copy letter</button>
            </div>
            <p className="mt-4 text-sm text-muted">{result.disclaimer}</p>
          </section>
        </>
      )}
    </>
  );
}
