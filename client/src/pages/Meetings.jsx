// Owner: Track C. F3: consent banner, upload recording → My tasks (quote, who, minute, ticket, due), decisions, glossary chips, 5-line summary, .ics.
// Live: captions for a meeting in another tab or in the room; ending it sends the in-memory recording through the same flow.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.js';
import { downloadIcs } from '../lib/ics.js';
import { decisionsText, saveTicks, withDone } from '../lib/meetingNotes.js';
import { useSession } from '../auth/Session.jsx';
import { useAnnounce } from '../a11y/Announcer.jsx';
import GlossaryTerm from '../components/GlossaryTerm.jsx';
import AudioButton from '../components/AudioButton.jsx';
import Captions from '../components/Captions.jsx';
import MeetingTaskList, { tasksText } from '../components/MeetingTaskList.jsx';

const MAX_MB = 500; // same as the server's upload limit
const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time (toISOString is UTC: wrong date after midnight)
const sizeLabel = (bytes) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`);

export default function Meetings() {
  const { member } = useSession();
  const announce = useAnnounce();
  const [file, setFile] = useState(null);
  const [me, setMe] = useState(member?.name ?? '');
  const [date, setDate] = useState(today);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  const last = useRef(null); // { audio, agreed, noteId } of the last run, for "Run again with these names"
  const results = useRef(null);

  useEffect(() => {
    if (data) results.current?.scrollIntoView({ block: 'start' });
  }, [data]);

  const run = async ({ audio, agreed, noteId, fixedSpeakers }) => {
    last.current = { audio, agreed, noteId };
    const form = new FormData();
    form.append('audio', audio);
    form.append('me', me);
    form.append('consent', String(agreed));
    form.append('meeting_date', date);
    if (noteId) form.append('note_id', noteId); // a live meeting, or a run again: update that row in Today, no duplicate
    if (fixedSpeakers) form.append('speakers', JSON.stringify(fixedSpeakers));
    setBusy(true);
    setError('');
    announce('Listening to the recording. This takes about 20 seconds.');
    try {
      const res = await api('/meetings/transcribe', { method: 'POST', form });
      setData(res);
      setSpeakers(res.speakers);
      last.current.noteId = res.note_id ?? noteId;
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
    run({ audio: file, agreed: consent });
  };
  const withDue = data?.my_tasks.filter((t) => t.due && !t.done) ?? [];

  const toggle = async (_t, done, index) => {
    const before = data;
    const myTasks = withDone(data.my_tasks, index, done);
    setData({ ...data, my_tasks: myTasks });
    try {
      await saveTicks(data.note_id, myTasks);
    } catch (e) {
      setData(before);
      announce(`Could not save that tick: ${e.message}`, { urgent: true });
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold">Meetings</h1>
      <p className="text-muted">Follow a meeting live with captions, or turn a recording into your own task list.</p>

      <div className="mt-6"><Captions me={me} date={date} onFinish={(recording, noteId) => run({ audio: recording, agreed: true, noteId })} /></div>
      {busy && <p className="card mt-6">Turning the meeting into your tasks…</p>}

      <form onSubmit={submit} aria-labelledby="upload-h" className="card mt-6 grid gap-4">
        <h2 id="upload-h" className="text-xl font-semibold">Upload a recording</h2>
        <p className="text-muted">An audio or video file of a meeting that already happened. You get the same tasks, decisions and summary.</p>
        <div role="note" className="rounded-lg border border-accent bg-[var(--accent-soft)] p-3">
          <p className="font-semibold">Ask before you record</p>
          <p>Everyone in the meeting must agree to be recorded. The recording and the transcript are not saved: only your tasks, the decisions and the summary are kept.</p>
        </div>
        <label className="inline-flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="size-5" required />
          Everyone in the recording agreed to it
        </label>
        <div className="grid gap-1">
          <p id="file-hint" className="text-muted">Audio or video: mp3, m4a, wav, mp4, mov or webm, up to {MAX_MB} MB.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid">
              <input
                type="file"
                accept="audio/*,video/*"
                aria-describedby="file-hint file-name"
                onChange={(e) => setFile(e.target.files[0] ?? null)}
                className="sr-only"
              />
              {file ? 'Choose another recording' : 'Choose a recording'}
            </label>
            <span id="file-name" className={`min-w-0 ${file ? '' : 'text-muted'}`}>
              {file ? `${file.name} · ${sizeLabel(file.size)}` : 'No file chosen yet'}
            </span>
          </div>
          {file?.size > MAX_MB * 1024 ** 2 && <p role="alert" className="text-[var(--danger)]">This file is over {MAX_MB} MB. Cut it or export only the audio.</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            Your first name, as people say it in the meeting
            <input value={me} onChange={(e) => setMe(e.target.value)} className="field min-h-11" required />
          </label>
          <label className="grid gap-1">
            Meeting date (for "by Thursday")
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field min-h-11" required />
          </label>
        </div>
        <button type="submit" disabled={busy || !consent || !file || file.size > MAX_MB * 1024 ** 2} className="btn btn-primary justify-self-start">
          {busy ? 'Working…' : 'Get my tasks'}
        </button>
        {error && <p role="alert" className="text-[var(--danger)]">{error}</p>}
      </form>

      {data && (
        <div ref={results} className="mt-8 grid scroll-mt-4 gap-6">
          <section aria-labelledby="tasks-h" className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="tasks-h" className="text-xl font-semibold">My tasks</h2>
              {data.my_tasks.length > 0 && <AudioButton text={tasksText(data.my_tasks)} label="Listen to my tasks" />}
            </div>
            {data.my_tasks.length === 0 ? (
              <p className="mt-2">No tasks for {me} in this meeting.</p>
            ) : (
              <div className="mt-2"><MeetingTaskList tasks={data.my_tasks} onToggle={toggle} /></div>
            )}
            {data.note_id && data.my_tasks.length > 0 && <p className="mt-2 text-muted">Saved in <Link to="/today">Today</Link>, with your ticks.</p>}
            {withDue.length > 0 && (
              <button type="button" className="btn mt-4" onClick={() => downloadIcs(withDue.map((t) => ({ date: t.due, what: t.task })), 'meeting-tasks.ics')}>
                Add deadlines to my calendar (.ics)
              </button>
            )}
          </section>

          <section aria-labelledby="dec-h" className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="dec-h" className="text-xl font-semibold">Decisions</h2>
              {data.decisions.length > 0 && <AudioButton text={decisionsText(data.decisions)} label="Listen to decisions" />}
            </div>
            {data.decisions.length === 0 && <p className="mt-2">No decisions in this meeting.</p>}
            <ul className="mt-3 list-disc pl-5">
              {data.decisions.map((d) => (
                <li key={d.text}>
                  {d.text}{d.affects_me && <strong> (affects you)</strong>}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="sum-h" className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="sum-h" className="text-xl font-semibold">Summary</h2>
              <AudioButton text={data.summary.join('\n')} label="Listen to summary" />
            </div>
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
            <button type="button" className="btn mt-4" disabled={busy} onClick={() => run({ ...last.current, fixedSpeakers: speakers })}>Run again with these names</button>
          </section>
        </div>
      )}
    </>
  );
}
