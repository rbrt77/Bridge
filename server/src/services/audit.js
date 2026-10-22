// Owner: Track A + D (F9). Criteria in data/audit_criteria.dev.json (D). Output = mocks/audit.json.
// Layer 1: repo checks through the GitHub API. Layer 2: one LLM-judge call per process criterion, on retrieve() results.
import { readFileSync } from 'node:fs';
import { generateJson } from './llm.js';
import { retrieve } from './retrieval.js';
import { getRepo, getTree, getText, listIssues } from '../integrations/github.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';
import { SYSTEM, SCHEMA, buildInput } from '../prompts/audit.js';

const CRITERIA = JSON.parse(readFileSync(new URL('../../data/audit_criteria.dev.json', import.meta.url), 'utf8'));
const NO_EVIDENCE = 'No evidence found in the repo/docs.';
const MAX_MD_FILES = 40;
const STATUS_POINTS = { ok: 1, partial: 0.5, missing: 0 };

export const priority = (f) => (f.impact * (f.mandatory ? 1.5 : 1) * ({ missing: 1, partial: 0.5 }[f.status] ?? 0)) / f.effort;

/**
 * @param {string} repo  "owner/name"
 * @param {{orgId:string}} user
 * @param {{full?:boolean}} [opts]  full = whole catalog; default = v1 (6 repo checks + 6 process criteria)
 */
export async function runAudit(repo, user, { full = false } = {}) {
  const pick = (list) => list.filter((c) => full || c.v1);
  const [repoResults, processResults] = await Promise.all([
    runRepoChecks(repo, pick(CRITERIA.repo_checks)),
    Promise.all(pick(CRITERIA.process_criteria).map((c) => judge(c, user.orgId))),
  ]);
  const results = [...repoResults, ...processResults].filter(Boolean);

  const weight = (r) => r.impact * (r.mandatory ? 1.5 : 1);
  const total = results.reduce((s, r) => s + weight(r), 0);
  const earned = results.reduce((s, r) => s + weight(r) * STATUS_POINTS[r.status], 0);
  const score = total ? Math.round((100 * earned) / total) : 0;

  const findings = results
    .filter((r) => r.status !== 'ok')
    .map((r) => ({ ...r, priority: Math.round(priority(r) * 100) / 100 }))
    .sort((a, b) => b.priority - a.priority);
  const passed = results.filter((r) => r.status === 'ok').map(({ id, title, evidence }) => ({ id, title, evidence }));
  const quick_wins = findings.filter((f) => f.effort === 1).slice(0, 3).map((f) => f.first_step);

  const out = { repo, score, findings, passed, quick_wins };
  await saveRun(out, user.orgId);
  return out;
}

// ---------- Layer 1: repo checks ----------

