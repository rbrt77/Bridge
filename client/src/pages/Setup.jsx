// Owner: Track C. F10 (SHOULD): one step per screen — command (copy + audio), what you should see, what to do if it fails, paste error → fix with source.
import { useState } from 'react';
import { api } from '../lib/api.js';
import Todo from '../components/Todo.jsx';
import WorkTabs from '../components/WorkTabs.jsx';
export default function Setup() {
  const [data, setData] = useState(null);
  const load = async () => setData(await api('/setup/step', { method: 'POST', body: { step_index: 0 } }));
  return (
    <>
      <WorkTabs /><h1 className="text-2xl font-bold">Local setup</h1>
      <Todo owner="C">F10 (SHOULD): one step per screen — command (copy + audio), what you should see, what to do if it fails, paste error → fix with source.</Todo>
      <button type="button" onClick={load} className="rounded border px-3">Load demo data</button>
      {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
