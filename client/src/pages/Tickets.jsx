// Owner: Track C. F2: issue URL / pasted text → summary, acceptance criteria checklist, micro-steps with minutes, files, Unclear + 'Ask my manager', DoD, Show as diagram, Listen, Save as checklist + .ics.
import { useState } from 'react';
import { api } from '../lib/api.js';
import Todo from '../components/Todo.jsx';
import WorkTabs from '../components/WorkTabs.jsx';
export default function Tickets() {
  const [data, setData] = useState(null);
  const load = async () => setData(await api('/tickets/decode', { method: 'POST', body: { issue_url: 'https://github.com/brightline-software/invoicing-service/issues/142' } }));
  return (
    <>
      <WorkTabs /><h1 className="text-2xl font-bold">Ticket Decoder</h1>
      <Todo owner="C">F2: issue URL / pasted text → summary, acceptance criteria checklist, micro-steps with minutes, files, Unclear + 'Ask my manager', DoD, Show as diagram, Listen, Save as checklist + .ics.</Todo>
      <button type="button" onClick={load} className="rounded border px-3">Load demo data</button>
      {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
