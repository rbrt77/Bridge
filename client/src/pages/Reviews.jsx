// Owner: Track C. F4: PR URL → '2 required, 3 optional', grouped by file (ReviewList), Required-only filter, Copy reply.
import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import WorkTabs from '../components/WorkTabs.jsx';
import ReviewList from '../components/ReviewList.jsx';

const DEMO_PR = 'https://github.com/brightline-software/invoicing-service/pull/57';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function Reviews() {
  const announce = useAnnounce();
  const [url, setUrl] = useState(DEMO_PR);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requiredOnly, setRequiredOnly] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api('/reviews/explain', { method: 'POST', body: { pr_url: url } });
      setData(res);
      announce(`${res.summary.required} required, ${res.summary.optional} optional, ${plural(res.summary.questions, 'question')}.`);
    } catch (err) {
      setError(err.message);
      announce(err.message, { urgent: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <WorkTabs />
      <h1 className="text-3xl font-bold">Code review helper</h1>
      <p className="text-muted">See which review comments you must fix, which are optional, and what to reply.</p>

      <form onSubmit={submit} className="card mt-6 grid max-w-xl gap-3">
        <label className="grid gap-1">
          Pull request link
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="field min-h-11" required />
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary justify-self-start">{busy ? 'Reading the review…' : 'Explain the review'}</button>
        {error && <p role="alert" className="text-[var(--danger)]">{error}</p>}
      </form>

      {data && (
        <section aria-labelledby="pr-h" className="mt-8">
          <h2 id="pr-h" className="text-xl font-semibold">{data.pr}</h2>
          <p className="mt-1 text-lg">
            <strong>{data.summary.required} required</strong> · {data.summary.optional} optional · {plural(data.summary.questions, 'question')}
          </p>
          <label className="mt-3 inline-flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={requiredOnly} onChange={(e) => setRequiredOnly(e.target.checked)} className="size-5" />
            Show required only
          </label>
          {data.files.length === 0 && <p>No review comments yet.</p>}
          <ReviewList files={data.files} requiredOnly={requiredOnly} />
        </section>
      )}
    </>
  );
}
