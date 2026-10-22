// Owner: Track A. Admin area: upload documents, sync GitHub repo, run Junior-ready audit (F9: score 0–100, gaps with evidence, first step, quick wins).
import { useState } from 'react';
import { api } from '../lib/api.js';
import Todo from '../components/Todo.jsx';

export default function Company() {
  const [data, setData] = useState(null);
  const load = async () => setData(await api('/company/audit', { method: 'POST', body: {} }));
  return (
    <>
      <h1 className="text-2xl font-bold">Company</h1>
      <Todo owner="A">Admin area: upload documents, sync GitHub repo, run Junior-ready audit (F9: score 0–100, gaps with evidence, first step, quick wins).</Todo>
      <button type="button" onClick={load} className="rounded border px-3">Load demo data</button>
      {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
