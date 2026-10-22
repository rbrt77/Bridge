// Owner: Track C + D (F7). Catalog in data/dev_adjustments.json (D writes it).
// Needs → adjustments from the catalog (company source + law) → editable letter with needs only, never a diagnosis.
// Nothing here is stored: the choices and the letter live only in the browser until the person sends or copies them.
import { generateJson } from './llm.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';
import { SYSTEM, SCHEMA, buildInput } from '../prompts/adjustments.js';

const LEGAL = {
  'crpd-27': 'UN CRPD, Article 27',
  'dir-2000-78-art5': 'Directive 2000/78/EC, Article 5',
  'law-448-2006-oug-127-2024': 'Law 448/2006 (Romania)',
  'gdpr-art9': 'GDPR, Article 9',
  'ai-act-4-5-50': 'EU AI Act',
  'eaa-law-232-2022': 'European Accessibility Act / Law 232/2022',
};
// A letter that names a condition breaks the "needs only" rule: fall back to the template instead.
const MEDICAL = /\b(diagnos\w*|disorder|condition|disabilit\w*|syndrome|medical|doctor|therap\w*|dyslexi\w*|adhd|autis\w*|deaf\w*|blind\w*|hearing loss|hard of hearing|chronic|illness|anxiety|depress\w*|impair\w*|neurodivergen\w*)\b/i;
const DISCLAIMER = 'Informational, not legal advice. OnRamp does not store your choices or this letter.';

export async function advise(needIds, catalog, user = {}) {
  const needs = catalog.needs.filter((n) => needIds.includes(n.id));
  if (!needs.length) throw Object.assign(new Error('Pick at least one need'), { status: 400, expose: true });

  // One entry per adjustment, even when several needs point to it.
  const byId = new Map();
  for (const need of needs) {
    for (const id of need.adjustments) {
      const a = catalog.adjustments[id];
      if (!a) continue;
      if (byId.has(id)) byId.get(id).need_ids.push(need.id);
      else byId.set(id, { id, need_id: need.id, need_ids: [need.id], ...a });
    }
  }
  const adjustments = [...byId.values()].map(({ legal = [], ...a }) => ({
    id: a.id,
    need_id: a.need_id,
    need_ids: a.need_ids,
    title: a.title,
    what: a.what,
    how_to_ask: a.how_to_ask,
    cost: a.cost,
    company_source: a.company_source ?? null,
    company_gap: a.company_gap ?? null,
    sources: [a.company_source && `Brightline ${a.company_source}`, ...legal.map((id) => LEGAL[id] ?? id)].filter(Boolean),
  }));

  const manager = await managerOf(user);
  const sender = user.name ?? 'Me';
  const letter = await writeLetter({ sender, manager: manager?.name ?? 'there', needs, adjustments });
  return { to: manager, adjustments, letter, disclaimer: DISCLAIMER };
}

async function managerOf(user) {
  if (!db || !user.managerId || !user.orgId) return null;
  const { data } = await db
    .from('organization_members')
    .select('display_name, role')
    .eq('org_id', user.orgId)
    .eq('user_id', user.managerId)
    .maybeSingle();
  return data ? { name: data.display_name, role: data.role === 'manager' ? 'Engineering Manager' : data.role } : null;
}

async function writeLetter({ sender, manager, needs, adjustments }) {
  try {
    const { letter } = await generateJson({ system: SYSTEM, schema: SCHEMA, name: 'adjustment_letter', input: buildInput({ sender, manager, needs, adjustments }) });
    if (letter && !MEDICAL.test(letter)) return letter.trim();
    logger.warn('adjustments: letter mentioned a health term, using the template');
  } catch (err) {
    logger.warn('adjustments: letter generation failed, using the template:', err.message);
  }
  return templateLetter({ sender, manager, adjustments });
}

function templateLetter({ sender, manager, adjustments }) {
  const lines = adjustments.map((a, i) => `${i + 1}. ${a.how_to_ask.replace(/^I'd like /, 'I would like ')}`);
  return [
    `Hi ${manager},`,
    '',
    'To do my best work, I would like to propose a few changes to how I work:',
    ...lines,
    '',
    'Most of these cost little or nothing. Could we try them for four weeks and then talk about how it went?',
    '',
    'Thanks,',
    sender,
  ].join('\n');
}
