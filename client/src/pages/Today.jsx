// Owner: Track B. Checklists from F2, meeting tasks from F3, reminders, standup draft (F12 SHOULD).
import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.js';
import { useSession } from '../auth/Session.jsx';
import Todo from '../components/Todo.jsx';

const SHORTCUTS = [
  { to: '/ask', title: 'Ask the team docs', text: 'Get an answer with the sources it came from.' },
  { to: '/work', title: 'Work', text: 'Tickets, reviews and setup, explained step by step.' },
  { to: '/meetings', title: 'Meetings', text: 'Turn a recording into your own task list.' },
  { to: '/work-style', title: 'Your work style', text: 'Change text, contrast and how answers are written.' },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Today() {
  const { member } = useSession();
  const [data, setData] = useState(null);
  const load = async () => setData(await api('/checklists'));
  return (
    <>
      <p className="text-muted">{greeting()}{member?.name ? `, ${member.name}` : ''}</p>
      <h1 className="text-3xl font-bold">Today</h1>

      <section aria-labelledby="go-h" className="mt-8">
        <h2 id="go-h" className="text-xl font-semibold">Where to start</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {SHORTCUTS.map((s) => (
            <li key={s.to}>
              <Link to={s.to} className="card group flex h-full flex-col gap-1 text-fg no-underline hover:border-accent">
                <span className="font-semibold text-accent group-hover:underline">{s.title}</span>
                <span className="text-muted">{s.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="day-h" className="card mt-8">
        <h2 id="day-h" className="text-xl font-semibold">Your checklist</h2>
        <Todo owner="B">Checklists from F2, meeting tasks from F3, reminders, standup draft (F12 SHOULD).</Todo>
        <button type="button" onClick={load} className="btn">Load demo data</button>
        {data && <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>}
      </section>
    </>
  );
}