async function runRepoChecks(repo, checks) {
  const { default_branch: branch } = await getRepo(repo);
  const { tree } = await getTree(repo, branch);
  const paths = tree.filter((t) => t.type === 'blob').map((t) => t.path);
  const find = (re) => paths.find((p) => re.test(p));
  const texts = new Map();
  // A failed read (e.g. GitHub rate limit) throws, so the check is skipped instead of reporting a wrong status.
  const read = async (path) => {
    if (!texts.has(path)) texts.set(path, await getText(repo, path));
    return texts.get(path);
  };
  let issues;
  const recentIssues = async () => (issues ??= (await listIssues(repo)).filter((i) => !i.pull_request));

  const CHECKS = {
    'readme-getting-started': async () => {
      const readme = find(/^readme\.md$/i);
      if (!readme) return ['missing', 'No README.md in the repository root.'];
      const heading = (await read(readme)).match(/^#{1,6}\s*(getting started|quick ?start|setup|installation)\b.*$/im);
      return heading ? ['ok', `${readme} → "${heading[0].trim()}"`] : ['partial', `${readme} has no "Getting started" section.`];
    },
    'setup-guide': async () => {
      const setup = find(/(^|\/)(setup|install(ation)?|getting[-_ ]started)[^/]*\.md$/i);
      const known = find(/(known[-_ ]?issues|troubleshoot)[^/]*\.md$/i);
      if (setup && known) return ['ok', `${setup}, ${known}`];
      if (setup || known) return ['partial', `Found ${setup ?? known}; no ${setup ? 'known issues / troubleshooting page' : 'setup guide'}.`];
      return ['missing', 'No setup guide and no known issues page.'];
    },
    'contributing-review': async () => {
      const file = find(/^(\.github\/|docs\/)?contributing\.md$/i);
      if (!file) return ['missing', 'No CONTRIBUTING.md.'];
      const conv = (await read(file)).match(/^.*\b(nit|blocking|must[- ]fix|optional):.*$/im);
      return conv ? ['ok', `${file} → "${conv[0].trim().slice(0, 120)}"`] : ['partial', `${file} has no review conventions.`];
    },
    'pr-how-to-test': async () => {
      const file = find(/^(\.github\/|docs\/)?pull_request_template\.md$/i) ?? find(/^\.github\/pull_request_template\//i);
      if (!file) return ['missing', 'No pull request template.'];
      const text = await read(file);
      if (/^#{1,6}\s*(how to test|testing|test plan)\b/im.test(text)) return ['ok', `${file} has a testing section.`];
      const headings = [...text.matchAll(/^#{1,6}\s*(.+)$/gm)].map((m) => `"${m[1].trim()}"`);
      return ['partial', `${file} has only ${headings.join(', ') || 'no sections'}; no "How to test".`];
    },
    'issue-templates': async () => {
      const files = paths.filter((p) => /^\.github\/ISSUE_TEMPLATE\//i.test(p));
      if (!files.length) return ['missing', 'No files in .github/ISSUE_TEMPLATE/.'];
      for (const f of files) if (/acceptance criteria/i.test(await read(f))) return ['ok', `${f} asks for acceptance criteria.`];
      return ['partial', `${files.length} issue template(s), none asks for acceptance criteria.`];
    },
    'issues-with-ac': async () => {
      const list = await recentIssues();
      if (!list.length) return ['missing', 'No issues in the repository.'];
      const withAc = list.filter((i) => /acceptance criteria|- \[ \]/i.test(i.body ?? '')).length;
      const share = withAc / list.length;
      return [share >= 0.7 ? 'ok' : share >= 0.3 ? 'partial' : 'missing', `${withAc} of the last ${list.length} issues have acceptance criteria.`];
    },
    'good-first-issues': async () => {
      const open = (await recentIssues()).filter((i) => i.state === 'open' && i.labels?.some((l) => /good first issue/i.test(l.name)));
      const nums = open.map((i) => `#${i.number}`).join(', ');
      if (open.length >= 3) return ['ok', `${open.length} open good first issues (${nums}).`];
      return [open.length ? 'partial' : 'missing', open.length ? `Only ${open.length} open good first issue(s) (${nums}).` : 'No open issue labelled "good first issue".'];
    },
    codeowners: async () => {
      const file = find(/^(\.github\/|docs\/)?CODEOWNERS$/);
      return file ? ['ok', file] : ['missing', 'No CODEOWNERS file.'];
    },
    'alt-text': async () => {
      const md = paths.filter((p) => /\.md$/i.test(p)).slice(0, MAX_MD_FILES);
      const hits = [];
      for (const p of md) {
        const n = [...(await read(p)).matchAll(/!\[\s*\]\([^)]+\)/g)].length;
        if (n) hits.push(`${p} (${n})`);
      }
      const count = hits.reduce((s, h) => s + Number(h.match(/\((\d+)\)$/)[1]), 0);
      return count ? ['missing', `${count} image(s) without alt text: ${hits.join(', ')}.`] : ['ok', 'Every Markdown image has alt text.'];
    },
    'architecture-adr': async () => {
      const arch = find(/^(docs\/)?architecture[^/]*\.md$/i);
      const adrs = paths.filter((p) => /(^|\/)adrs?\/.+\.md$/i.test(p));
      if (arch && adrs.length) return ['ok', `${arch}, ${adrs.length} ADR(s) in ${adrs[0].replace(/[^/]+$/, '')}`];
      if (arch || adrs.length) return ['partial', arch ? `${arch}, but no ADRs.` : `${adrs.length} ADR(s), but no ARCHITECTURE.md.`];
      return ['missing', 'No ARCHITECTURE.md and no ADRs.'];
    },
  };

  return Promise.all(
    checks.map(async (c) => {
      if (!CHECKS[c.id]) return null; // e.g. readability: not implemented yet
      try {
        const [status, evidence] = await CHECKS[c.id]();
        return toResult(c, status, evidence, 'repo');
      } catch (err) {
        logger.warn(`audit check ${c.id} failed:`, err.message);
        return null;
      }
    }),
  );
}

// ---------- Layer 2: LLM-judge on company documents ----------

async function judge(criterion, orgId) {
  let found;
  try {
    found = await retrieve({ question: criterion.judge, orgId, neighbours: false });
  } catch (err) {
    logger.warn(`audit judge ${criterion.id}: retrieve failed:`, err.message);
    return null;
  }
  if (found.abstain || !found.chunks.length) return toResult(criterion, 'missing', NO_EVIDENCE, 'docs');

  const verdict = await generateJson({ system: SYSTEM, schema: SCHEMA, name: 'audit_judge', input: buildInput({ criterion, chunks: found.chunks }) });
  if (verdict.status === 'missing') return toResult(criterion, 'missing', verdict.gap || NO_EVIDENCE, 'docs');

  // Keep only quotes that really are in the cited chunk, so the evidence can be checked by a person.
  const chunk = found.chunks.find((c) => c.label === verdict.source);
  const flat = (s) => s.replace(/\s+/g, ' ').toLowerCase();
  const quoteOk = chunk && verdict.quote && flat(chunk.text).includes(flat(verdict.quote));
  // section_path already starts with the title for Markdown uploads ("Handbook > 3. … > 3.3 DoD").
  const section = chunk?.section_path?.startsWith(chunk.title) ? chunk.section_path : [chunk?.title, chunk?.section_path].filter(Boolean).join(' > ');
  const where = chunk ? [section, chunk.page && `p.${chunk.page}`].filter(Boolean).join(', ') : '';
  const evidence = [quoteOk ? `${where}: "${verdict.quote}"` : where, verdict.gap].filter(Boolean).join(' · ');
  return toResult(criterion, verdict.status, evidence || NO_EVIDENCE, 'docs');
}

function toResult(c, status, evidence, layer) {
  return { id: c.id, title: c.title, status, mandatory: c.mandatory, impact: c.impact, effort: c.effort, layer, evidence, first_step: c.first_step };
}

async function saveRun(out, orgId) {
  if (!db || !orgId) return;
  try {
    const { data: run, error } = await db.from('audit_runs').insert({ org_id: orgId, repo: out.repo, score: out.score }).select('id').single();
    if (error) throw error;
    const rows = [...out.findings, ...out.passed.map((p) => ({ ...p, status: 'ok' }))].map((f) => ({
      run_id: run.id,
      criterion_id: f.id,
      status: f.status,
      evidence: f.evidence,
      first_step: f.first_step ?? null,
      priority: f.priority ?? 0,
    }));
    const { error: e2 } = await db.from('audit_findings').insert(rows);
    if (e2) throw e2;
    out.run_id = run.id;
  } catch (err) {
    logger.warn('audit: could not save run:', err.message);
  }
}
