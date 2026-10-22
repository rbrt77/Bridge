// Owner: Track C. F2: issue URL / pasted text → summary, acceptance criteria checklist, micro-steps with minutes, files, Unclear + 'Ask my manager', DoD, Show as diagram, Listen, Save as checklist + .ics.
import { useState } from 'react';
import { api } from '../lib/api.js';
import { downloadChecklistIcs } from '../lib/ics.js';
import Todo from '../components/Todo.jsx';
import WorkTabs from '../components/WorkTabs.jsx';

const DEMO_ISSUE = 'https://github.com/brightline-software/invoicing-service/issues/142';

export default function Tickets() {
  const [data, setData] = useState(null);
  const [saved, setSaved] = useState(null);
  const [status, setStatus] = useState('');
  const load = async () => {
    setSaved(null);
    setData(await api('/tickets/decode', { method: 'POST', body: { issue_url: DEMO_ISSUE } }));
  };
  const save = async () => {
    const { checklist } = await api('/checklists', { method: 'POST', body: { title: data.title, source_url: DEMO_ISSUE, items: data.steps } });
    setSaved(checklist);
    setStatus(`Saved "${checklist.title}" with ${data.steps.length} steps. It is now in Today.`);
  };
  return (
    <>
      <WorkTabs /><h1 className="text-2xl font-bold">Ticket Decoder</h1>
      <Todo owner="C">F2: issue URL / pasted text → summary, acceptance criteria checklist, micro-steps with minutes, files, Unclear + 'Ask my manager', DoD, Show as diagram, Listen.</Todo>
      <button type="button" onClick={load} className="rounded border px-3">Load demo data</button>
      {data && (
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={save} disabled={!!saved} className="rounded border px-3">Save as checklist</button>
          {saved && <button type="button" onClick={() => downloadChecklistIcs(saved.id)} className="rounded border px-3">Download .ics</button>}
        </div>
      )}
      <p role="status" className="mt-2">{status}</p>
      {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
