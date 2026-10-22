// Owner: Track A. F13 (SHOULD): anonymous themes, only groups ≥ 5, 'seed data' label.
import { useState } from 'react';
import { api } from '../lib/api.js';
import Todo from '../components/Todo.jsx';

export default function Insights() {
  const [data, setData] = useState(null);
  const load = async () => setData(await api('/company/insights'));
  return (
    <>
      <h1 className="text-2xl font-bold">Insights</h1>
      <Todo owner="A">F13 (SHOULD): anonymous themes, only groups ≥ 5, 'seed data' label.</Todo>
      <button type="button" onClick={load} className="rounded border px-3">Load demo data</button>
      {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
