// Owner: Track C. F4: PR URL → '2 required, 3 optional', grouped by file (ReviewList), Required-only filter, Copy reply,
// required changes → a checklist in Today.
import { useState } from 'react';
import { Link } from 'react-router';
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
  const [saved, setSaved] = useState(null); // { title, items } once the required changes are in Today

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api('/reviews/explain', { method: 'POST', body: { pr_url: url } });
      setData(res);
      setSaved(null);
      announce(`${res.summary.required} required, ${res.summary.optional} optional, ${plural(res.summary.questions, 'question')}.`);
    } catch (err) {
      setError(err.message);
      announce(err.message, { urgent: true });
    } finally {
      setBusy(false);
    }
  };

  const required = data?.files.flatMap((f) => f.comments.filter((c) => c.kind === 'required').map((c) => ({ text: `${c.what_to_change} (${f.path})` }))) ?? [];
  const saveRequired = async () => {
    try {
      const { checklist } = await api('/checklists', { method: 'POST', body: { title: `Review ${data.pr}`, source_url: url, items: required } });
      setSaved(checklist);
      announce(`Saved ${plural(required.length, 'required change')} in Today.`);
    } catch (err) {
      setError(`Could not save to Today: ${err.message}`);
      announce(`Could not save to Today: ${err.message}`, { urgent: true });
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
          {required.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={saveRequired} disabled={!!saved} className="btn">
                {saved ? 'Saved in Today' : `Add the ${plural(required.length, 'required change')} to Today`}
              </button>
              {saved && <p>A checklist you can tick is in <Link to="/today">Today</Link>.</p>}
            </div>
          )}
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
