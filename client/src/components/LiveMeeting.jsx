// Owner: Track C (F3 live). The live meeting outlives the Meetings page: capture, captions, notes and the floating caption window
// sit here, above the routes, so moving to Today or Ask mid-meeting keeps everything running. Captions.jsx is only the view.
// Captions stay in memory (and in a .txt if the person downloads them). Summary and tasks are saved to one meeting_notes row (Today).
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';
import { api } from '../lib/api.js';
import { saveBlob } from '../lib/ics.js';
import { decisionsText, saveTicks, withDone } from '../lib/meetingNotes.js';
import { isOwnSpeech, transcribeOnServer } from '../lib/speech.js';
import { extensionFor, startCapture } from '../lib/meetingCapture.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import AudioButton from './AudioButton.jsx';
import GlossaryTerm from './GlossaryTerm.jsx';
import MeetingTaskList, { tasksText } from './MeetingTaskList.jsx';

export const SIZES = { L: 'text-2xl', XL: 'text-3xl', XXL: 'text-5xl' };
export const canFloat = () => 'documentPictureInPicture' in window;
const mmss = (ms) => `${String(Math.floor(ms / 60_000)).padStart(2, '0')}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const LiveMeetingContext = createContext(null);
export const useLiveMeeting = () => useContext(LiveMeetingContext);

/** All the captions; follows the newest line unless the person scrolled up to reread. */
export function Lines({ segments, live, size, className = '' }) {
  const box = useRef(null);
  const [following, setFollowing] = useState(true);
  useEffect(() => {
    if (following && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [segments, following, size]);
  const onScroll = () => {
    const el = box.current;
    setFollowing(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };
  return (
    <div className={`relative flex min-h-0 flex-col ${className}`}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must be reachable by keyboard to reread earlier captions */}
      <div ref={box} onScroll={onScroll} role="log" aria-live="off" aria-label="Live captions" tabIndex={0} className={`min-h-0 flex-1 overflow-y-auto leading-snug ${SIZES[size]}`}>
        {segments.length === 0 && <p className="text-muted">{live ? 'Listening… Captions show up a few seconds after people speak.' : 'Captions will appear here.'}</p>}
        {segments.map((s, i) => <p key={`${s.at}-${i}`}>{s.text}</p>)}
      </div>
      {!following && segments.length > 0 && (
        <button type="button" className="btn btn-primary absolute right-2 bottom-2" onClick={() => setFollowing(true)}>Jump to latest</button>
      )}
    </div>
  );
}

/** What the last button showed: the catch-up, the summary and decisions so far, or my tasks so far. `compact` = the floating window. */
export function Panel({ compact }) {
  const { panel, missed, notes, toggle } = useLiveMeeting();
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
      <MeetingTaskList tasks={notes.my_tasks} onToggle={toggle} compact={compact} />
      {!compact && <AudioButton text={tasksText(notes.my_tasks)} label="Listen to my tasks" />}
    </div>
  );
}

export function Actions() {
  const { busy, segments, catchUp, showNotes } = useLiveMeeting();
  const idle = !busy && segments.length > 0;
  return (
    <>
      <button type="button" className="btn" disabled={!idle} onClick={catchUp}>{busy === 'missed' ? 'Summarising…' : 'What did I miss?'}</button>
      <button type="button" className="btn" disabled={!idle} onClick={() => showNotes('summary')}>{busy === 'summary' ? 'Writing…' : 'Summary so far'}</button>
      <button type="button" className="btn" disabled={!idle} onClick={() => showNotes('tasks')}>{busy === 'tasks' ? 'Looking…' : 'My tasks so far'}</button>
    </>
  );
}

/** On every page but Meetings: the meeting is still being captioned, or it ended and its tasks are waiting. */
export function LiveMeetingBar() {
  const { live, finished } = useLiveMeeting();
  const { pathname } = useLocation();
  if (pathname === '/meetings' || (!live && !finished)) return null;
  return (
    <div className="border-b border-border-subtle bg-accent-soft">
      <p className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-6">
        {live ? 'Live captions are on.' : 'Your meeting ended.'}
        <Link to="/meetings" className="inline-flex min-h-11 items-center font-semibold">{live ? 'Back to the meeting' : 'Get your tasks in Meetings'}</Link>
      </p>
    </div>
  );
}

export function LiveMeetingProvider({ children }) {
  const announce = useAnnounce();
  const [live, setLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [micOff, setMicOff] = useState(false);
  const [segments, setSegments] = useState([]); // { at: ms, text }, the whole meeting
  const [size, setSize] = useState('XL');
  const [minutes, setMinutes] = useState(3);
  const [missed, setMissed] = useState('');
  const [notes, setNotes] = useState(null); // live result + `count` = how many caption lines it covers
  const [panel, setPanel] = useState(null); // 'missed' | 'summary' | 'tasks'
  const [busy, setBusy] = useState(''); // the panel being fetched
  const [error, setError] = useState('');
  const [floating, setFloating] = useState(null); // Document Picture-in-Picture window
  const [finished, setFinished] = useState(null); // { file, noteId } once the meeting ended for tasks, until Meetings takes it
  const [result, setResult] = useState(null); // last processed meeting: { status: 'working' | 'done' | 'error', data?, error? }; Meetings sets it, the voice assistant reads it
  const capture = useRef(null);
  const floatWin = useRef(null); // end() can run from a stale closure (browser "Stop sharing"), so it reads the window from here
  const finishedRef = useRef(null);
  const lastText = useRef('');
  const startedAt = useRef(0);
  const noteId = useRef(null); // the meeting_notes row of this meeting; every update and the final tasks go to it
  const who = useRef({ me: '', date: '' }); // set by the Meetings page; the floating window's buttons use the last values

  useEffect(() => () => void capture.current?.stop(false), []);
  useEffect(() => {
    floatWin.current = floating;
    return () => floating?.close();
  }, [floating]);
  // Moving between pages is safe now; closing or reloading the tab still ends the capture, so ask first.
  useEffect(() => {
    if (!live) return;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [live]);

  const caption = async (clip, at) => {
    try {
      const text = await transcribeOnServer(clip, lastText.current);
      if (!text || isOwnSpeech(text)) return; // Bridge's own voice (Talk to Bridge, Listen) picked up by the microphone
      lastText.current = text;
      setSegments((s) => [...s, { at, text }].sort((a, b) => a.at - b.at));
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
    const recording = await c.stop(forTasks);
    floatWin.current?.close();
    if (!recording) return announce('Live captions off.');
    finishedRef.current = { file: new File([recording], `meeting.${extensionFor(recording.type)}`, { type: recording.type }), noteId: noteId.current };
    setFinished(finishedRef.current);
    announce(window.location.pathname === '/meetings' ? 'Meeting ended. Getting your tasks.' : 'Meeting ended. Open Meetings to get your tasks.');
  };

  /** The Meetings page calls this once to send the finished recording; a second call gets null. */
  const takeFinished = () => {
    const f = finishedRef.current;
    finishedRef.current = null;
    setFinished(null);
    return f;
  };

  /** Resolves to '' once captions run, or to the problem in words (the voice assistant reads it out). */
  const start = async (source) => {
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
      finishedRef.current = null;
      setFinished(null);
      setSegments([]);
      setNotes(null);
      setPanel(null);
      setLive(true);
      setMicOff(!capture.current.hasMic);
      announce('Live captions on.');
      return '';
    } catch (e) {
      floatWin.current?.close();
      const msg =
        e.name === 'NotAllowedError'
          ? source === 'tab' ? 'Sharing was cancelled. Start again and pick the meeting tab.' : 'Allow microphone access to see live captions.'
          : e.message;
      setError(msg);
      announce(msg, { urgent: true });
      return msg;
    } finally {
      setStarting(false);
    }
  };

  const catchUp = async () => {
    const since = Date.now() - minutes * 60_000;
    const text = segments.filter((s) => s.at >= since).map((s) => s.text).join('\n');
    setPanel('missed');
    if (!text) {
      const none = `Nothing was said in the last ${minutes} minutes.`;
      setMissed(none);
      return none;
    }
    setBusy('missed');
    try {
      const { summary } = await api('/meetings/catch-up', { method: 'POST', body: { last_minutes_text: text } });
      setMissed(summary);
      announce(summary);
      return summary;
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

  const tell = (which, n) => {
    const text =
      which === 'summary'
        ? `Summary so far. ${n.summary.join(' ')}`
        : n.my_tasks.length ? `${plural(n.my_tasks.length, 'task')} for you so far: ${n.my_tasks.map((t) => t.task).join('; ')}.` : 'No tasks for you yet.';
    announce(text);
    return text;
  };

  const timed = () => segments.map((s) => `[${mmss(s.at - startedAt.current)}] ${s.text}`).join('\n');

  // One call gives both the summary and my tasks; it is only repeated when new captions came in. Returns the text it announced (voice assistant).
  const showNotes = async (which) => {
    setPanel(which);
    if (notes?.count === segments.length) return tell(which, notes);
    setBusy(which);
    try {
      const { me, date } = who.current;
      const res = await api('/meetings/live', { method: 'POST', body: { text: timed(), me, meeting_date: date, note_id: noteId.current } });
      noteId.current = res.note_id ?? noteId.current;
      const next = { ...res, count: segments.length };
      setNotes(next);
      return tell(which, next);
    } catch (e) {
      setPanel(null);
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  /** The captions as a .txt on the person's own computer, with the minute of each line. Nothing goes to the server. */
  const downloadCaptions = () => {
    const day = new Date(startedAt.current).toLocaleDateString('sv-SE');
    const time = new Date(startedAt.current).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text = `Meeting captions, ${day} ${time}\n\n${timed()}\n`;
    saveBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `meeting-captions-${day}.txt`);
    announce('Captions downloaded.');
  };

  const shown = panel && !busy && (panel === 'missed' ? missed : notes);
  const value = {
    live, starting, micOff, segments, size, setSize, minutes, setMinutes, missed, notes, panel, busy, error, floating, finished, shown, noteId,
    who, start, end, float, catchUp, showNotes, toggle, takeFinished, downloadCaptions, result, setResult,
  };

  return (
    <LiveMeetingContext.Provider value={value}>
      {children}
      {floating &&
        createPortal(
          <div className="flex h-screen flex-col gap-2 p-3">
            <Lines segments={segments} live={live} size={size} className="flex-1" />
            <div className="flex flex-wrap items-center gap-2"><Actions /></div>
            {shown && (
              <div className="max-h-[45%] shrink-0 overflow-y-auto border-t border-[var(--border)] pt-2">
                <Panel compact />
              </div>
            )}
          </div>,
          floating.document.body,
        )}
    </LiveMeetingContext.Provider>
  );
}
