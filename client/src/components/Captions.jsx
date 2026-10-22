// Owner: Track C (F3 live). Large live captions for a meeting in another tab (Meet, Teams, Slack, Zoom on the web) or in the room,
// a floating caption window over the meeting, "What did I miss?", "Summary so far", "My tasks so far", "Download captions"
// and "End meeting → my tasks". This is only the view: the meeting itself lives in LiveMeetingProvider, so it keeps going on other pages.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { canCaptureRoom, canCaptureTab } from '../lib/meetingCapture.js';
import { Actions, Lines, Panel, SIZES, canFloat, useLiveMeeting } from './LiveMeeting.jsx';

const SOURCES = {
  tab: { label: 'Online meeting in another tab', hint: 'Meet, Teams, Slack or Zoom open in Chrome or Edge. Pick the meeting tab and turn on "Also share tab audio".' },
  room: { label: 'Meeting in this room', hint: 'Uses your microphone.' },
};

/**
 * @param {object} props
 * @param {string} props.me    first name, as people say it in the meeting (whose tasks)
 * @param {string} props.date  YYYY-MM-DD, for "by Thursday"
 */
export default function Captions({ me, date }) {
  const m = useLiveMeeting();
  const [source, setSource] = useState(canCaptureTab() ? 'tab' : 'room');
  const [consent, setConsent] = useState(m.live);

  useEffect(() => {
    m.who.current = { me, date };
  }, [m.who, me, date]);

  if (!canCaptureRoom()) {
    return <p className="card">Live captions need Chrome, Edge or Safari. You can still upload the recording after the meeting.</p>;
  }

  return (
    <section aria-labelledby="live-h" className="card grid gap-4">
      <h2 id="live-h" className="text-xl font-semibold">Live captions</h2>
      <p className="text-muted">
        Big captions while the meeting runs, a catch-up if you lose the thread, and your summary and tasks at any moment. You can open other pages while it runs.
        Bridge never saves the captions (you can download them yourself); the summary and your tasks are kept in Today.
      </p>

      {!m.live && (
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
        {m.live ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => m.end(true)}>End meeting and get my tasks</button>
            <button type="button" className="btn" onClick={() => m.end(false)}>Stop captions</button>
            {canFloat() && !m.floating && <button type="button" className="btn" onClick={m.float}>Float captions over the meeting</button>}
          </>
        ) : (
          <button type="button" className="btn btn-primary" disabled={!consent || m.starting} onClick={() => m.start(source)}>
            {m.starting ? 'Starting…' : 'Start captions'}
          </button>
        )}
        <fieldset className="inline-flex items-center gap-1">
          <legend className="sr-only">Caption size</legend>
          {Object.keys(SIZES).map((k) => (
            <label key={k} className={`btn has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid ${m.size === k ? 'border-accent' : ''}`}>
              <input type="radio" name="caption-size" value={k} checked={m.size === k} onChange={() => m.setSize(k)} className="sr-only" />
              {k}
            </label>
          ))}
        </fieldset>
      </div>
      {m.micOff && <p className="text-muted">Your microphone is off, so only the others are captioned.</p>}
      {m.floating && <p className="text-muted">Captions are also in the floating window over your meeting.</p>}

      <Lines segments={m.segments} live={m.live} size={m.size} className="max-h-80 rounded-lg border border-[var(--border)] p-4" />

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2">
          Last
          <select value={m.minutes} onChange={(e) => m.setMinutes(Number(e.target.value))} className="field min-h-11">
            {[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n} min</option>)}
          </select>
        </label>
        <Actions />
        {m.segments.length > 0 && <button type="button" className="btn" onClick={m.downloadCaptions}>Download captions (.txt)</button>}
      </div>
      {m.shown && (
        <div className="grid gap-2 rounded-lg border-l-4 border-accent pl-3">
          <Panel />
          {m.panel !== 'missed' && m.noteId.current && <p className="text-muted">Saved in <Link to="/today">Today</Link>. It updates each time you ask, and your ticks stay.</p>}
        </div>
      )}
      {m.error && <p role="alert" className="text-[var(--danger)]">{m.error}</p>}
    </section>
  );
}
