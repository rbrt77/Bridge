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
// TODO(A): listRepoDocs(repo) → *.md in root, docs/, .github/ ; parseCodeowners(text) → [{ pattern, owners }]
