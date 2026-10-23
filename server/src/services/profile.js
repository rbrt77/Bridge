// Owner: Track B (F1). Free text → Prefs JSON (text never stored or logged) + owner-only user_profiles CRUD.
import { generateJson } from './llm.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { SYSTEM, SCHEMA } from '../prompts/profile.js';

const MAX_TEXT = 2000;

const ALLOWED = {
  display: { textSize: ['m', 'l', 'xl'], contrast: ['normal', 'high'], font: ['default', 'readable'], spacing: ['normal', 'wide'], motion: ['full', 'reduced'] },
  output: { length: ['short', 'normal', 'detailed'], pace: ['normal', 'slow'], steps: 'bool', tldr: 'bool', literal: 'bool', screenReader: 'bool' },
};
const PRESETS = ['written-first', 'step-by-step', 'screen-reader', 'calm'];

/**
 * Keeps only known keys with valid values, so nothing else (free text, health data) can be stored.
 * Unknown or invalid values are dropped; `keepNull` keeps nulls (used for parse suggestions).
 */
export function sanitizePrefs(prefs, { keepNull = false } = {}) {
  const out = {};
  for (const [group, keys] of Object.entries(ALLOWED)) {
    out[group] = {};
    for (const [key, rule] of Object.entries(keys)) {
      const v = prefs?.[group]?.[key];
      const ok = rule === 'bool' ? typeof v === 'boolean' : rule.includes(v);
      if (ok) out[group][key] = v;
      else if (keepNull && v === null) out[group][key] = null;
    }
  }
  if (!keepNull) out.preset = Array.isArray(prefs?.preset) ? prefs.preset.filter((p) => PRESETS.includes(p)) : [];
  return out;
}

const badRequest = (message) => Object.assign(new Error(message), { status: 400, code: 'bad_request', expose: true });

export async function parseFreeText(text) {
  if (typeof text !== 'string' || !text.trim()) throw badRequest('Write a few words about how you work.');
  if (text.length > MAX_TEXT) throw badRequest(`Keep it under ${MAX_TEXT} characters.`);
  const prefs = await generateJson({ system: SYSTEM, input: text, schema: SCHEMA, name: 'work_style_prefs', timeoutMs: 20_000 });
  return sanitizePrefs(prefs, { keepNull: true });
}

const requireDb = () => {
  if (!db) throw Object.assign(new Error('Profile sync needs Supabase'), { status: 503, code: 'no_db', expose: true });
  return db;
};

export async function getProfile(userId) {
  const { data, error } = await requireDb().from('user_profiles').select('prefs').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? sanitizePrefs(data.prefs) : null;
}

export async function saveProfile(userId, prefs) {
  if (!prefs || typeof prefs !== 'object') throw badRequest('Missing prefs');
  const { error } = await requireDb()
    .from('user_profiles')
    .upsert({ user_id: userId, prefs: sanitizePrefs(prefs), updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deleteProfile(userId) {
  const { error } = await requireDb().from('user_profiles').delete().eq('user_id', userId);
  if (error) throw error;
}
