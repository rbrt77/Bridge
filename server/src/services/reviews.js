// Owner: Track C (F4). Output shape = server/src/mocks/review.json. Explains intent + convention, never emotions.
import { generateJson } from './llm.js';
import { retrieve } from './retrieval.js';
import { getIssue, getIssueComments, getPullComments, getPullReviews, getText, parseGithubUrl } from '../integrations/github.js';
import { SYSTEM, SCHEMA } from '../prompts/review.js';

const GENERAL = '(general)';
const MAX_HUNK_LINES = 12;

// CONTRIBUTING.md > Review conventions. A comment without a prefix is a question.
export function kindOf(body) {
  const prefix = /^\s*\**\s*([a-z]+)\s*\**\s*:/i.exec(body)?.[1]?.toLowerCase();
  if (prefix === 'blocking') return 'required';
  if (prefix === 'nit' || prefix === 'suggestion') return 'optional';
  return 'question';
}

export async function explainReview({ pr_url, orgId }) {
  if (!pr_url) throw Object.assign(new Error('Send pr_url'), { status: 400, expose: true });
  const ref = parseGithubUrl(pr_url);
  const repo = `${ref.owner}/${ref.repo}`;
  const [pr, inline, reviews, general] = await Promise.all([getIssue(ref), getPullComments(ref), getPullReviews(ref), getIssueComments(ref)]);
  const comments = collect(pr.user?.login, inline, reviews, general);
  if (!comments.length) return { pr: `#${pr.number} ${pr.title}`, summary: { required: 0, optional: 0, questions: 0 }, files: [] };

  const context = await loadContext(repo, orgId);
  const { comments: explained } = await generateJson({
    system: SYSTEM,
    schema: SCHEMA,
    name: 'review_explained',
    input: buildPrompt(comments, context),
  });
  const byId = new Map(explained.map((e) => [e.id, e]));
  // The kind comes from the review conventions, so they back any comment the model left without a known source.
  const conventions = context.find((p) => /review conventions/i.test(p.label))?.label ?? 'Reviewer comment';
  const section = (label) => label.split(' > ').at(-1).toLowerCase();
  const sourceOf = (s) => context.find((p) => p.label === s || section(p.label) === section(s))?.label ?? conventions;

  const files = new Map();
  for (const c of comments) {
    const e = byId.get(c.id) ?? { what_to_change: c.body, why: '', source: 'Reviewer comment', suggested_reply: '' };
    if (!files.has(c.path)) files.set(c.path, []);
    files.get(c.path).push({
      id: c.id, author: c.author, original: c.body, kind: c.kind,
      what_to_change: e.what_to_change, why: e.why, source: sourceOf(e.source), suggested_reply: e.suggested_reply,
    });
  }
  const count = (k) => comments.filter((c) => c.kind === k).length;
  return {
    pr: `#${pr.number} ${pr.title}`,
    summary: { required: count('required'), optional: count('optional'), questions: count('question') },
    files: [...files].map(([path, list]) => ({ path, comments: list })),
  };
}

/** Root review comments; replies join their thread. Review bodies and PR conversation from others go under "(general)". */
function collect(prAuthor, inline, reviews, general) {
  const roots = inline.filter((c) => !c.in_reply_to_id);
  const replies = inline.filter((c) => c.in_reply_to_id);
  const items = [
    ...roots.map((c) => ({
      author: c.user?.login, body: c.body, path: c.path, line: c.line ?? c.original_line,
      hunk: c.diff_hunk?.split('\n').slice(-MAX_HUNK_LINES).join('\n'),
      thread: replies.filter((r) => r.in_reply_to_id === c.id).map((r) => `@${r.user?.login}: ${r.body}`),
    })),
    ...[...reviews, ...general]
      .filter((c) => c.user?.login !== prAuthor)
      .map((c) => ({ author: c.user?.login, body: c.body, path: GENERAL, thread: [] })),
  ];
  return items
    .filter((c) => c.body?.trim())
    .map((c, i) => ({ ...c, id: i + 1, kind: kindOf(c.body) }));
}

async function loadContext(repo, orgId) {
  try {
    const { chunks, sources } = await retrieve({ question: 'code review conventions blocking nit suggestion question; performance, naming, tests rules', history: [], orgId, docTypes: ['repo_doc', 'handbook', 'procedure'] });
    if (chunks?.length) return chunks.map((c, i) => ({ label: [sources[i]?.title, sources[i]?.section_path?.split(' > ').at(-1)].filter(Boolean).join(' > '), text: c.text ?? c.content }));
  } catch (err) {
    if (err.code !== 'not_implemented') console.warn('review context: retrieve failed, reading CONTRIBUTING.md', err.message);
  }
  try {
    return splitSections('CONTRIBUTING.md', await getText(repo, 'CONTRIBUTING.md'));
  } catch {
    return [];
  }
}

/** "## Heading" sections of a markdown file → [{ label: "FILE > Heading", text }]. */
function splitSections(title, markdown) {
  return markdown.split(/^## /m).slice(1).map((s) => {
    const [heading, ...rest] = s.split('\n');
    return { label: `${title} > ${heading.trim()}`, text: rest.join('\n').trim() };
  });
}

function buildPrompt(comments, context) {
  const list = comments.map((c) => [
    `COMMENT id=${c.id} KIND=${c.kind} by @${c.author} on ${c.path}${c.line ? `:${c.line}` : ''}`,
    `"${c.body}"`,
    c.hunk ? `Code (the comment points at the last line):\n${c.hunk}` : '',
    c.thread.length ? `Thread:\n${c.thread.join('\n')}` : '',
  ].filter(Boolean).join('\n'));
  return [
    `CONTEXT:\n${context.map((p) => `[${p.label}]\n${p.text}`).join('\n\n') || '(none)'}`,
    `COMMENTS:\n\n${list.join('\n\n')}`,
  ].join('\n\n---\n\n');
}
