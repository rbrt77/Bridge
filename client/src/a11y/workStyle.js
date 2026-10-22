// Owner: Track B (F1). Quick starts + the 5 wizard questions, each mapped to a Prefs patch.
// Questions are about HOW someone works; never ask for or name a diagnosis.
import { DEFAULT_PREFS } from './ProfileProvider.jsx';

const GROUPS = ['display', 'output', 'input'];

/** Deep-merges a partial Prefs into prefs. null/undefined values mean "no change". */
export function mergePrefs(prefs, patch = {}) {
  const next = { ...prefs };
  for (const g of GROUPS) {
    if (!patch[g]) continue;
    const clean = Object.fromEntries(Object.entries(patch[g]).filter(([k, v]) => v != null && k in DEFAULT_PREFS[g]));
    next[g] = { ...prefs[g], ...clean };
  }
  return next;
}

export const QUICK_STARTS = [
  { id: 'written-first', label: 'Written-first', hint: 'Short written summaries first.', patch: { output: { tldr: true, length: 'short' } } },
  { id: 'step-by-step', label: 'Step-by-step', hint: 'Numbered steps for anything you have to do.', patch: { output: { steps: true, tldr: true } } },
  { id: 'listen-first', label: 'Listen-first', hint: 'Answers can be read aloud.', patch: { output: { audio: true } } },
  { id: 'visual-first', label: 'Visual-first', hint: 'Diagrams when there is a flow, more space.', patch: { output: { diagrams: true }, display: { spacing: 'wide' } } },
  { id: 'screen-reader', label: 'Screen-reader mode', hint: 'Headings and lists, no tables, less motion.', patch: { output: { screenReader: true }, display: { motion: 'reduced' } } },
  { id: 'calm', label: 'Calm mode', hint: 'Less motion, more space, short literal answers.', patch: { display: { motion: 'reduced', spacing: 'wide' }, output: { length: 'short', literal: true } } },
  { id: 'keyboard-voice', label: 'Keyboard & voice', hint: 'Talk instead of typing, hear answers back.', patch: { input: { voice: true }, output: { audio: true } } },
];

/** Applying a preset merges its patch; removing it resets its keys to default, then re-applies the presets still on. */
export function togglePreset(prefs, id) {
  const on = prefs.preset.includes(id);
  const preset = on ? prefs.preset.filter((p) => p !== id) : [...prefs.preset, id];
  if (!on) return { ...mergePrefs(prefs, QUICK_STARTS.find((q) => q.id === id).patch), preset };
  const removed = QUICK_STARTS.find((q) => q.id === id).patch;
  const reset = Object.fromEntries(GROUPS.filter((g) => removed[g]).map((g) => [g, Object.fromEntries(Object.keys(removed[g]).map((k) => [k, DEFAULT_PREFS[g][k]]))]));
  let next = mergePrefs(prefs, reset);
  for (const q of QUICK_STARTS) if (preset.includes(q.id)) next = mergePrefs(next, q.patch);
  return { ...next, preset };
}

const NONE = { value: 'none', label: 'No preference', patch: {} };

export const QUESTIONS = [
  {
    id: 'tasks',
    legend: 'When you get a new task, what helps you most?',
    options: [
      { value: 'summary', label: 'A short summary first', patch: { output: { tldr: true, length: 'short' } } },
      { value: 'steps', label: 'Numbered steps I can follow', patch: { output: { steps: true } } },
      { value: 'detail', label: 'All the detail and context', patch: { output: { length: 'detailed' } } },
      NONE,
    ],
  },
  {
    id: 'meetings',
    legend: 'After a meeting, how do you want to catch up?',
    options: [
      { value: 'read', label: 'Read a written summary', patch: { output: { tldr: true } } },
      { value: 'listen', label: 'Listen to it read aloud', patch: { output: { audio: true } } },
      { value: 'tasks', label: 'Just a short list of my tasks', patch: { output: { steps: true, length: 'short' } } },
      NONE,
    ],
  },
  {
    id: 'review',
    legend: 'When you get code review comments, what works best?',
    options: [
      { value: 'literal', label: 'Plain, literal wording (no idioms or sarcasm)', patch: { output: { literal: true } } },
      { value: 'todo', label: 'Each comment turned into a step to do', patch: { output: { steps: true } } },
      { value: 'visual', label: 'A diagram when the change touches a flow', patch: { output: { diagrams: true } } },
      NONE,
    ],
  },
  {
    id: 'communication',
    legend: 'How do you like to communicate with your team?',
    options: [
      { value: 'short', label: 'Short and direct messages', patch: { output: { length: 'short', literal: true } } },
      { value: 'examples', label: 'With examples and detail', patch: { output: { length: 'detailed' } } },
      { value: 'voice', label: 'Speaking rather than typing', patch: { input: { voice: true } } },
      NONE,
    ],
  },
  {
    id: 'display',
    legend: 'What makes the screen easier for you? Choose any.',
    multiple: true,
    options: [
      { value: 'large', label: 'Larger text', patch: { display: { textSize: 'l' } } },
      { value: 'contrast', label: 'High contrast', patch: { display: { contrast: 'high' } } },
      { value: 'font', label: 'A more readable font', patch: { display: { font: 'readable' } } },
      { value: 'spacing', label: 'More space between lines', patch: { display: { spacing: 'wide' } } },
      { value: 'motion', label: 'Less movement and animation', patch: { display: { motion: 'reduced' } } },
      { value: 'sr', label: 'I use a screen reader', patch: { output: { screenReader: true } } },
    ],
  },
];

/** Wizard answers ({ [questionId]: value | value[] }) → patch merged onto prefs. */
export function prefsFromAnswers(prefs, answers) {
  let next = prefs;
  for (const q of QUESTIONS) {
    const picked = [answers[q.id]].flat().filter(Boolean);
    for (const o of q.options) if (picked.includes(o.value)) next = mergePrefs(next, o.patch);
  }
  return next;
}

/** Human-readable list of every setting, used for the confirm step and the "what changed" list. */
export const LABELS = {
  display: {
    textSize: ['Text size', { m: 'Normal', l: 'Large', xl: 'Extra large' }],
    contrast: ['Contrast', { normal: 'Normal', high: 'High' }],
    font: ['Font', { default: 'Default', readable: 'Readable' }],
    spacing: ['Spacing', { normal: 'Normal', wide: 'Wide' }],
    motion: ['Motion', { full: 'Full', reduced: 'Reduced' }],
  },
  output: {
    length: ['Answer length', { short: 'Short', normal: 'Normal', detailed: 'Detailed' }],
    pace: ['Reading speed', { normal: 'Normal', slow: 'Slow' }],
    tldr: ['One-line summary first'],
    steps: ['Numbered steps'],
    audio: ['Read answers aloud'],
    literal: ['Literal language'],
    screenReader: ['Screen-reader friendly answers'],
    diagrams: ['Offer diagrams'],
  },
  input: {
    voice: ['Voice input'],
  },
};

export function describe(group, key, value) {
  const [label, values] = LABELS[group][key];
  return { label, value: values ? values[value] : value ? 'On' : 'Off' };
}

/** [{ group, key, label, from, to }] for every setting that differs between a and b. */
export function diffPrefs(a, b) {
  const out = [];
  for (const g of GROUPS) {
    for (const k of Object.keys(LABELS[g])) {
      if (a[g]?.[k] === b[g]?.[k]) continue;
      out.push({ group: g, key: k, label: LABELS[g][k][0], from: describe(g, k, a[g]?.[k]).value, to: describe(g, k, b[g]?.[k]).value });
    }
  }
  return out;
}
