// Owner: Track C. F3: consent banner, upload recording → My tasks (quote, who, minute, ticket, due), decisions, glossary chips, 5-line summary, .ics. Live captions only if time allows.
import { useState } from 'react';
import { api } from '../lib/api.js';
import Todo from '../components/Todo.jsx';

export default function Meetings() {
  const [data, setData] = useState(null);
  const load = async () => setData(await api('/meetings/transcribe', { method: 'POST', form: new FormData() }));
  return (
    <>
      <h1 className="text-2xl font-bold">Meetings</h1>
      <Todo owner="C">F3: consent banner, upload recording → My tasks (quote, who, minute, ticket, due), decisions, glossary chips, 5-line summary, .ics. Live captions only if time allows.</Todo>
      <button type="button" onClick={load} className="rounded border px-3">Load demo data</button>
      {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
