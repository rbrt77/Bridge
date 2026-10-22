// Owner: Track C. F2: issue URL / pasted text → summary, acceptance criteria checklist, micro-steps with minutes, files, Unclear + 'Ask my manager', DoD, Show as diagram, Listen, Save as checklist + .ics.
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { downloadChecklistIcs } from '../lib/ics.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import Todo from '../components/Todo.jsx';
import WorkTabs from '../components/WorkTabs.jsx';
import AudioButton from '../components/AudioButton.jsx';
import VoiceInput from '../components/VoiceInput.jsx';
import TicketResult from '../components/TicketResult.jsx';

const DEMO_ISSUE = 'https://github.com/brightline-software/invoicing-service/issues/142';

// The last decoded ticket survives moving between pages (like Ask), and is gone when the tab closes.
const KEY = 'onramp.ticket';
const restore = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY)) ?? {}; } catch { return {}; }
};
const NO_TICKS = { criteria: [], steps: [] };

const listenText = (d) => [d.summary, 'Steps:', ...d.steps.map((s, i) => `${i + 1}. ${s.text}, about ${s.minutes} minutes.`)].join('\n');

export default function Tickets() {
  const announce = useAnnounce();
  const [kept] = useState(restore);
  const [url, setUrl] = useState(kept.url ?? DEMO_ISSUE);
  const [text, setText] = useState(kept.text ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(kept.data ?? null);
  const [saved, setSaved] = useState(kept.saved ?? null);
  const [ticks, setTicks] = useState(kept.ticks ?? NO_TICKS);
  const [status, setStatus] = useState('');

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ url, text, data, saved, ticks })); } catch { /* private mode */ }
  }, [url, text, data, saved, ticks]);

  const decode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(null);
    setStatus('');
    try {
      const res = await api('/tickets/decode', { method: 'POST', body: text.trim() ? { text } : { issue_url: url } });
      setData(res);
      setTicks(NO_TICKS);
      announce(`Decoded. ${res.steps.length} steps, ${res.unclear.length} unclear points.`);
    } catch (err) {
      setError(err.message);
      announce(err.message, { urgent: true });
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    try {
      const { checklist } = await api('/checklists', { method: 'POST', body: { title: data.title, source_url: text.trim() ? null : url, items: data.steps } });
      setSaved(checklist);
      setStatus(`Saved "${checklist.title}" with ${data.steps.length} steps. It is now in Today.`);
    } catch (err) {
      setStatus(`Could not save the checklist: ${err.message}`);
      announce(`Could not save the checklist: ${err.message}`, { urgent: true });
    }
  };

  return (
    <>
      <WorkTabs /><h1 className="text-2xl font-bold">Ticket Decoder</h1>
      <Todo owner="C">F2: summary, acceptance criteria checklist, steps, files, Unclear + 'Ask my manager', DoD, Show as diagram.</Todo>

      <form onSubmit={decode} className="card mt-6 grid max-w-2xl gap-3">
        <label className="grid gap-1">
          GitHub issue link
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="field min-h-11" />
        </label>
        <label htmlFor="ticket-text">Or paste the ticket text (used instead of the link)</label>
        <textarea id="ticket-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} className="field" />
        <div className="flex flex-wrap gap-2">
          <VoiceInput onText={setText} />
          <button type="submit" disabled={busy || (!url && !text.trim())} className="btn btn-primary">{busy ? 'Decoding…' : 'Decode ticket'}</button>
        </div>
        {error && <p role="alert" className="text-[var(--danger)]">{error}</p>}
      </form>

      {data && (
        <div className="mt-4 flex flex-wrap gap-2">
          <AudioButton text={listenText(data)} />
          <button type="button" onClick={save} disabled={!!saved} className="btn">Save as checklist</button>
          {saved && <button type="button" onClick={() => downloadChecklistIcs(saved.id)} className="btn">Download .ics</button>}
        </div>
      )}
      <p role="status" className="mt-2">{status}</p>
      {data && <TicketResult data={data} sourceUrl={text.trim() ? null : url} saved={saved} ticks={ticks} onTicks={setTicks} />}
    </>
  );
}
