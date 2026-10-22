// Owner: Track B (UI; backend /api/company/* by Track A + D). Admin area: Junior-ready audit (F9), team documents, GitHub repo sync.
// The last audit is kept in sessionStorage (it takes a while to run), like Ask and Tickets.
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAnnounce } from '../a11y/Announcer.jsx';

const KEY = 'bridge.audit';
const DEMO_REPO = 'brightline-software/invoicing-service';
const DOC_TYPES = [['handbook', 'Handbook'], ['procedure', 'Procedure'], ['legal', 'Policy or legal'], ['faq', 'FAQ']];

const level = (score) => (score >= 80 ? 'Ready for a junior' : score >= 50 ? 'Getting there' : 'Not ready yet');
const STATUS = { missing: 'Missing', partial: 'Partly there' };

function Badge({ children, className = '' }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-sm font-medium ${className}`}>{children}</span>;
}

function Finding({ f }) {
  return (
    <li className="rounded-xl border border-border-subtle p-4">
      <h4 className="font-semibold">{f.title}</h4>
      <p className="mt-1 flex flex-wrap gap-2">
        <Badge className={f.status === 'missing' ? 'border-danger text-danger' : 'border-border text-fg'}>{STATUS[f.status] ?? f.status}</Badge>
        {f.mandatory && <Badge className="border-accent bg-accent-soft text-accent">Required</Badge>}
        <Badge className="border-border-subtle text-muted">{f.layer === 'repo' ? 'In the repo' : 'In the team docs'}</Badge>
      </p>
      <dl className="mt-3 grid gap-2">
        <div>
          <dt className="text-sm font-semibold">What we found</dt>
          <dd className="text-muted">{f.evidence}</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold">First step</dt>
          <dd>{f.first_step}</dd>
        </div>
      </dl>
    </li>
  );
}

function Audit() {
  const announce = useAnnounce();
  const [result, setResult] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(result)); } catch { /* private mode */ }
  }, [result]);

  const run = async () => {
    setBusy(true);
    setError('');
    announce('Running the audit. This can take a minute.');
    try {
      const r = await api('/company/audit', { method: 'POST', body: {} });
      setResult(r);
      announce(`Audit ready: ${r.score} out of 100, ${r.findings.length} gaps to fix.`);
    } catch (e) {
      setError(e.message);
      announce(`The audit failed: ${e.message}`, { urgent: true });
    } finally {
      setBusy(false);
    }
  };

  const findings = result ? [...result.findings].sort((a, b) => b.priority - a.priority) : [];
  return (
    <section aria-labelledby="audit-h" className="card mt-8">
      <h2 id="audit-h" className="text-xl font-semibold">Junior-ready audit</h2>
      <p className="mt-1 max-w-prose text-muted">
        Checks the repo and the team docs against what a new junior developer needs: setup, issue templates, review rules,
        adjustments policy and more. Every gap comes with the evidence and a first step.
      </p>
      <button type="button" onClick={run} disabled={busy} className="btn btn-primary mt-4">
        {busy ? 'Running audit…' : result ? 'Run the audit again' : 'Run the audit'}
      </button>
      {error && <p role="alert" className="mt-2 text-danger">The audit failed: {error}</p>}

      {result && (
        <div className="mt-6">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <p>
              <span className="text-5xl font-bold">{result.score}</span>
              <span className="text-xl text-muted">/100</span>
              <span className="sr-only"> points</span>
            </p>
            <div>
              <p className="text-lg font-semibold">{level(result.score)}</p>
              <p className="text-muted">{result.repo}</p>
            </div>
          </div>
          <div aria-hidden="true" className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-accent-soft">
            <div className="h-full rounded-full bg-accent" style={{ width: `${result.score}%` }} />
          </div>

          <h3 className="mt-8 text-lg font-semibold">Gaps to fix ({findings.length})</h3>
          <p className="text-sm text-muted">Most useful first: required items and quick fixes come before the rest.</p>
          {findings.length === 0 ? <p className="mt-2">No gaps. Nice work.</p> : <ol className="mt-3 grid gap-3">{findings.map((f) => <Finding key={f.id} f={f} />)}</ol>}

          {result.quick_wins?.length > 0 && (
            <>
              <h3 className="mt-8 text-lg font-semibold">Quick wins</h3>
              <ul className="mt-2 list-disc space-y-1 pl-6">{result.quick_wins.map((q) => <li key={q}>{q}</li>)}</ul>
            </>
          )}

          {result.passed?.length > 0 && (
            <details className="mt-8">
              <summary className="cursor-pointer text-lg font-semibold">Already in place ({result.passed.length})</summary>
              <ul className="mt-2 grid gap-2">
                {result.passed.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium">{p.title}</span>
                    <span className="block text-sm text-muted">{p.evidence}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function Documents() {
  const announce = useAnnounce();
  const [files, setFiles] = useState([]);
  const [docType, setDocType] = useState('handbook');
  const [state, setState] = useState({ busy: false, error: '', documents: null });

  const upload = async (e) => {
    e.preventDefault();
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    form.append('doc_type', docType);
    setState({ busy: true, error: '', documents: null });
    try {
      const { documents } = await api('/company/ingest', { method: 'POST', form });
      setState({ busy: false, error: '', documents });
      announce(`Added ${documents.length} document${documents.length === 1 ? '' : 's'}. Ask can answer from them now.`);
    } catch (err) {
      setState({ busy: false, error: err.message, documents: null });
      announce(`Upload failed: ${err.message}`, { urgent: true });
    }
  };

  return (
    <form onSubmit={upload} aria-labelledby="docs-h" className="card mt-6 grid gap-4">
      <h2 id="docs-h" className="text-xl font-semibold">Team documents</h2>
      <p className="-mt-2 max-w-prose text-muted">Handbooks, procedures and policies. Ask answers from them and cites them.</p>
      <div className="grid gap-1">
        <label htmlFor="docs-files" className="font-medium">Files (PDF, Word, Markdown or text)</label>
        <input id="docs-files" type="file" multiple accept=".pdf,.docx,.md,.txt" onChange={(e) => setFiles([...e.target.files])} className="field w-full min-w-0 py-2" required />
      </div>
      <div className="grid max-w-xs gap-1">
        <label htmlFor="docs-type" className="font-medium">What kind of document</label>
        <select id="docs-type" value={docType} onChange={(e) => setDocType(e.target.value)} className="field">
          {DOC_TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={state.busy || files.length === 0} className="btn btn-primary justify-self-start">
        {state.busy ? 'Adding…' : 'Add to team docs'}
      </button>
      {state.error && <p role="alert" className="text-danger">Upload failed: {state.error}</p>}
      {state.documents && (
        <ul className="grid gap-1">
          {state.documents.map((d) => <li key={d.id}><span className="font-medium">{d.title}</span>: {d.chunks} passages</li>)}
        </ul>
      )}
    </form>
  );
}

function RepoSync() {
  const announce = useAnnounce();
  const [repo, setRepo] = useState(DEMO_REPO);
  const [state, setState] = useState({ busy: false, error: '', result: null });

  const sync = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: '', result: null });
    try {
      const result = await api('/company/ingest-repo', { method: 'POST', body: { repo: repo.trim() } });
      setState({ busy: false, error: '', result });
      announce(`Repo synced: ${result.synced} files.`);
    } catch (err) {
      setState({ busy: false, error: err.message, result: null });
      announce(`Sync failed: ${err.message}`, { urgent: true });
    }
  };
  const r = state.result;

  return (
    <form onSubmit={sync} aria-labelledby="repo-h" className="card mt-6 grid gap-4">
      <h2 id="repo-h" className="text-xl font-semibold">GitHub repo</h2>
      <p className="-mt-2 max-w-prose text-muted">Reads the README, docs, CODEOWNERS and the code: the glossary, who to ask and where things live in the code come from here.</p>
      <div className="grid max-w-md gap-1">
        <label htmlFor="repo-name" className="font-medium">Repo (owner/name)</label>
        <input id="repo-name" value={repo} onChange={(e) => setRepo(e.target.value)} pattern="[\w.-]+/[\w.-]+" spellCheck={false} className="field" required />
      </div>
      <button type="submit" disabled={state.busy || !repo.trim()} className="btn justify-self-start">{state.busy ? 'Syncing…' : 'Sync repo'}</button>
      {state.error && <p role="alert" className="text-danger">Sync failed: {state.error}</p>}
      {r && (
        <p>
          Synced {r.synced} files. Found {r.glossary_terms} glossary terms and {r.topic_owners} topic owners
          {r.code_files != null && `, and mapped ${r.code_files} code files`}.
        </p>
      )}
    </form>
  );
}

export default function Company() {
  return (
    <>
      <h1 className="text-3xl font-bold">Company</h1>
      <p className="mt-2 max-w-prose text-muted">How ready your team is for a junior developer, and the documents Bridge answers from.</p>
      <Audit />
      <Documents />
      <RepoSync />
    </>
  );
}
