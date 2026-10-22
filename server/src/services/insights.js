// Owner: Track D (F13, SHOULD). Only groups with k >= 5; zero per-person data.
// Themes come from anonymous_questions (no user id). Topics below k are hidden, even by name.
// Gaps: questions in visible themes the docs do not answer explicitly, summarised by the LLM without quoting them.
import { env } from '../env.js';
import { generateJson } from './llm.js';
import { retrieve } from './retrieval.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';
import { ANSWERED_SCHEMA, ANSWERED_SYSTEM, GAPS_SCHEMA, GAPS_SYSTEM } from '../prompts/insights.js';

export const K = 5;
const CACHE_MS = 10 * 60_000;
const cache = new Map();

export async function getInsights(user) {
  const hit = cache.get(user.orgId);
  if (hit && hit.at > Date.now() - CACHE_MS) return hit.data;

  const { data: rows, error } = await db
    .from('anonymous_questions')
    .select('question_redacted, topic, week, is_seed')
    .eq('org_id', user.orgId);
  if (error) throw error;

  const byTopic = new Map();
  for (const r of rows) {
    const topic = r.topic?.trim() || 'other';
    byTopic.set(topic, [...(byTopic.get(topic) ?? []), r]);
  }
  const visible = [...byTopic].filter(([, list]) => list.length >= K).sort((a, b) => b[1].length - a[1].length);

  const unanswered = await Promise.all(visible.map(([topic, list]) => unansweredIn(topic, list, user.orgId)));
  const themes = visible.map(([topic, list], i) => ({ topic, count: list.length, unanswered: unanswered[i].length }));
  const gaps = await summariseGaps(visible.map(([topic], i) => ({ topic, questions: unanswered[i] })));
  const weeks = rows.map((r) => r.week).sort();

  const data = {
    k: K,
    seeded: rows.some((r) => r.is_seed),
    period: weeks.length ? { from: weeks[0], to: weeks[weeks.length - 1] } : null,
    total_questions: rows.length,
    themes,
    hidden_topics: byTopic.size - visible.length,
    gaps,
  };
  cache.set(user.orgId, { at: Date.now(), data });
  return data;
}

async function unansweredIn(topic, list, orgId) {
  const results = await Promise.all(
    list.map(async (r) => {
      try {
        const { abstain, chunks } = await retrieve({ question: r.question_redacted, orgId, neighbours: false });
        if (abstain) return r.question_redacted;
        const docs = chunks.slice(0, 4).map((c) => `<document title="${c.title}">\n${c.text}\n</document>`).join('\n');
        const { answered } = await generateJson({
          model: env.rerankModel,
          system: ANSWERED_SYSTEM,
          schema: ANSWERED_SCHEMA,
          name: 'answered',
          input: `<documents>\n${docs}\n</documents>\n\nQuestion: ${r.question_redacted}`,
        });
        return answered ? null : r.question_redacted;
      } catch (err) {
        logger.warn(`insights: check failed for a question in "${topic}":`, err.message);
        return null;
      }
    }),
  );
  return results.filter(Boolean);
}

async function summariseGaps(groups) {
  const withGaps = groups.filter((g) => g.questions.length);
  if (!withGaps.length) return [];
  try {
    const input = withGaps.map((g) => `Topic: ${g.topic}\n${g.questions.map((q) => `- ${q}`).join('\n')}`).join('\n\n');
    const { gaps } = await generateJson({ system: GAPS_SYSTEM, schema: GAPS_SCHEMA, name: 'insight_gaps', input });
    return gaps.slice(0, withGaps.length);
  } catch (err) {
    logger.warn('insights: gap summary failed:', err.message);
    return withGaps.map((g) => `${g.questions.length} question(s) about ${g.topic} have no answer in the docs.`);
  }
}
