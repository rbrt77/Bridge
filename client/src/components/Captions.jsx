// Owner: Track C (F3 live). Large live captions for a meeting in another tab (Meet, Teams, Slack, Zoom on the web) or in the room,
// a floating caption window over the meeting, "What did I miss?", "Summary so far", "My tasks so far" and "End meeting → my tasks".
// Captions stay in this component's memory. Summary and tasks are saved to one meeting_notes row (shown in Today), never the captions.
// The whole recording is only handed to the page when the person ends the meeting for tasks.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { api } from '../lib/api.js';
import { decisionsText, saveTicks, withDone } from '../lib/meetingNotes.js';
import { transcribeOnServer } from '../lib/speech.js';
import { canCaptureRoom, canCaptureTab, extensionFor, startCapture } from '../lib/meetingCapture.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import AudioButton from './AudioButton.jsx';
import GlossaryTerm from './GlossaryTerm.jsx';
import MeetingTaskList, { tasksText } from './MeetingTaskList.jsx';

const SIZES = { L: 'text-2xl', XL: 'text-3xl', XXL: 'text-5xl' };
const MAX_SEGMENTS = 600;
const SOURCES = {
  tab: { label: 'Online meeting in another tab', hint: 'Meet, Teams, Slack or Zoom open in Chrome or Edge. Pick the meeting tab and turn on "Also share tab audio".' },
  room: { label: 'Meeting in this room', hint: 'Uses your microphone.' },
};
const canFloat = () => 'documentPictureInPicture' in window;
const mmss = (ms) => `${String(Math.floor(ms / 60_000)).padStart(2, '0')}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Lines({ segments, live, size, className = '' }) {
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [segments]);
  return (
    <div role="log" aria-live="off" aria-label="Live captions" className={`overflow-y-auto leading-snug ${SIZES[size]} ${className}`}>
      {segments.length === 0 && <p className="text-muted">{live ? 'Listening… Captions show up a few seconds after people speak.' : 'Captions will appear here.'}</p>}
      {segments.slice(-30).map((s, i) => <p key={`${s.at}-${i}`}>{s.text}</p>)}
      <span ref={end} />
    </div>
  );
}

/** What the last button showed: the catch-up, the summary and decisions so far, or my tasks so far. `compact` = the floating window. */
function Panel({ panel, missed, notes, onToggle, compact }) {
  if (panel === 'missed') {
    return (
      <div className="grid gap-2">
        <p>{missed}</p>
        {!compact && <AudioButton text={missed} />}
      </div>
    );
  }
  if (!notes) return null;
  if (panel === 'summary') {
    return (
      <div className="grid gap-2">
        <ul className="list-disc pl-5">{notes.summary.map((line) => <li key={line}>{line}</li>)}</ul>
        {notes.decisions.length > 0 && (
          <>
            <p className="font-semibold">Decided so far</p>
            <ul className="list-disc pl-5">
              {notes.decisions.map((d) => <li key={d.text}>{d.text}{d.affects_me && <strong> (affects you)</strong>}</li>)}
            </ul>
            {!compact && <AudioButton text={decisionsText(notes.decisions)} label="Listen to decisions" />}
          </>
        )}
        {!compact && notes.glossary_terms.length > 0 && (
          <ul aria-label="Terms you may not know" className="flex flex-wrap gap-2">
            {notes.glossary_terms.map((term) => <li key={term}><GlossaryTerm term={term} /></li>)}
          </ul>
        )}
        {!compact && <AudioButton text={notes.summary.join('\n')} label="Listen to summary" />}
      </div>
    );
  }
  if (!notes.my_tasks.length) return <p>No tasks for you yet.</p>;
  return (
    <div className="grid gap-2">
      <MeetingTaskList tasks={notes.my_tasks} onToggle={onToggle} compact={compact} />
      {!compact && <AudioButton text={tasksText(notes.my_tasks)} label="Listen to my tasks" />}
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.me    first name, as people say it in the meeting (whose tasks)
 * @param {string} props.date  YYYY-MM-DD, for "by Thursday"
 * @param {(recording: File, noteId: string|null) => void} [props.onFinish]  gets the whole recording when the person ends the meeting for tasks
 */
export default function Captions({ me, date, onFinish }) {
  const announce = useAnnounce();
  const [source, setSource] = useState(canCaptureTab() ? 'tab' : 'room');
  const [consent, setConsent] = useState(false);
  const [live, setLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [micOff, setMicOff] = useState(false);
  const [segments, setSegments] = useState([]); // { at: ms, text }
  const [size, setSize] = useState('XL');
  const [minutes, setMinutes] = useState(3);
  const [missed, setMissed] = useState('');
  const [notes, setNotes] = useState(null); // live result + `count` = how many caption lines it covers
  const [panel, setPanel] = useState(null); // 'missed' | 'summary' | 'tasks'
  const [busy, setBusy] = useState(''); // the panel being fetched
  const [error, setError] = useState('');
  const [floating, setFloating] = useState(null); // Document Picture-in-Picture window
  const capture = useRef(null);
  const floatWin = useRef(null); // end() can run from a stale closure (browser "Stop sharing"), so it reads the window from here
  const lastText = useRef('');
  const startedAt = useRef(0);
  const noteId = useRef(null); // the meeting_notes row of this meeting; every update and the final tasks go to it

  useEffect(() => () => void capture.current?.stop(false), []);
  useEffect(() => {
    floatWin.current = floating;
    return () => floating?.close();
  }, [floating]);

  const caption = async (clip, at) => {
    try {
      const text = await transcribeOnServer(clip, lastText.current);
      if (!text) return;
      lastText.current = text;
      setSegments((s) => [...s, { at, text }].sort((a, b) => a.at - b.at).slice(-MAX_SEGMENTS));
    } catch (e) {
      setError(`Some captions were missed: ${e.message}`);
    }
  };

  const float = async () => {
    try {
      const w = await window.documentPictureInPicture.requestWindow({ width: 560, height: 300 });
      for (const sheet of document.styleSheets) {
        try {
          const style = w.document.createElement('style');
          style.textContent = Array.from(sheet.cssRules, (r) => r.cssText).join('\n');
          w.document.head.append(style);
        } catch {
          if (!sheet.href) continue;
          const link = w.document.createElement('link');
          link.rel = 'stylesheet';
          link.href = sheet.href;
          w.document.head.append(link);
        }
      }
      Object.assign(w.document.documentElement.dataset, document.documentElement.dataset); // work-style profile: contrast, text size, font
      w.document.title = 'Live captions';
      w.addEventListener('pagehide', () => setFloating(null));
      setFloating(w);
    } catch {
      // No floating window (e.g. the click was used up by the share picker): captions still show on this page.
    }
  };

  const end = async (forTasks) => {
    const c = capture.current;
    if (!c) return;
    capture.current = null;
    setLive(false);
    setMicOff(false);
    const recording = await c.stop(forTasks && !!onFinish);
    floatWin.current?.close();
    if (!recording) return announce('Live captions off.');
    announce('Meeting ended. Getting your tasks.');
    onFinish(new File([recording], `meeting.${extensionFor(recording.type)}`, { type: recording.type }), noteId.current);
  };

  const start = async () => {
    setError('');
    setStarting(true);
    // Both need the click: the share picker first (it does not use the click up), then the floating window.
    const pending = startCapture({ source, onClip: caption, onEnded: () => end(true) });
    if (source === 'tab' && canFloat() && !floating) float();
    try {
      capture.current = await pending;
      // A new meeting: fresh captions, and a new row in Today on the first summary.
      startedAt.current = Date.now();
      noteId.current = null;
      lastText.current = '';
      setSegments([]);
      setNotes(null);
      setPanel(null);
      setLive(true);
      setMicOff(!capture.current.hasMic);
      announce('Live captions on.');
    } catch (e) {
      floatWin.current?.close();
      const msg =
        e.name === 'NotAllowedError'
          ? source === 'tab' ? 'Sharing was cancelled. Start again and pick the meeting tab.' : 'Allow microphone access to see live captions.'
          : e.message;
      setError(msg);
      announce(msg, { urgent: true });
    } finally {
      setStarting(false);
    }
  };

  const catchUp = async () => {
    const since = Date.now() - minutes * 60_000;
    const text = segments.filter((s) => s.at >= since).map((s) => s.text).join('\n');
    setPanel('missed');
    if (!text) return setMissed(`Nothing was said in the last ${minutes} minutes.`);
    setBusy('missed');
    try {
      const { summary } = await api('/meetings/catch-up', { method: 'POST', body: { last_minutes_text: text } });
      setMissed(summary);
      announce(summary);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const toggle = async (_t, done, index) => {
    const before = notes;
    const next = { ...notes, my_tasks: withDone(notes.my_tasks, index, done) };
    setNotes(next);
    try {
      await saveTicks(noteId.current, next.my_tasks);
    } catch (e) {
      setNotes(before);
      announce(`Could not save that tick: ${e.message}`, { urgent: true });
    }
  };

  const tell = (which, n) =>
    announce(
      which === 'summary'
        ? `Summary so far. ${n.summary.join(' ')}`
        : n.my_tasks.length ? `${plural(n.my_tasks.length, 'task')} for you so far: ${n.my_tasks.map((t) => t.task).join('; ')}.` : 'No tasks for you yet.',
    );

  // One call gives both the summary and my tasks; it is only repeated when new captions came in.
  const showNotes = async (which) => {
    setPanel(which);
    if (notes?.count === segments.length) return tell(which, notes);
    setBusy(which);
    try {
      const text = segments.map((s) => `[${mmss(s.at - startedAt.current)}] ${s.text}`).join('\n');
      const res = await api('/meetings/live', { method: 'POST', body: { text, me, meeting_date: date, note_id: noteId.current } });
      noteId.current = res.note_id ?? noteId.current;
      const next = { ...res, count: segments.length };
      setNotes(next);
      tell(which, next);
    } catch (e) {
      setPanel(null);
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  if (!canCaptureRoom()) {
    return <p className="card">Live captions need Chrome, Edge or Safari. You can still upload the recording after the meeting.</p>;
  }

  const idle = !busy && segments.length > 0;
  const actions = (
    <>
      <button type="button" className="btn" disabled={!idle} onClick={catchUp}>{busy === 'missed' ? 'Summarising…' : 'What did I miss?'}</button>
      <button type="button" className="btn" disabled={!idle} onClick={() => showNotes('summary')}>{busy === 'summary' ? 'Writing…' : 'Summary so far'}</button>
      <button type="button" className="btn" disabled={!idle} onClick={() => showNotes('tasks')}>{busy === 'tasks' ? 'Looking…' : 'My tasks so far'}</button>
    </>
  );
  const shown = panel && !busy && (panel === 'missed' ? missed : notes);

  return (
    <section aria-labelledby="live-h" className="card grid gap-4">
      <h2 id="live-h" className="text-xl font-semibold">Live captions</h2>
      <p className="text-muted">Big captions while the meeting runs, a catch-up if you lose the thread, and your summary and tasks at any moment. The captions are never saved; the summary and your tasks are kept in Today.</p>

      {!live && (
        <>
          <fieldset className="grid gap-2">
            <legend className="mb-1 font-semibold">Where is the meeting?</legend>
            {Object.entries(SOURCES).map(([key, s]) => (
              <div key={key}>
                <label className="inline-flex min-h-11 items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="caption-source"
                    value={key}
                    checked={source === key}
                    disabled={key === 'tab' && !canCaptureTab()}
                    onChange={() => setSource(key)}
                    aria-describedby={`source-${key}-hint`}
                    className="size-5"
                  />
                  {s.label}
                </label>
                <p id={`source-${key}-hint`} className="pl-7 text-muted">{key === 'tab' && !canCaptureTab() ? 'Needs Chrome or Edge.' : s.hint}</p>
              </div>
            ))}
          </fieldset>
          <label className="inline-flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="size-5" />
            Everyone in the meeting knows I use captions and agreed to be recorded
          </label>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {live ? (
          <>
            {onFinish && <button type="button" className="btn btn-primary" onClick={() => end(true)}>End meeting and get my tasks</button>}
            <button type="button" className="btn" onClick={() => end(false)}>Stop captions</button>
            {canFloat() && !floating && <button type="button" className="btn" onClick={float}>Float captions over the meeting</button>}
          </>
        ) : (
          <button type="button" className="btn btn-primary" disabled={!consent || starting} onClick={start}>
            {starting ? 'Starting…' : 'Start captions'}
          </button>
        )}
        <fieldset className="inline-flex items-center gap-1">
          <legend className="sr-only">Caption size</legend>
          {Object.keys(SIZES).map((k) => (
            <label key={k} className={`btn has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid ${size === k ? 'border-accent' : ''}`}>
              <input type="radio" name="caption-size" value={k} checked={size === k} onChange={() => setSize(k)} className="sr-only" />
              {k}
            </label>
          ))}
        </fieldset>
      </div>
      {micOff && <p className="text-muted">Your microphone is off, so only the others are captioned.</p>}
      {floating && <p className="text-muted">Captions are also in the floating window over your meeting.</p>}

      <Lines segments={segments} live={live} size={size} className="max-h-80 rounded-lg border border-[var(--border)] p-4" />

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2">
          Last
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="field min-h-11">
            {[1, 3, 5, 10].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        {actions}
      </div>
      {shown && (
        <div className="grid gap-2 rounded-lg border-l-4 border-accent pl-3">
          <Panel panel={panel} missed={missed} notes={notes} onToggle={toggle} />
          {panel !== 'missed' && noteId.current && <p className="text-muted">Saved in <Link to="/today">Today</Link>. It updates each time you ask, and your ticks stay.</p>}
        </div>
      )}
      {error && <p role="alert" className="text-[var(--danger)]">{error}</p>}

      {floating &&
        createPortal(
          <div className="flex h-screen flex-col gap-2 p-3">
            <Lines segments={segments} live={live} size={size} className="min-h-0 flex-1" />
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
            {shown && (
              <div className="max-h-[45%] shrink-0 overflow-y-auto border-t border-[var(--border)] pt-2">
                <Panel panel={panel} missed={missed} notes={notes} onToggle={toggle} compact />
              </div>
            )}
          </div>,
          floating.document.body,
        )}
    </section>
  );
}
