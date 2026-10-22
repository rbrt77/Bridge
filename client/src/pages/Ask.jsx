// Owner: Track B (UI) on top of Track A's /api/ask. Reference flow for SSE: copy this pattern elsewhere.
// A conversation: each turn streams in place; earlier turns go back as `history` so follow-ups work.
// Kept in sessionStorage so it survives moving between pages, and is gone when the tab closes.
import { useEffect, useRef, useState } from 'react';
import { postSse } from '../lib/sse.js';
import { useProfile } from '../a11y/ProfileProvider.jsx';
import { useAnnounce } from '../a11y/Announcer.jsx';
import AdaptiveAnswer from '../components/AdaptiveAnswer.jsx';
import HelpChat from '../components/HelpChat.jsx';
import VoiceInput from '../components/VoiceInput.jsx';

const KEY = 'onramp.ask';
const HISTORY_TURNS = 3; // last 3 question/answer pairs are enough for follow-ups
const SUGGESTIONS = [
  'What is our Definition of Done?',
  'How do I set up the project on my laptop?',
  'Who reviews my pull requests?',
  'Who approves DB migrations?',
];

function load() {
  try {
    const turns = JSON.parse(sessionStorage.getItem(KEY)) ?? [];
    return turns.map((t) => (t.status === 'streaming' ? { ...t, status: 'stopped' } : t));
  } catch {
    return [];
  }
}

export default function Ask() {
  const { prefs } = useProfile();
  const announce = useAnnounce();
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState(load);
  const [busy, setBusy] = useState(false);
  const abort = useRef(null);
  const input = useRef(null);
  const turnEls = useRef({});
  const lastCount = useRef(turns.length);

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(turns)); } catch { /* private mode */ }
  }, [turns]);

  // Bring a new question into view; focus stays in the input so the next question can be typed right away.
  useEffect(() => {
    if (turns.length > lastCount.current) turnEls.current[turns.at(-1).key]?.scrollIntoView({ block: 'start' });
    lastCount.current = turns.length;
  }, [turns]);

  useEffect(() => () => abort.current?.abort(), []);

  const patch = (key, change) =>
    setTurns((ts) => ts.map((t) => (t.key === key ? { ...t, ...(typeof change === 'function' ? change(t) : change) } : t)));

  /** Streams one answer into turn `key`. mode/answerId re-adapt an existing answer with the same documents. */
  const stream = async (key, q, { mode = 'normal', answerId } = {}, previous = turns) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    announce(mode === 'normal' ? 'Searching the team docs…' : 'Rewriting the answer…');

    const at = previous.findIndex((t) => t.key === key);
    const history = previous
      .slice(0, at === -1 ? previous.length : at)
      .filter((t) => t.status === 'done' && t.answer)
      .slice(-HISTORY_TURNS)
      .flatMap((t) => [{ role: 'user', content: t.question }, { role: 'assistant', content: t.answer }]);

    let failed = false;
    try {
      await postSse('/ask', { question: q, history, prefs, mode, answer_id: answerId }, {
        status: (d) => patch(key, { statusText: d.message }),
        token: (d) => patch(key, (t) => ({ answer: t.answer + d.text })),
        sources: (d) => patch(key, { sources: d.sources }),
        enrich: (d) => patch(key, { enrich: d }),
        handoff: (d) => { patch(key, { handoff: d }); announce("I couldn't find this in the team's documents. You can ask a person."); },
        done: (d) => {
          patch(key, { status: 'done', answerId: d.answer_id });
          if (d.answer_id) announce('Answer ready.');
        },
        error: (d) => {
          failed = true;
          patch(key, { status: 'error', error: d.message });
          announce(d.message, { urgent: true });
        },
      }, controller.signal);
      if (!failed) patch(key, (t) => (t.status === 'streaming' ? { status: 'done' } : {}));
    } catch (e) {
      if (e.name === 'AbortError') {
        patch(key, (t) => (t.status === 'streaming' ? { status: 'stopped' } : {}));
      } else {
        const message = e.code === 'no_org' ? 'Your account is not part of a team yet. Ask your manager to add you.' : e.message;
        patch(key, { status: 'error', error: message });
        announce(message, { urgent: true });
      }
    } finally {
      if (abort.current === controller) {
        abort.current = null;
        setBusy(false);
      }
    }
  };

  const fresh = { answer: '', sources: [], enrich: null, handoff: null, error: '', statusText: '', status: 'streaming' };

  const ask = (q) => {
    const text = q.trim();
    if (!text || busy) return;
    const turn = { key: `t${Date.now()}`, question: text, answerId: null, ...fresh };
    const next = [...turns, turn];
    setTurns(next);
    setQuestion('');
    stream(turn.key, text, {}, next);
  };

  const reAdapt = (t, mode) => {
    patch(t.key, fresh);
    stream(t.key, t.question, { mode, answerId: t.answerId });
  };
  const retry = (t) => {
    patch(t.key, fresh);
    stream(t.key, t.question);
  };

  const clear = () => {
    abort.current?.abort();
    setTurns([]);
    announce('New conversation started.');
    input.current?.focus();
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Ask the team docs</h1>
          <p className="mt-2 text-muted">Answers come from your team&apos;s documents and show where they came from.</p>
        </div>
        {turns.length > 0 && <button type="button" onClick={clear} className="btn">New conversation</button>}
      </div>

      {turns.length > 0 && (
        <ol aria-label="Conversation" className="mt-6 flex flex-col gap-6">
          {turns.map((t) => (
            <li key={t.key} ref={(el) => { turnEls.current[t.key] = el; }} className="scroll-mt-4">
              <h2 id={`${t.key}-q`} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2 font-medium text-accent-fg">
                <span className="sr-only">You asked: </span>{t.question}
              </h2>
              <article aria-labelledby={`${t.key}-a`} className="card mt-3">
                <p id={`${t.key}-a`} className="text-sm font-semibold text-muted">
                  OnRamp <span className="font-normal">· AI-generated from team docs</span>
                </p>
                {t.handoff ? (
                  <>
                    <p className="mt-2">I couldn&apos;t find this in the team&apos;s documents, so I won&apos;t guess.</p>
                    {!t.helpClosed && (
                      <HelpChat handoff={t.handoff} question={t.question} onClose={() => patch(t.key, { helpClosed: true })} />
                    )}
                  </>
                ) : (
                  <AdaptiveAnswer
                    turn={t}
                    prefs={prefs}
                    busy={busy}
                    onReAdapt={(mode) => reAdapt(t, mode)}
                    onRetry={() => retry(t)}
                    onStop={() => abort.current?.abort()}
                  />
                )}
              </article>
            </li>
          ))}
        </ol>
      )}

      {turns.length === 0 && (
        <section aria-labelledby="try-h" className="mt-6">
          <h2 id="try-h" className="font-semibold">Try asking</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}><button type="button" onClick={() => ask(s)} className="btn font-medium">{s}</button></li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="card mt-6 flex flex-wrap gap-2">
        <label htmlFor="q" className="sr-only">{turns.length ? 'Ask a follow-up question' : 'Your question'}</label>
        <input
          id="q"
          ref={input}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="field min-w-0 flex-1 basis-60"
          placeholder={turns.length ? 'Ask a follow-up…' : 'e.g. What is our Definition of Done?'}
          autoComplete="off"
        />
        <VoiceInput onText={setQuestion} />
        <button type="submit" disabled={busy || !question.trim()} className="btn btn-primary">Ask</button>
      </form>
    </>
  );
}
