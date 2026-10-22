// Owner: Track C (F3 live, only if time allows). Large live captions via Web Speech + "What did I miss?".
// Captions stay in this component's memory; only "What did I miss?" sends the last minutes to the server, which stores nothing.
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { createRecognizer } from '../lib/speech.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import AudioButton from './AudioButton.jsx';

const SIZES = { L: 'text-2xl', XL: 'text-3xl', XXL: 'text-5xl' };
const MAX_SEGMENTS = 600;
const supported = () => !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);

export default function Captions() {
  const announce = useAnnounce();
  const [live, setLive] = useState(false);
  const [segments, setSegments] = useState([]); // { at: ms, text }
  const [interim, setInterim] = useState('');
  const [size, setSize] = useState('XL');
  const [minutes, setMinutes] = useState(3);
  const [missed, setMissed] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rec = useRef(null);
  const active = useRef(false);
  const end = useRef(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [segments, interim]);
  useEffect(() => () => stop(), []);

  const listen = () => {
    rec.current = createRecognizer({
      continuous: true,
      onFinal: (text) => text && setSegments((s) => [...s.slice(-MAX_SEGMENTS + 1), { at: Date.now(), text }]),
      onInterim: setInterim,
      onError: (code) => {
        if (code === 'no-speech' || code === 'aborted') return;
        stop();
        const msg = code === 'not-allowed' ? 'Allow microphone access to see live captions.' : `Live captions stopped (${code}).`;
        setError(msg);
        announce(msg, { urgent: true });
      },
      // The browser stops after a silence; keep going while the user has captions on.
      onEnd: () => active.current && listen(),
    });
    rec.current.start();
  };

  const start = () => {
    setError('');
    active.current = true;
    setLive(true);
    listen();
    announce('Live captions on.');
  };
  function stop() {
    active.current = false;
    rec.current?.stop();
    rec.current = null;
    setLive(false);
    setInterim('');
  }

  const catchUp = async () => {
    const since = Date.now() - minutes * 60_000;
    const text = segments.filter((s) => s.at >= since).map((s) => s.text).join('\n');
    if (!text) return setMissed(`Nothing was said in the last ${minutes} minutes.`);
    setBusy(true);
    try {
      const { summary } = await api('/meetings/catch-up', { method: 'POST', body: { last_minutes_text: text } });
      setMissed(summary);
      announce(summary);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!supported()) {
    return <p className="card">Live captions need Chrome or Safari. You can still upload the recording after the meeting.</p>;
  }

  return (
    <section aria-labelledby="live-h" className="card grid gap-4">
      <h2 id="live-h" className="text-xl font-semibold">Live captions</h2>
      <p className="text-muted">Tell the others you are using captions. They stay on this device and are not saved.</p>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`btn ${live ? '' : 'btn-primary'}`} aria-pressed={live} onClick={live ? stop : start}>
          {live ? 'Stop captions' : 'Start captions'}
        </button>
        <fieldset className="inline-flex items-center gap-1">
          <legend className="sr-only">Caption size</legend>
          {Object.keys(SIZES).map((k) => (
            <label key={k} className={`btn ${size === k ? 'border-accent' : ''}`}>
              <input type="radio" name="caption-size" value={k} checked={size === k} onChange={() => setSize(k)} className="sr-only" />
              {k}
            </label>
          ))}
        </fieldset>
      </div>

      <div role="log" aria-live="off" aria-label="Live captions" className={`max-h-80 overflow-y-auto rounded-lg border border-[var(--border)] p-4 leading-snug ${SIZES[size]}`}>
        {segments.length === 0 && !interim && <p className="text-muted">{live ? 'Listening…' : 'Captions will appear here.'}</p>}
        {segments.slice(-30).map((s, i) => <p key={`${s.at}-${i}`}>{s.text}</p>)}
        {interim && <p className="text-muted">{interim}</p>}
        <span ref={end} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2">
          Last
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="field min-h-11">
            {[1, 3, 5, 10].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <button type="button" className="btn" disabled={busy || segments.length === 0} onClick={catchUp}>
          {busy ? 'Summarising…' : 'What did I miss?'}
        </button>
      </div>
      {missed && (
        <div className="rounded-lg border-l-4 border-accent pl-3">
          <p>{missed}</p>
          <AudioButton text={missed} />
        </div>
      )}
      {error && <p role="alert" className="text-[var(--danger)]">{error}</p>}
    </section>
  );
}
