// Owner: Track B. F6 page: searchable list of terms with definition, source and Listen.
import { useState } from 'react';
import { api } from '../lib/api.js';
import Todo from '../components/Todo.jsx';

export default function Glossary() {
  const [data, setData] = useState(null);
  const load = async () => setData(await api('/glossary'));
  return (
    <>
      <h1 className="text-2xl font-bold">Glossary</h1>
      <Todo owner="B">F6 page: searchable list of terms with definition, source and Listen.</Todo>
      <button type="button" onClick={load} className="rounded border px-3">Load demo data</button>
      {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
