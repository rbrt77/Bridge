// Owner: Track B. Checklists from F2, meeting tasks from F3, reminders, standup draft (F12 SHOULD).
import { useState } from 'react';
import { api } from '../lib/api.js';
import Todo from '../components/Todo.jsx';

export default function Today() {
  const [data, setData] = useState(null);
  const load = async () => setData(await api('/checklists'));
  return (
    <>
      <h1 className="text-2xl font-bold">Today</h1>
      <Todo owner="B">Checklists from F2, meeting tasks from F3, reminders, standup draft (F12 SHOULD).</Todo>
      <button type="button" onClick={load} className="rounded border px-3">Load demo data</button>
      {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
