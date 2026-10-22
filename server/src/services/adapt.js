// Owner: Track A (E1 generation + E3 adaptation rules). PLAN §7 Generation.
import { randomUUID } from 'node:crypto';
import { env } from '../env.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';
import { retrieve } from './retrieval.js';
import { streamText, generateJson } from './llm.js';
import { SYSTEM, NO_ANSWER, buildInput, ENRICH_SYSTEM, ENRICH_SCHEMA } from '../prompts/ask.js';

/** Profile → extra system rules. Track B owns the Prefs shape (docs/API.md). */
export function rulesFromPrefs(prefs = {}) {
  const o = prefs?.output ?? {};
  const rules = [];
  if (o.tldr) rules.push('Start with a one-line TL;DR.');
  if (o.steps) rules.push('Use numbered steps for any procedure.');
  if (o.literal) rules.push('Use literal language: no idioms, metaphors or sarcasm.');
  if (o.screenReader) rules.push('Use headings and lists; never use tables or ASCII art.');
  return { rules, verbosity: { short: 'low', normal: 'medium', detailed: 'high' }[o.length] ?? 'medium' };
}

// answer_id → retrieval + answer, so Shorter/Simpler/More/Steps reuse the same documents (A10).
const answers = new Map();
const ANSWER_TTL_MS = 30 * 60_000;
function remember(entry) {
  const id = randomUUID();
  answers.set(id, { ...entry, at: Date.now() });
  for (const [k, v] of answers) if (v.at < Date.now() - ANSWER_TTL_MS) answers.delete(k);
  return id;
}

/**
 * Streams text through, removing [S#] labels that don't exist. Holds back a possibly
 * unfinished "[S1" at the end of a delta until the next one arrives.
 */
export function citationFilter(validLabels, emit) {
  let pending = '';
  const cited = new Set();
  const clean = (s) =>
    s.replace(/\[(S\d+)\]/g, (m, label) => {
      if (!validLabels.has(label)) return '';
      cited.add(label);
      return m;
    });
  return {
    push(delta) {
      pending += delta;
      const open = pending.lastIndexOf('[');
      const hold = open !== -1 && !pending.includes(']', open) && pending.length - open < 8 ? pending.slice(open) : '';
      const out = clean(pending.slice(0, pending.length - hold.length));
      pending = hold;
      if (out) emit(out);
    },
    flush() {
      const out = clean(pending);
      pending = '';
      if (out) emit(out);
    },
    cited,
  };
}

async function handoff({ question, user, checked }) {
  let helper = null;
  if (user.managerId) {
    const { data } = await db
      .from('organization_members')
      .select('user_id, display_name, role')
      .eq('org_id', user.orgId)
      .eq('user_id', user.managerId)
      .maybeSingle();
    if (data) helper = { id: data.user_id, name: data.display_name, role: data.role === 'manager' ? 'Engineering Manager' : data.role };
  }
  const { data: owners } = await db.from('topic_owners').select('pattern, owner_login').eq('org_id', user.orgId);
  const words = new Set(question.toLowerCase().match(/[a-z0-9-]{3,}/g) ?? []);
  const owner = (owners ?? []).find((o) => o.pattern.toLowerCase().split(/[/*.]+/).some((seg) => seg.length > 2 && words.has(seg)));
  const titles = [...new Set(checked.map((c) => c.title))].slice(0, 3);
  const greeting = helper ? `Hi ${helper.name},` : 'Hi,';
  const draft = `${greeting} ${question}\n\nWhat I already checked: ${titles.length ? titles.join(', ') : 'the team docs'}. I couldn't find a clear answer.`;
  return { helper, topic_owner: owner ? `${owner.owner_login} owns ${owner.pattern}` : null, draft };
}

async function enrich(answer) {
  const input = answer.replace(/\s*\[S\d+\]/g, '');
  // gpt-5-mini, not nano: nano invented steps. Runs after the stream, so it doesn't cost TTFT.
  return generateJson({ model: env.chatModel, name: 'enrich', schema: ENRICH_SCHEMA, system: ENRICH_SYSTEM, input });
}

export async function answerQuestion({ question, history = [], prefs, mode = 'normal', answer_id, user, send }) {
  if (!question?.trim()) throw Object.assign(new Error('Question is empty'), { status: 400, code: 'bad_request', expose: true });

  const previous = answer_id && answers.get(answer_id);
  let retrieval;
  if (previous && previous.orgId === user.orgId && mode !== 'normal') {
    retrieval = previous.retrieval;
    question = previous.question;
  } else {
    send('status', { message: 'Searching team docs…' });
    retrieval = await retrieve({ question, history, orgId: user.orgId });
  }

  if (retrieval.abstain) {
    send('handoff', await handoff({ question, user, checked: retrieval.candidates }));
    return send('done', { answer_id: null });
  }

  send('status', { message: 'Writing the answer…' });
  const { rules, verbosity } = rulesFromPrefs(prefs);
  const valid = new Set(retrieval.chunks.map((c) => c.label));
  const filter = citationFilter(valid, (text) => send('token', { text }));

  // Hold the first few characters back: the model may decide NO_ANSWER after reading the docs.
  let head = '';
  let streaming = false;
  const full = await streamText({
    system: [SYSTEM, ...rules].join('\n'),
    input: buildInput({ question, chunks: retrieval.chunks, history, previousAnswer: previous?.answer, mode }),
    verbosity: mode === 'shorter' ? 'low' : mode === 'more' ? 'high' : verbosity,
    onDelta: (d) => {
      if (streaming) return filter.push(d);
      head += d;
      if (head.length >= NO_ANSWER.length + 2 || !NO_ANSWER.startsWith(head.trim().slice(0, NO_ANSWER.length))) {
        if (head.trim().startsWith(NO_ANSWER)) return;
        streaming = true;
        filter.push(head);
      }
    },
  });

  if (full.trim().startsWith(NO_ANSWER)) {
    send('handoff', await handoff({ question, user, checked: retrieval.chunks }));
    return send('done', { answer_id: null });
  }
  if (!streaming) filter.push(head);
  filter.flush();

  const cited = retrieval.sources.filter((s) => filter.cited.has(s.id));
  send('sources', { sources: cited.length ? cited : retrieval.sources });

  try {
    send('enrich', await enrich(full));
  } catch (err) {
    logger.warn('enrich failed:', err.message);
  }
  send('done', { answer_id: remember({ orgId: user.orgId, question, retrieval, answer: full }) });
}
