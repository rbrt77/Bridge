// Owner: Track B (UI) on top of Track A's /api/ask. Reference flow for SSE: copy this pattern elsewhere.
import { useRef, useState } from 'react';
import { postSse } from '../lib/sse.js';
import { useProfile } from '../a11y/ProfileProvider.jsx';
import { useAnnounce } from '../a11y/Announcer.jsx';
import AdaptiveAnswer from '../components/AdaptiveAnswer.jsx';
import HelpChat from '../components/HelpChat.jsx';
import VoiceInput from '../components/VoiceInput.jsx';

export default function Ask() {
  const { prefs } = useProfile();
  const announce = useAnnounce();
  const [question, setQuestion] = useState('');
  const [state, setState] = useState({ status: '', answer: '', sources: [], enrich: null, handoff: null, answerId: null });
  const [busy, setBusy] = useState(false);
  const abort = useRef(null);

  const run = async (mode = 'normal') => {
    abort.current?.abort();
    abort.current = new AbortController();
    setBusy(true);
    setState((s) => ({ ...s, answer: '', sources: [], enrich: null, handoff: null }));
    announce('Searching…');
    try {
      await postSse('/ask', { question, history: [], prefs, mode, answer_id: state.answerId }, {
        status: (d) => setState((s) => ({ ...s, status: d.message })),
        token: (d) => setState((s) => ({ ...s, answer: s.answer + d.text })),
        sources: (d) => setState((s) => ({ ...s, sources: d.sources })),
        enrich: (d) => setState((s) => ({ ...s, enrich: d })),
        handoff: (d) => { setState((s) => ({ ...s, handoff: d })); announce("I couldn't find this in the team's documents."); },
        done: (d) => { setState((s) => ({ ...s, status: '', answerId: d.answer_id })); announce('Answer ready'); },
        error: (d) => announce(d.message, { urgent: true }),
      }, abort.current.signal);
    } catch (e) {
      if (e.name !== 'AbortError') announce(e.message, { urgent: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Ask the team docs</h1>
      <form onSubmit={(e) => { e.preventDefault(); if (question.trim()) run(); }} className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="q" className="sr-only">Your question</label>
        <input id="q" value={question} onChange={(e) => setQuestion(e.target.value)} className="flex-1 border p-2" placeholder="e.g. What is our Definition of Done?" />
        <VoiceInput onText={setQuestion} />
        <button type="submit" disabled={busy} className="rounded border px-3">Ask</button>
      </form>
      {state.status && <p aria-hidden="true">{state.status}</p>}
      {state.handoff && (
        <>
          <p className="mt-4">I couldn&apos;t find this in the team&apos;s documents.</p>
          <HelpChat handoff={state.handoff} question={question} onClose={() => setState((s) => ({ ...s, handoff: null }))} />
        </>
      )}
      {state.answer && <AdaptiveAnswer answer={state.answer} sources={state.sources} enrich={state.enrich} busy={busy} onReAdapt={run} />}
    </>
  );
}
