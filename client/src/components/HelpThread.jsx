// Owner: Track B (F5 UI). One help conversation, live. New messages from the other person are announced politely.
// The helper (manager/admin) can turn their answer into a Team FAQ ("Save to team docs"), which then feeds Ask.
import { useState } from 'react';
import { api } from '../lib/api.js';
import { useThreadMessages } from '../lib/help.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import { useSession, useHasRole } from '../auth/Session.jsx';

const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function SaveFaq({ thread, messages, onSaved }) {
  const [open, setOpen] = useState(false);
  const lastAnswer = [...messages].reverse().find((m) => m.author_id === thread.helper?.id)?.body ?? '';
  const [question, setQuestion] = useState(thread.question);
  const [answer, setAnswer] = useState('');
  const [state, setState] = useState({ busy: false, error: '' });
  const id = `faq-${thread.id}`;

  if (!open) {
    return (
      <button type="button" onClick={() => { setAnswer(lastAnswer); setOpen(true); }} className="btn">
        Save to team docs
      </button>
    );
  }
  const save = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: '' });
    try {
      await api(`/help/threads/${thread.id}/publish-faq`, { method: 'POST', body: { question, answer } });
      onSaved();
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  };
  return (
    <form onSubmit={save} aria-labelledby={`${id}-h`} className="mt-3 flex flex-col gap-2 rounded-xl bg-accent-soft p-4">
      <h3 id={`${id}-h`} className="font-semibold">Save to team docs</h3>
      <p className="text-sm text-muted">Everyone on the team can find this in Ask, cited as &ldquo;Team FAQ, answered by you&rdquo;. The asker&apos;s name is not saved.</p>
      <label htmlFor={`${id}-q`} className="font-medium">Question</label>
      <input id={`${id}-q`} value={question} onChange={(e) => setQuestion(e.target.value)} required className="field" />
      <label htmlFor={`${id}-a`} className="font-medium">Answer</label>
      <textarea id={`${id}-a`} value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} required className="field" />
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={state.busy || !answer.trim()} className="btn btn-primary">{state.busy ? 'Saving…' : 'Save as Team FAQ'}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn">Cancel</button>
      </div>
    </form>
  );
}

export default function HelpThread({ thread, headingLevel = 3 }) {
  const { user } = useSession();
  const announce = useAnnounce();
  const canPublish = useHasRole('manager', 'admin');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const { messages, error: loadError, mode, send } = useThreadMessages(thread, {
    onIncoming: (fresh) => fresh
      .filter((m) => m.author_id !== user?.id)
      .forEach((m) => announce(`New message from ${m.author}: ${m.body}`)),
  });
  const isHelper = thread.helper?.id === user?.id;
  const other = isHelper ? thread.requester : thread.helper?.name;
  const H = `h${headingLevel}`;

  const submit = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError('');
    try {
      await send(reply.trim());
      setReply('');
      announce('Sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-labelledby={`th-${thread.id}`} className="flex flex-col gap-3">
      <div>
        <H id={`th-${thread.id}`} tabIndex={-1} className="font-semibold outline-none">{thread.question}</H>
        <p className="text-sm text-muted">
          {isHelper ? `From ${thread.requester}` : `With ${thread.helper?.name}`}
          {' · '}
          {mode === 'live' ? 'Live' : 'Checking for new messages every 2 seconds'}
        </p>
      </div>

      {loadError && <p role="alert" className="text-danger">{loadError}</p>}
      <ol aria-label={`Messages with ${other}`} className="flex flex-col gap-2">
        {messages.map((m) => {
          const mine = m.author_id ? m.author_id === user?.id : m.author !== other;
          return (
            <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2 ${mine ? 'ml-auto rounded-br-md bg-accent text-accent-fg' : 'rounded-bl-md border border-border-subtle bg-surface'}`}>
              <p className="text-xs font-semibold opacity-90">
                {mine ? 'You' : m.author} · <time dateTime={m.created_at}>{time(m.created_at)}</time>
              </p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </li>
          );
        })}
      </ol>

      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <label htmlFor={`reply-${thread.id}`} className="sr-only">Reply to {other}</label>
        <textarea
          id={`reply-${thread.id}`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e); }}
          rows={2}
          placeholder={`Reply to ${other}…`}
          aria-describedby={`reply-hint-${thread.id}`}
          className="field min-w-0 flex-1 basis-60"
        />
        <button type="submit" disabled={sending || !reply.trim()} className="btn btn-primary self-end">{sending ? 'Sending…' : 'Send'}</button>
        <p id={`reply-hint-${thread.id}`} className="w-full text-sm text-muted">Ctrl+Enter sends.</p>
      </form>
      {error && <p role="alert" className="text-danger">{error}</p>}

      {isHelper && canPublish && (
        saved
          ? <p role="status" className="rounded-xl bg-accent-soft p-3">Saved as Team FAQ. Ask will now answer this question and cite you.</p>
          : <SaveFaq thread={thread} messages={messages} onSaved={() => { setSaved(true); announce('Saved to team docs.'); }} />
      )}
    </section>
  );
}
