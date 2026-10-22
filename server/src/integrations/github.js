// Owner: Track A (repo docs, tree, CODEOWNERS) + Track C (issues, PRs). Read-only fine-grained token. Cache responses.
import { env } from '../env.js';

const cache = new Map();
async function gh(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: 'application/vnd.github+json', ...(env.githubToken && { Authorization: `Bearer ${env.githubToken}` }) },
  });
  if (!res.ok) throw Object.assign(new Error(`GitHub ${res.status} on ${path}`), { status: 502, expose: true });
  const data = await res.json();
  cache.set(path, data);
  return data;
}

/** "https://github.com/o/r/issues/142" → { owner, repo, number } */
export function parseGithubUrl(url) {
  const m = /github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)/.exec(url);
  if (!m) throw Object.assign(new Error('Not a GitHub issue/PR link'), { status: 400, expose: true });
  return { owner: m[1], repo: m[2], number: Number(m[3]) };
}

export const getIssue = ({ owner, repo, number }) => gh(`/repos/${owner}/${repo}/issues/${number}`);
export const getIssueComments = ({ owner, repo, number }) => gh(`/repos/${owner}/${repo}/issues/${number}/comments`);
export const getPullComments = ({ owner, repo, number }) => gh(`/repos/${owner}/${repo}/pulls/${number}/comments`);
export const getPullReviews = ({ owner, repo, number }) => gh(`/repos/${owner}/${repo}/pulls/${number}/reviews`);
export const getTree = (fullRepo, ref = 'HEAD') => gh(`/repos/${fullRepo}/git/trees/${ref}?recursive=1`);
export const getContent = (fullRepo, path) => gh(`/repos/${fullRepo}/contents/${path}`);
export const listIssues = (fullRepo) => gh(`/repos/${fullRepo}/issues?state=all&per_page=30`);
export const getRepo = (fullRepo) => gh(`/repos/${fullRepo}`);

/** Decoded text of a file (contents API returns base64). Not cached: sync must see fresh docs. */
export async function getText(fullRepo, path) {
  cache.delete(`/repos/${fullRepo}/contents/${path}`);
  const file = await getContent(fullRepo, path);
  return Buffer.from(file.content, file.encoding).toString('utf8');
}

const DOC_PATH = /^(?:[^/]+\.md|docs\/.+\.md|\.github\/.+\.md)$/i;
const CODEOWNERS_PATHS = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'];

/** Markdown docs in root, docs/ and .github/ + the CODEOWNERS path (if any). */
export async function listRepoDocs(fullRepo) {
  const { default_branch: branch } = await getRepo(fullRepo);
  cache.delete(`/repos/${fullRepo}/git/trees/${branch}?recursive=1`);
  const { tree } = await getTree(fullRepo, branch);
  const blobs = tree.filter((t) => t.type === 'blob');
  return {
    branch,
    docs: blobs.filter((t) => DOC_PATH.test(t.path)).map((t) => ({ path: t.path, sha: t.sha })),
    codeownersPath: CODEOWNERS_PATHS.find((p) => blobs.some((t) => t.path === p)) ?? null,
  };
}

/** "docs/billing/ @ana @bob" → [{ pattern: 'docs/billing/', owners: ['ana','bob'] }] */
export function parseCodeowners(text) {
  return text
    .split('\n')
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map((l) => {
      const [pattern, ...owners] = l.split(/\s+/);
      return { pattern, owners: owners.map((o) => o.replace(/^@/, '')) };
    })
    .filter((r) => r.owners.length);
}
