// Owner: Track B. Today: checklists saved from tickets (F2), my tasks from recent meetings (F3), standup draft (F12 SHOULD).
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabaseClient.js';
import { downloadChecklistIcs, downloadIcs } from '../lib/ics.js';
import { useSession } from '../auth/Session.jsx';
import { useAnnounce } from '../a11y/Announcer.jsx';
import Checklist from '../components/Checklist.jsx';
import { GlossaryText } from '../components/GlossaryTerm.jsx';

const MEETING_DAYS = 14;
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
const dueLabel = (iso) => {
  const days = Math.round((new Date(`${iso}T00:00`) - new Date(new Date().toDateString())) / 86_400_000);
  const date = new Date(`${iso}T00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return days < 0 ? `overdue since ${date}` : days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : `due ${date}`;
};

function SavedChecklist({ list, onChange, onDelete }) {
  const announce = useAnnounce();
  const [confirm, setConfirm] = useState(false);
  const toggle = async (item, done) => {
    onChange({ ...list, items: list.items.map((it) => (it.id === item.id ? { ...it, done } : it)) });
    try {
      await api(`/checklists/${list.id}/items/${item.id}`, { method: 'PATCH', body: { done } });
      if (done && list.items.every((it) => it.id === item.id || it.done)) announce(`All done: ${list.title}. Well done.`);
    } catch (e) {
      onChange(list);
      announce(`Could not save that tick: ${e.message}`, { urgent: true });
    }
  };
  return (
    <li className="card">
      <Checklist title={list.title} items={list.items} onToggle={toggle} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {list.source_url && <a href={list.source_url} target="_blank" rel="noreferrer" className="btn">Open ticket<span className="sr-only"> (opens in a new tab)</span></a>}
        <button type="button" onClick={() => downloadChecklistIcs(list.id, 'checklist.ics').catch((e) => announce(e.message, { urgent: true }))} className="btn">Plan in my calendar (.ics)</button>
        {confirm ? (
          <span role="group" aria-label={`Delete ${list.title}?`} className="flex flex-wrap items-center gap-2">
            <span>Delete this checklist?</span>
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- focus must move into the confirmation it just opened */}
            <button type="button" autoFocus onClick={() => onDelete(list)} className="btn border-danger bg-danger text-surface">Yes, delete</button>
            <button type="button" onClick={() => setConfirm(false)} className="btn">Cancel</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="btn btn-danger">Delete</button>
        )}
      </div>
    </li>
  );
}

function Checklists() {
  const announce = useAnnounce();
  const [lists, setLists] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/checklists').then((r) => setLists(r.checklists)).catch((e) => setError(e.message));
  }, []);
  const update = (next) => setLists((ls) => ls.map((l) => (l.id === next.id ? next : l)));
  const remove = async (list) => {
    try {
      await api(`/checklists/${list.id}`, { method: 'DELETE' });
      setLists((ls) => ls.filter((l) => l.id !== list.id));
      announce(`Deleted ${list.title}.`);
      document.getElementById('cl-h')?.focus();
    } catch (e) {
      announce(e.message, { urgent: true });
    }
  };

  return (
    <section aria-labelledby="cl-h" className="mt-8">
      <h2 id="cl-h" tabIndex={-1} className="text-xl font-semibold outline-none">Your checklists</h2>
      {error && <p role="alert" className="mt-2 text-danger">Could not load your checklists: {error}</p>}
      {lists === null && !error && <p className="mt-2 text-muted">Loading…</p>}
      {lists?.length === 0 && (
        <p className="card mt-3">
          Nothing here yet. Open a ticket in <Link to="/work/tickets">Work → Tickets</Link>, press <strong>Decode ticket</strong>, then <strong>Save as checklist</strong>.
        </p>
      )}
      {lists?.length > 0 && <ul className="mt-3 flex flex-col gap-4">{lists.map((l) => <SavedChecklist key={l.id} list={l} onChange={update} onDelete={remove} />)}</ul>}
    </section>
  );
}

function MeetingTasks() {
  const { mode, user } = useSession();
  const [tasks, setTasks] = useState(null);
  useEffect(() => {
    if (mode !== 'supabase' || !user) return setTasks([]);
    const since = new Date(Date.now() - MEETING_DAYS * 86_400_000).toISOString();
    // Owner-only RLS on meeting_notes: the browser reads its own rows directly (no transcript is ever stored).
    supabase.from('meeting_notes').select('title, my_tasks, created_at').eq('user_id', user.id).gte('created_at', since).order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setTasks((data ?? []).flatMap((n) => (n.my_tasks ?? []).map((t) => ({ ...t, meeting: n.title })))
        .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))));
  }, [mode, user]);

  if (!tasks) return null;
  const withDue = tasks.filter((t) => t.due);
  return (
    <section aria-labelledby="mt-h" className="mt-8">
      <h2 id="mt-h" className="text-xl font-semibold">From your meetings</h2>
      {tasks.length === 0 ? (
        <p className="card mt-3">No tasks from meetings in the last two weeks. Upload a recording in <Link to="/meetings">Meetings</Link> and your tasks show up here.</p>
      ) : (
        <div className="card mt-3">
          <ul className="flex flex-col gap-4">
            {tasks.map((t) => (
              <li key={`${t.meeting}-${t.minute}-${t.task}`} className="border-l-4 border-accent pl-3">
                <p className="font-semibold"><GlossaryText text={t.task} /></p>
                <p className="text-sm">{t.due ? dueLabel(t.due) : 'No deadline'}{t.ticket && ` · Ticket ${t.ticket}`}{t.meeting && ` · ${t.meeting}`}</p>
                {t.quote && <p className="text-sm text-muted">{t.who}{t.minute && ` at ${t.minute}`}: <q>{t.quote}</q></p>}
              </li>
            ))}
          </ul>
          {withDue.length > 0 && (
            <button type="button" onClick={() => downloadIcs(withDue.map((t) => ({ date: t.due, what: t.task })), 'meeting-tasks.ics')} className="btn mt-4">
              Add deadlines to my calendar (.ics)
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Standup() {
  const announce = useAnnounce();
  const [draft, setDraft] = useState(null);
  const [state, setState] = useState({ busy: false, error: '', note: '' });
  const make = async () => {
    setState({ busy: true, error: '', note: '' });
    try {
      setDraft(await api('/standup/draft', { method: 'POST', body: {} }));
      setState({ busy: false, error: '', note: '' });
      announce('Standup draft ready. You can edit it.');
    } catch (e) {
      setState({ busy: false, error: e.message, note: '' });
    }
  };
  const text = draft && `Yesterday: ${draft.yesterday}\nToday: ${draft.today}\nBlockers: ${draft.blockers}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState((s) => ({ ...s, note: 'Copied.' })); } catch { setState((s) => ({ ...s, note: 'Copy failed. Select the text and copy it by hand.' })); }
  };
  const post = async () => {
    setState((s) => ({ ...s, busy: true, error: '', note: '' }));
    try {
      await api('/standup/post-slack', { method: 'POST', body: draft });
      setState({ busy: false, error: '', note: 'Posted to Slack.' });
    } catch (e) {
      setState({ busy: false, error: e.message, note: '' });
    }
  };
  const field = (name, label) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`su-${name}`} className="font-medium">{label}</label>
      <textarea id={`su-${name}`} rows={2} value={draft[name]} onChange={(e) => setDraft((d) => ({ ...d, [name]: e.target.value }))} className="field" />
    </div>
  );

  return (
    <section aria-labelledby="su-h" className="card mt-8">
      <h2 id="su-h" className="text-xl font-semibold">Standup</h2>
      <p className="text-muted">A draft from your ticked steps and meeting tasks. Edit it before you share it; nothing is sent on its own.</p>
      {!draft && <button type="button" onClick={make} disabled={state.busy} className="btn mt-3">{state.busy ? 'Writing…' : 'Draft my standup'}</button>}
      {draft && (
        <div className="mt-3 flex flex-col gap-3">
          {field('yesterday', 'Yesterday')}
          {field('today', 'Today')}
          {field('blockers', 'Blockers')}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="btn">Copy</button>
            <button type="button" onClick={post} disabled={state.busy} className="btn btn-primary">Post to Slack</button>
            <button type="button" onClick={make} disabled={state.busy} className="btn">Write it again</button>
          </div>
        </div>
      )}
      {state.error && <p role="alert" className="mt-2 text-danger">{state.error}</p>}
      <p role="status" className="mt-2 text-sm">{state.note}</p>
    </section>
  );
}

export default function Today() {
  const { member } = useSession();
  return (
    <>
      <p className="text-muted">{greeting()}{member?.name ? `, ${member.name}` : ''}</p>
      <h1 className="text-3xl font-bold">Today</h1>

      <Checklists />
      <MeetingTasks />
      <Standup />

      <section aria-labelledby="go-h" className="mt-10">
        <h2 id="go-h" className="text-xl font-semibold">Shortcuts</h2>
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
    </>
  );
}
