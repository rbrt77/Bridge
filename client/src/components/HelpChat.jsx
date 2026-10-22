// Owner: Track B (F5 UI). After an abstain: ask the manager by name, or anonymously to the team FAQ.
// Pre-filled draft, the user edits and presses Send: nothing is sent automatically.
// Once sent, the conversation continues right here, live (HelpThread).
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.js';
import { askAnonymously } from '../lib/help.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import HelpThread from './HelpThread.jsx';

export default function HelpChat({ handoff, question, ticketUrl, onClose, onSent, headingLevel = 3 }) {
  const helper = handoff.helper ?? { name: 'your manager' };
  const [how, setHow] = useState('direct'); // direct | anon
  const [draft, setDraft] = useState(handoff.draft);
  const [anonText, setAnonText] = useState(question);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(handoff.sent ?? null); // { thread } | { anon }
  const announce = useAnnounce();
  const uid = useId().replace(/:/g, '');
  const H = `h${headingLevel}`;

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = how === 'direct'
        ? { thread: (await api('/help/threads', { method: 'POST', body: { question, draft, ticket_url: ticketUrl } })).thread }
        : { anon: await askAnonymously(anonText) };
      setSent(result);
      onSent?.(result);
      announce(how === 'direct' ? `Sent to ${helper.name}. Their reply will appear here.` : 'Sent anonymously to the team FAQ.');
    } catch (err) {
      setError(err.code === 'not_implemented' ? 'Anonymous questions are not switched on yet. You can ask your manager directly.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent?.thread) {
    return (
      <div className="mt-4 rounded-xl border border-border-subtle p-4">
        <HelpThread thread={sent.thread} />
        <p className="mt-3 text-sm"><Link to="/ask/messages">All your messages</Link></p>
      </div>
    );
  }
  if (sent?.anon) {
    return (
      <div role="status" className="mt-4 rounded-xl bg-accent-soft p-4">
        <p className="font-semibold">Sent anonymously.</p>
        <p className="mt-1">Your team sees the question, never who asked. When someone answers, it shows up under <Link to="/ask/messages">Messages</Link> in this browser.</p>
      </div>
    );
  }

  return (
    <form onSubmit={send} aria-labelledby={`${uid}-h`} className="mt-4 flex flex-col gap-3 rounded-xl border border-border-subtle p-4">
      <H id={`${uid}-h`} className="font-semibold">Ask a person</H>
      {handoff.topic_owner && <p className="text-muted">Tip: {handoff.topic_owner}.</p>}

      <fieldset>
        <legend className="font-medium">How do you want to ask?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[
            ['direct', `Ask ${helper.name}${helper.role ? ` (${helper.role})` : ''}`, `${helper.name[0].toUpperCase()}${helper.name.slice(1)} sees your name and can reply here.`],
            ['anon', 'Send anonymously to the team FAQ', 'Your team sees the question, never who asked.'],
          ].map(([value, label, hint]) => (
            <div key={value} className="flex gap-3 rounded-lg border border-border-subtle p-3 hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input
                type="radio"
                id={`${uid}-how-${value}`}
                name={`${uid}-how`}
                value={value}
                checked={how === value}
                onChange={() => setHow(value)}
                aria-describedby={`${uid}-how-${value}-hint`}
                className="mt-1 size-5 min-h-0 shrink-0"
              />
              <div>
                <label htmlFor={`${uid}-how-${value}`} className="block cursor-pointer font-medium">{label}</label>
                <p id={`${uid}-how-${value}-hint`} className="text-sm text-muted">{hint}</p>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {how === 'direct' ? (
        <>
          <label htmlFor={`${uid}-draft`} className="font-medium">Your message (you can edit it)</label>
          <textarea id={`${uid}-draft`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} required className="field" />
        </>
      ) : (
        <>
          <label htmlFor={`${uid}-anon`} className="font-medium">Your question (no names, please)</label>
          <textarea id={`${uid}-anon`} value={anonText} onChange={(e) => setAnonText(e.target.value)} rows={3} required aria-describedby={`${uid}-anon-hint`} className="field" />
          <p id={`${uid}-anon-hint`} className="text-sm text-muted">We don&apos;t store who sent it. A code kept only in this browser lets you see the answer.</p>
        </>
      )}

      {error && <p role="alert" className="text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !(how === 'direct' ? draft : anonText).trim()} className="btn btn-primary">
          {busy ? 'Sending…' : how === 'direct' ? `Send to ${helper.name}` : 'Send anonymously'}
        </button>
        <button type="button" onClick={onClose} className="btn">Not now</button>
      </div>
    </form>
  );
}
