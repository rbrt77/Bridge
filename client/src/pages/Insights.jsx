// Owner: Track B (UI; backend /api/company/insights by Track A + D). F13 (SHOULD): anonymous themes, only groups ≥ k, 'seed data' label.
// Privacy by design: the API never returns a question or a person, only topics asked by at least k people.
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const day = (iso) => new Date(`${iso}T00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Insights() {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  useEffect(() => {
    api('/company/insights')
      .then((data) => setState({ status: 'ready', data, error: '' }))
      .catch((e) => setState({ status: 'error', data: null, error: e.message }));
  }, []);
  const d = state.data;
  const max = Math.max(1, ...(d?.themes ?? []).map((t) => t.count));

  return (
    <>
      <h1 className="text-3xl font-bold">Insights</h1>
      <p className="mt-2 max-w-prose text-muted">
        What juniors ask about, so you know which docs to improve. Anonymous by design: a topic shows up only when at least
        {' '}{d?.k ?? 5} questions are about it, and no question or name is ever shown.
      </p>

      {state.status === 'loading' && <p className="mt-6 text-muted">Loading…</p>}
      {state.status === 'error' && <p role="alert" className="mt-6 text-danger">Could not load insights: {state.error}</p>}

      {d && (
        <>
          {d.seeded && (
            <p className="mt-6 rounded-xl border border-accent bg-accent-soft p-3">
              <strong>Demo data.</strong> These questions were seeded for the demo, not asked by real people.
            </p>
          )}

          <section aria-labelledby="themes-h" className="card mt-6">
            <h2 id="themes-h" className="text-xl font-semibold">Topics juniors ask about</h2>
            <p className="text-muted">
              {plural(d.total_questions, 'question')}
              {d.period && ` from ${day(d.period.from)} to ${day(d.period.to)}`}
            </p>
            {d.themes.length === 0 ? (
              <p className="mt-4">Not enough questions yet: a topic appears once at least {d.k} questions are about it.</p>
            ) : (
              <ul className="mt-4 grid gap-4">
                {d.themes.map((t) => (
                  <li key={t.topic}>
                    <p className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <span className="font-semibold">{cap(t.topic)}</span>
                      <span>
                        {plural(t.count, 'question')}
                        {t.unanswered > 0
                          ? <span className="text-danger"> · {t.unanswered} not answered by the docs</span>
                          : <span className="text-success"> · all answered</span>}
                      </span>
                    </p>
                    <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-accent-soft">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(t.count / max) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {d.hidden_topics > 0 && (
              <p className="mt-4 text-sm text-muted">
                {d.hidden_topics === 1
                  ? `1 more topic is hidden: it has fewer than ${d.k} questions, so it could point to a person.`
                  : `${d.hidden_topics} more topics are hidden: each has fewer than ${d.k} questions, so they could point to a person.`}
              </p>
            )}
          </section>

          <section aria-labelledby="gaps-h" className="card mt-6">
            <h2 id="gaps-h" className="text-xl font-semibold">Gaps in your docs</h2>
            {d.gaps.length === 0 ? (
              <p className="mt-2">No gaps found in this period.</p>
            ) : (
              <>
                <p className="text-muted">Things juniors needed and the docs did not say. Fixing these answers the questions for everyone.</p>
                <ul className="mt-3 list-disc space-y-2 pl-6">{d.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
