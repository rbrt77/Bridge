// Owner: Track C. F3: consent banner, upload recording → My tasks (quote, who, minute, ticket, due), decisions, glossary chips, 5-line summary, .ics. Live captions only if time allows.
import { useState } from 'react';
import { api } from '../lib/api.js';
import { downloadIcs } from '../lib/ics.js';
import { useSession } from '../auth/Session.jsx';
import { useAnnounce } from '../a11y/Announcer.jsx';
import GlossaryTerm from '../components/GlossaryTerm.jsx';

export default function Meetings() {
  const { member } = useSession();
  const announce = useAnnounce();
  const [file, setFile] = useState(null);
  const [me, setMe] = useState(member?.name ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [speakers, setSpeakers] = useState([]);

  const run = async (fixedSpeakers) => {
    const form = new FormData();
    form.append('audio', file);
    form.append('me', me);
    form.append('consent', String(consent));
    form.append('meeting_date', date);
    if (fixedSpeakers) form.append('speakers', JSON.stringify(fixedSpeakers));
    setBusy(true);
    setError('');
    announce('Listening to the recording. This takes about 20 seconds.');
    try {
      const res = await api('/meetings/transcribe', { method: 'POST', form });
      setData(res);
      setSpeakers(res.speakers);
      announce(`Done. You have ${res.my_tasks.length} task${res.my_tasks.length === 1 ? '' : 's'} from this meeting.`);
    } catch (e) {
      setError(e.message);
      announce(e.message, { urgent: true });
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    run();
  };
  const withDue = data?.my_tasks.filter((t) => t.due) ?? [];

  return (
    <>
      <h1 className="text-3xl font-bold">Meetings</h1>
      <p className="text-muted">Turn a meeting recording into your own task list.</p>

      <form onSubmit={submit} className="card mt-6 grid max-w-xl gap-4">
        <div role="note" className="rounded-lg border border-accent bg-[var(--accent-soft)] p-3">
          <p className="font-semibold">Ask before you record</p>
          <p>Everyone in the meeting must agree to be recorded. The recording and the transcript are not saved: only your tasks, the decisions and the summary are kept.</p>
        </div>
        <label className="inline-flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="size-5" required />
          Everyone in the recording agreed to it
        </label>
        <label className="grid gap-1">
          Recording (mp3, m4a, wav)
          <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files[0] ?? null)} className="field py-2" required />
        </label>
        <label className="grid gap-1">
          Your first name, as people say it in the meeting
          <input value={me} onChange={(e) => setMe(e.target.value)} className="field min-h-11" required />
        </label>
        <label className="grid gap-1">
          Meeting date (for "by Thursday")
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field min-h-11" required />
        </label>
        <button type="submit" disabled={busy || !consent || !file} className="btn btn-primary justify-self-start">
          {busy ? 'Working…' : 'Get my tasks'}
        </button>
        {error && <p role="alert" className="text-[var(--danger)]">{error}</p>}
      </form>

      {data && (
        <div className="mt-8 grid gap-6">
          <section aria-labelledby="tasks-h" className="card">
            <h2 id="tasks-h" className="text-xl font-semibold">My tasks</h2>
            {data.my_tasks.length === 0 && <p>No tasks for {me} in this meeting.</p>}
            <ul className="mt-3 grid gap-4">
              {data.my_tasks.map((t) => (
                <li key={`${t.minute}-${t.task}`} className="border-l-4 border-accent pl-3">
                  <p className="font-semibold">{t.task}</p>
                  <p>
                    {t.due ? `Due ${t.due}` : 'No deadline'}{t.ticket && ` · Ticket ${t.ticket}`}
                  </p>
                  <p className="text-muted">
                    {t.who} at {t.minute}: <q>{t.quote}</q>
                  </p>
                </li>
              ))}
            </ul>
            {withDue.length > 0 && (
              <button type="button" className="btn mt-4" onClick={() => downloadIcs(withDue.map((t) => ({ date: t.due, what: t.task })), 'meeting-tasks.ics')}>
                Add deadlines to my calendar (.ics)
              </button>
            )}
          </section>

          <section aria-labelledby="dec-h" className="card">
            <h2 id="dec-h" className="text-xl font-semibold">Decisions</h2>
            <ul className="mt-3 list-disc pl-5">
              {data.decisions.map((d) => (
                <li key={d.text}>
                  {d.text}{d.affects_me && <strong> (affects you)</strong>}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="sum-h" className="card">
            <h2 id="sum-h" className="text-xl font-semibold">Summary</h2>
            <ul className="mt-3 list-disc pl-5">
              {data.summary.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </section>

          {data.glossary_terms.length > 0 && (
            <section aria-labelledby="terms-h" className="card">
              <h2 id="terms-h" className="text-xl font-semibold">Terms you may not know</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.glossary_terms.map((term) => <li key={term}><GlossaryTerm term={term} /></li>)}
              </ul>
            </section>
          )}

          <section aria-labelledby="spk-h" className="card">
            <h2 id="spk-h" className="text-xl font-semibold">Who said what</h2>
            <p className="text-muted">If a name is wrong, fix it and run again. The recording is sent once more.</p>
            <div className="mt-3 grid max-w-sm gap-2">
              {speakers.map((s, i) => (
                <label key={s.label} className="grid grid-cols-[8rem_1fr] items-center gap-2">
                  Voice {i + 1}
                  <input
                    value={s.name}
                    onChange={(e) => setSpeakers(speakers.map((x) => (x.label === s.label ? { ...x, name: e.target.value } : x)))}
                    className="field min-h-11"
                  />
                </label>
              ))}
            </div>
            <button type="button" className="btn mt-4" disabled={busy} onClick={() => run(speakers)}>Run again with these names</button>
          </section>
        </div>
      )}
    </>
  );
}
