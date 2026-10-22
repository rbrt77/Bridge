// Owner: Track C + D. F7: pick needs → adjustments with source + how to ask → editable letter (needs only) → send via help chat / copy / email. Disclaimer: informational, not legal advice.
import { useState } from 'react';
import { api } from '../lib/api.js';
import Todo from '../components/Todo.jsx';

export default function Support() {
  const [data, setData] = useState(null);
  const load = async () => setData(await api('/adjustments/advise', { method: 'POST', body: { need_ids: ['fast-standups', 'unclear-tickets'] } }));
  return (
    <>
      <h1 className="text-2xl font-bold">Support and adjustments</h1>
      <Todo owner="C + D">F7: pick needs → adjustments with source + how to ask → editable letter (needs only) → send via help chat / copy / email. Disclaimer: informational, not legal advice.</Todo>
      <button type="button" onClick={load} className="rounded border px-3">Load demo data</button>
      {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
