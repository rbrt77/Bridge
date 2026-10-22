// Owner: Track D (F10, SHOULD). Steps come from docs/setup.md in the demo repo; errors are matched against
// docs/known-issues.md first (exact, no LLM), then through retrieve() + a strict LLM fix from the docs only.
import { env } from '../env.js';
import { generateJson } from './llm.js';
import { retrieve, toSource } from './retrieval.js';
import { getRepo, getText } from '../integrations/github.js';
import { logger } from '../utils/logger.js';
import { FIX_SCHEMA, FIX_SYSTEM, buildFixInput } from '../prompts/setup.js';

const SETUP_PATH = 'docs/setup.md';
const ISSUES_PATH = 'docs/known-issues.md';
const CACHE_MS = 10 * 60_000;
// Code spans that are commands to run, not file names or repo names.
const COMMAND = /^(npm|npx|nvm|node|git|cp|docker|curl|cd|brew|sudo|yarn|pnpm)\b/;
let cache = null;

export async function getStep(index, repo = env.demoRepo) {
  const { steps } = await loadDocs(repo);
  const i = Math.min(Math.max(Number(index) || 0, 0), steps.length - 1);
  return { ...steps[i], index: i, total: steps.length };
}

export async function findFix(errorText, user, repo = env.demoRepo) {
  const text = String(errorText ?? '').trim();
  if (!text) return null;
  const { issues, branch } = await loadDocs(repo);

  const known = matchKnownIssue(text, issues);
  if (known) {
    return {
      found: true,
      issue: known.title,
      why: known.why,
      fix: known.fix,
      source: { id: 'S1', title: 'known-issues.md', section_path: known.title, page: null, url: `https://github.com/${repo}/blob/${branch}/${ISSUES_PATH}`, doc_type: 'repo_doc', approved_by: null },
    };
  }

  // Not a known error: look in all team docs, answer only if a document states the fix.
  try {
    const found = await retrieve({ question: `How do I fix this error during local setup? ${text.slice(0, 500)}`, orgId: user?.orgId, neighbours: false });
    if (!found.abstain && found.chunks.length) {
      const out = await generateJson({ system: FIX_SYSTEM, schema: FIX_SCHEMA, name: 'setup_fix', input: buildFixInput({ errorText: text, chunks: found.chunks }) });
      const chunk = found.chunks.find((c) => c.label === out.source);
      if (out.found && chunk) return { found: true, issue: null, why: out.why, fix: out.fix, source: toSource(chunk, 'S1') };
    }
  } catch (err) {
    logger.warn('setup fix: retrieve failed:', err.message);
  }
  return { found: false, issue: null, why: null, fix: null, source: null };
}

async function loadDocs(repo) {
  if (cache && cache.repo === repo && cache.at > Date.now() - CACHE_MS) return cache;
  const { default_branch: branch } = await getRepo(repo);
  const [setup, issues] = await Promise.all([getText(repo, SETUP_PATH), getText(repo, ISSUES_PATH)]);
  cache = { repo, branch, at: Date.now(), steps: parseSteps(setup), issues: parseIssues(issues) };
  return cache;
}

/** "**5. Start Postgres and Redis.** `docker compose up -d` … Check: …" → one object per numbered step. */
export function parseSteps(markdown) {
  const parts = markdown.split(/^\*\*(\d+)\.\s+(.+?)\*\*/m);
  const steps = [];
  for (let i = 1; i < parts.length; i += 3) {
    const title = parts[i + 1].trim().replace(/\.$/, '');
    const body = parts[i + 2].split(/^## /m)[0]; // stop at the next section
    const text = body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    const [doPart, checkPart] = text.split(/\bCheck:\s*/);
    const command = [...`${title} ${doPart}`.matchAll(/`([^`]+)`/g)].map((m) => m[1]).find((c) => COMMAND.test(c)) ?? null;
    steps.push({
      title: title.replace(/`/g, ''),
      // The command has its own box in the UI: drop it from the sentence.
      text: dropCommand(doPart, command),
      command,
      expect: checkPart ? checkPart.trim() : null,
      if_fails: 'Paste the error text below to find a fix.',
    });
  }
  return steps;
}

// At the start or end of the text the command is removed; inside a sentence it becomes "the command below".
function dropCommand(text, command) {
  if (!command) return text.trim();
  const span = `\`${command}\``;
  const t = text.trim();
  let out;
  if (t.startsWith(span)) out = t.slice(span.length);
  else if (t.endsWith(span)) out = t.slice(0, -span.length).replace(/[\s:]+$/, '.');
  else out = t.replace(span, 'the command below');
  out = out.replace(/^[\s:.]+/, '').trim();
  return out && out[0].toUpperCase() + out.slice(1);
}

/** "## `Error: …`" + **Why:** + **Fix:** → { title, why, fix }. */
export function parseIssues(markdown) {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((section) => {
      const [heading, ...rest] = section.split('\n');
      const body = rest.join('\n');
      const field = (name) => body.match(new RegExp(`\\*\\*${name}:\\*\\*([\\s\\S]*?)(?=\\n\\*\\*\\w+:\\*\\*|$)`))?.[1].replace(/\s+/g, ' ').trim() ?? null;
      return { title: heading.replace(/`/g, '').trim(), why: field('Why'), fix: field('Fix') };
    })
    .filter((s) => s.fix);
}

const tokens = (s) => new Set(s.toLowerCase().match(/[a-z0-9_.:/-]{3,}/g) ?? []);

/** A known issue matches when most of its heading's words appear in the pasted error. */
export function matchKnownIssue(errorText, issues) {
  const err = tokens(errorText);
  let best = null;
  for (const issue of issues) {
    const head = [...tokens(issue.title)];
    if (!head.length) continue;
    const score = head.filter((t) => err.has(t)).length / head.length;
    if (score >= 0.6 && (!best || score > best.score)) best = { ...issue, score };
  }
  return best;
}
