// Owner: Track C (F2). Output shape = server/src/mocks/ticket.json.
import { env } from '../env.js';
import { generateJson } from './llm.js';
import { retrieve } from './retrieval.js';
import { getIssue, getIssueComments, getTree, parseGithubUrl } from '../integrations/github.js';
import { SYSTEM, SCHEMA, FALLBACK_CONTEXT } from '../prompts/ticket.js';

const MAX_IMAGES = 4;
const MAX_CANDIDATE_FILES = 25;
const DOC_TYPES = ['handbook', 'procedure', 'repo_doc', 'adr'];
const STOPWORDS = new Set('the and for with that this from should only when what have will been into page show user users button file data make need same like also more than them they their there which would could about after before'.split(' '));

export async function decodeTicket({ issue_url, text, orgId }) {
  const ticket = await loadTicket({ issue_url, text });
  const [context, candidates] = await Promise.all([loadContext(ticket, orgId), candidateFiles(ticket)]);

  const out = await generateJson({
    system: SYSTEM,
    schema: SCHEMA,
    name: 'ticket_decoded',
    input: [{ role: 'user', content: [{ type: 'input_text', text: buildPrompt(ticket, context, candidates) }, ...ticket.images.map((url) => ({ type: 'input_image', image_url: url }))] }],
  });

  const { cited_sources, ...decoded } = out;
  if (ticket.title) decoded.title = ticket.title;
  if (candidates) {
    const known = new Set(candidates);
    decoded.files = decoded.files.filter((f) => known.has(f.path));
  }
  decoded.images = decoded.images.slice(0, ticket.images.length);
  decoded.sources = context.filter((c) => cited_sources.includes(c.source.id)).map((c) => c.source);
  return decoded;
}

async function loadTicket({ issue_url, text }) {
  if (issue_url) {
    const ref = parseGithubUrl(issue_url);
    const [issue, comments] = await Promise.all([getIssue(ref), getIssueComments(ref)]);
    const body = [issue.body ?? '', ...comments.map((c) => `Comment by @${c.user?.login}:\n${c.body ?? ''}`)].join('\n\n');
    return {
      title: `#${issue.number} ${issue.title}`,
      body: `${issue.title}\n\n${body}`,
      labels: issue.labels?.map((l) => l.name) ?? [],
      repo: `${ref.owner}/${ref.repo}`,
      images: extractImages(body),
    };
  }
  if (!text?.trim()) throw Object.assign(new Error('Send issue_url or text'), { status: 400, expose: true });
  return { title: null, body: text, labels: [], repo: env.demoRepo, images: extractImages(text) };
}

/** Markdown ![alt](url) and <img src="url"> → absolute http(s) URLs, deduped. */
function extractImages(markdown) {
  const urls = [...markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)/g), ...markdown.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+)/g)].map((m) => m[1]);
  return [...new Set(urls)].slice(0, MAX_IMAGES);
}

async function loadContext(ticket, orgId) {
  try {
    const question = `${ticket.body.split('\n')[0].slice(0, 200)}. Definition of Done, contributing rules, architecture`;
    const { chunks, sources } = await retrieve({ question, history: [], orgId, docTypes: DOC_TYPES });
    if (!chunks?.length) return FALLBACK_CONTEXT;
    return chunks.map((c, i) => ({ source: sources[i] ?? { id: `S${i + 1}` }, content: c.text ?? c.content }));
  } catch (err) {
    if (err.code !== 'not_implemented') console.warn('ticket context: retrieve failed, using fallback', err.message);
    return FALLBACK_CONTEXT;
  }
}

/** Keyword match of ticket words against repo paths. Returns null when the tree is unavailable. */
async function candidateFiles(ticket) {
  let tree;
  try {
    tree = await getTree(ticket.repo);
  } catch (err) {
    console.warn('ticket files: no repo tree', err.message);
    return null;
  }
  const words = new Set(
    ticket.body
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
      .map(stem),
  );
  return tree.tree
    .filter((n) => n.type === 'blob' && !/(^|\/)(node_modules|dist|build|\.git)\//.test(n.path))
    .map((n) => {
      const parts = n.path.split(/[^A-Za-z0-9]+|(?<=[a-z])(?=[A-Z])/).filter(Boolean).map((p) => stem(p.toLowerCase()));
      return { path: n.path, score: parts.filter((p) => words.has(p)).length };
    })
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATE_FILES)
    .map((f) => f.path);
}

const stem = (w) => w.replace(/s$/, '');

function buildPrompt(ticket, context, candidates) {
  return [
    `TICKET${ticket.labels.length ? ` (labels: ${ticket.labels.join(', ')})` : ''}:\n${ticket.body}`,
    `CONTEXT:\n${context.map((c) => `[${c.source.id}] ${c.source.title ?? ''}${c.source.section_path ? ` > ${c.source.section_path}` : ''}\n${c.content}`).join('\n\n')}`,
    `CANDIDATE FILES:\n${candidates?.length ? candidates.join('\n') : '(none available)'}`,
    `ATTACHED IMAGES: ${ticket.images.length}`,
  ].join('\n\n---\n\n');
}
