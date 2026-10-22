// Owner: Track C. F4: PR URL → '2 required, 3 optional', grouped by file (ReviewList), Required-only filter, Copy reply.
import { useState } from 'react';
import { api } from '../lib/api.js';
import Todo from '../components/Todo.jsx';
import WorkTabs from '../components/WorkTabs.jsx';
export default function Reviews() {
  const [data, setData] = useState(null);
  const load = async () => setData(await api('/reviews/explain', { method: 'POST', body: { pr_url: 'https://github.com/brightline-software/invoicing-service/pull/57' } }));
  return (
    <>
      <WorkTabs /><h1 className="text-2xl font-bold">Code review helper</h1>
      <Todo owner="C">F4: PR URL → '2 required, 3 optional', grouped by file (ReviewList), Required-only filter, Copy reply.</Todo>
      <button type="button" onClick={load} className="rounded border px-3">Load demo data</button>
      {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
