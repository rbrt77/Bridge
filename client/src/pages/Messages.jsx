// Owner: Track B (F5 UI). Conversations with people: the manager's Help inbox + my own questions + anonymous ones,
// and for managers the anonymous queue (answers become a Team FAQ; nobody, not even the server, knows who asked).
// Lives under Ask (PLAN §5). The open thread is in the URL (?t=id), so Back and links work.
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../lib/api.js';
import { useThreads, readAnon, saveAnon } from '../lib/help.js';
import { useSession, useHasRole } from '../auth/Session.jsx';
import { useAnnounce } from '../a11y/Announcer.jsx';
import AskTabs from '../components/AskTabs.jsx';
import HelpThread from '../components/HelpThread.jsx';

const ANON_POLL_MS = 15_000;
const date = (iso) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Status({ status }) {
  const open = status === 'open';
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2 text-xs font-semibold ${open ? 'bg-accent text-accent-fg' : 'border border-border text-muted'}`}>
      {open ? 'Waiting' : status === 'answered' ? 'Answered' : 'Closed'}
    </span>
  );
}

function ThreadList({ title, id, threads, selected, me }) {
  if (!threads.length) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold">{title} <span className="font-normal text-muted">({threads.length})</span></h2>
      <ul className="mt-2 flex flex-col gap-2">
        {threads.map((t) => (
          <li key={t.id}>
            <Link
              to={`?t=${t.id}`}
              aria-current={selected === t.id ? 'true' : undefined}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-fg no-underline hover:border-accent ${selected === t.id ? 'border-accent bg-accent-soft' : 'border-border-subtle bg-surface'}`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-medium">{t.question}</span>
                <Status status={t.status} />
              </span>
              <span className="text-sm text-muted">
                {t.helper?.id === me ? `From ${t.requester}` : `To ${t.helper?.name}`} · <time dateTime={t.created_at}>{date(t.created_at)}</time>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnonQuestions() {
  const [list, setList] = useState(readAnon);
  const waiting = list.filter((q) => q.status === 'open').length;
  useEffect(() => {
    if (!waiting) return;
    const check = async () => {
      const next = await Promise.all(readAnon().map(async (q) => {
        if (q.status !== 'open') return q;
        try { return { ...q, ...(await api(`/anon/${q.token}`)) }; } catch { return q; }
      }));
      saveAnon(next);
      setList(next);
    };
    check();
    const timer = setInterval(check, ANON_POLL_MS);
    return () => clearInterval(timer);
  }, [waiting]);

  if (!list.length) return null;
  const forget = (token) => { const next = list.filter((q) => q.token !== token); saveAnon(next); setList(next); };
  return (
    <section aria-labelledby="anon-h" className="card mt-8">
      <h2 id="anon-h" className="text-lg font-semibold">Your anonymous questions</h2>
      <p className="text-sm text-muted">Only this browser knows these are yours. Clearing site data removes them for good.</p>
      <ul className="mt-3 flex flex-col gap-3">
        {list.map((q) => (
          <li key={q.token} className="rounded-xl border border-border-subtle p-3">
            <p className="flex items-start justify-between gap-2"><span className="font-medium">{q.question}</span><Status status={q.status} /></p>
            {q.answer && <p className="mt-2 whitespace-pre-wrap">{q.answer}</p>}
            <button type="button" onClick={() => forget(q.token)} className="btn mt-2 text-sm">Forget this question</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnonAnswer({ q, onDone }) {
  const announce = useAnnounce();
  const [answer, setAnswer] = useState('');
  const [state, setState] = useState({ busy: false, error: '' });
  const id = `aq-${q.id}`;
  const publish = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: '' });
    try {
      await api(`/anon/${q.id}/answer`, { method: 'POST', body: { answer } });
      announce('Answered. It is now a Team FAQ, and the person who asked can read it.');
      onDone(q.id);
    } catch (err) {
      setState({ busy: false, error: err.message });
      announce(`Could not publish the answer: ${err.message}`, { urgent: true });
    }
  };
  return (
    <form onSubmit={publish} className="mt-2 grid gap-2">
      <label htmlFor={id} className="font-medium">Your answer</label>
      <textarea id={id} value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} required aria-describedby={`${id}-hint`} className="field" />
      <p id={`${id}-hint`} className="text-sm text-muted">It is saved as a Team FAQ: Ask will use it for everyone, with you as the approver.</p>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      <button type="submit" disabled={state.busy || !answer.trim()} className="btn btn-primary justify-self-start">
        {state.busy ? 'Publishing…' : 'Publish to team FAQ'}
      </button>
    </form>
  );
}

function AnonQueue() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const load = () => api('/anon/queue').then((r) => { setList(r.questions); setError(''); }).catch((e) => setError(e.message));
    load();
    const timer = setInterval(load, ANON_POLL_MS);
    return () => clearInterval(timer);
  }, []);
  const done = (id) => {
    setList((l) => l.filter((q) => q.id !== id));
    setOpen(null);
    document.getElementById('aq-h')?.focus();
  };

  return (
    <section aria-labelledby="aq-h" className="card mt-8">
      <h2 id="aq-h" tabIndex={-1} className="text-lg font-semibold outline-none">
        Anonymous questions for your team {list && <span className="font-normal text-muted">({list.length})</span>}
      </h2>
      <p className="text-sm text-muted">Nobody knows who asked these, not even OnRamp. Your answer becomes a Team FAQ that everyone can find in Ask.</p>
      {error && <p role="alert" className="mt-2 text-danger">Could not load the questions: {error}</p>}
      {list === null && !error && <p className="mt-2 text-muted">Loading…</p>}
      {list?.length === 0 && <p className="mt-3">No open questions. Nice.</p>}
      {list?.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {list.map((q) => (
            <li key={q.id} className="rounded-xl border border-border-subtle p-3">
              <p className="font-medium">{q.question}</p>
              <p className="text-sm text-muted">{q.topic && `Topic: ${q.topic}`}{q.week && ` · week of ${new Date(`${q.week}T00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' })}`}</p>
              {open === q.id
                ? <AnonAnswer q={q} onDone={done} />
                : <button type="button" onClick={() => setOpen(q.id)} className="btn mt-2">Answer<span className="sr-only">: {q.question}</span></button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Messages() {
  const { user } = useSession();
  const me = user?.id;
  const announce = useAnnounce();
  const [params] = useSearchParams();
  const selected = params.get('t');
  const { threads, error, mode } = useThreads({
    userId: me,
    onNew: (fresh) => fresh
      .filter((t) => t.helper?.id === me)
      .forEach((t) => announce(`New question from ${t.requester}: ${t.question}`)),
  });

  // When the user picks a thread, move focus to it (on small screens it opens below the list).
  const picked = useRef(selected);
  useEffect(() => {
    if (!selected || picked.current === selected) return;
    picked.current = selected;
    document.getElementById(`th-${selected}`)?.focus();
  }, [selected, threads]);

  const toMe = threads?.filter((t) => t.helper?.id === me) ?? [];
  const mine = threads?.filter((t) => t.helper?.id !== me) ?? [];
  const thread = threads?.find((t) => t.id === selected);
  const isManager = useHasRole('manager', 'admin');

  return (
    <>
      <AskTabs />
      <h1 className="text-3xl font-bold">Messages</h1>
      <p className="mt-2 text-muted">
        Questions you asked a person, and questions your team asked you. {mode === 'live' ? 'New messages appear by themselves.' : 'Checking for new messages every few seconds.'}
      </p>

      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
      {threads === null && !error && <p role="status" className="mt-6 text-muted">Loading…</p>}
      {threads?.length === 0 && (
        <div className="card mt-6">
          <p>No conversations yet. When Ask can&apos;t find an answer in the team docs, you can ask a person from there.</p>
          <p className="mt-3"><Link to="/ask" className="btn btn-primary">Ask the docs</Link></p>
        </div>
      )}

      {threads?.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <ThreadList id="to-me-h" title="Questions to you" threads={toMe} selected={selected} me={me} />
            <ThreadList id="mine-h" title="Your questions" threads={mine} selected={selected} me={me} />
          </div>
          <div className="card">
            {thread ? <HelpThread key={thread.id} thread={thread} headingLevel={2} /> : <p className="text-muted">Pick a conversation to read it and reply.</p>}
          </div>
        </div>
      )}

      {isManager && <AnonQueue />}
      <AnonQuestions />
    </>
  );
}
