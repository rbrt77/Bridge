// Owner: Track A (F8 backend). Full mermaid.parse runs client-side (Diagram.jsx falls back to the outline);
// here we only check the shape and retry once with the error.
import { env } from '../env.js';
import { generateJson } from './llm.js';
import {
  KINDS, SYSTEM, SCHEMA, diagramInput, headerFor,
  DESCRIBE_SYSTEM, SIMPLIFY_SYSTEM, SIMPLIFY_MODES, TEXT_SCHEMA,
} from '../prompts/diagram.js';

const MAX_TEXT = 12000;
const badRequest = (message) => Object.assign(new Error(message), { status: 400, code: 'bad_request', expose: true });

function readText(text) {
  if (typeof text !== 'string' || !text.trim()) throw badRequest('Missing text');
  if (text.length > MAX_TEXT) throw badRequest(`Keep the text under ${MAX_TEXT} characters.`);
  return text.trim();
}

const stripFences = (s) => s.replace(/^\s*```(?:mermaid)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

/** Cheap structural check; returns an error string or null. */
function checkMermaid(src, kind) {
  const lines = src.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines[0] !== headerFor(kind)) return `first line must be "${headerFor(kind)}"`;
  if (lines.length < 2) return 'no nodes';
  if (/<script|click\s|javascript:|classDef|style\s/i.test(src)) return 'styling, click or HTML is not allowed';
  const bad = lines.find((l) => (l.match(/"/g)?.length ?? 0) % 2 === 1);
  if (bad) return `unbalanced quotes in: ${bad}`;
  if (kind === 'sequence') {
    const flowLike = lines.slice(1).find((l) => /[[\]"]|-->|\|/.test(l));
    if (flowLike) return `flowchart syntax inside sequenceDiagram: ${flowLike}`;
    if (!lines.some((l) => l.startsWith('participant '))) return 'declare participants first';
  }
  return null;
}

export async function textToDiagram({ text, kind = 'flowchart' } = {}) {
  text = readText(text);
  if (!KINDS.includes(kind)) throw badRequest(`kind must be one of ${KINDS.join(', ')}`);
  let out = await generateJson({ system: SYSTEM, input: diagramInput({ text, kind }), schema: SCHEMA, name: 'diagram' });
  out.mermaid = stripFences(out.mermaid);
  const error = checkMermaid(out.mermaid, kind);
  if (error) {
    const retry = await generateJson({ system: SYSTEM, input: diagramInput({ text, kind, error, previous: out.mermaid }), schema: SCHEMA, name: 'diagram' });
    retry.mermaid = stripFences(retry.mermaid);
    if (!checkMermaid(retry.mermaid, kind)) out = retry;
  }
  // Outline is the text equivalent: never ship a diagram without it.
  if (!out.outline?.length) out.outline = [out.summary];
  return out;
}

export async function describeImage(imageUrl) {
  if (typeof imageUrl !== 'string' || !/^(https:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(imageUrl)) {
    throw badRequest('image_url must be an https URL or a base64 image data URL');
  }
  try {
    const { text } = await generateJson({
      system: DESCRIBE_SYSTEM,
      input: [{ role: 'user', content: [{ type: 'input_text', text: 'Describe this image.' }, { type: 'input_image', image_url: imageUrl, detail: 'auto' }] }],
      schema: TEXT_SCHEMA,
      name: 'description',
    });
    return { description: text };
  } catch (err) {
    // OpenAI could not fetch/decode the image (blocked host, 404, not an image).
    if (err.status === 400 && err.param === 'url') throw badRequest('Could not open that image. Try uploading it instead of linking it.');
    throw err;
  }
}

export async function simplify({ text, mode = 'plain' } = {}) {
  text = readText(text);
  if (!SIMPLIFY_MODES[mode]) throw badRequest(`mode must be one of ${Object.keys(SIMPLIFY_MODES).join(', ')}`);
  return generateJson({
    system: SIMPLIFY_SYSTEM,
    input: `<text>\n${text}\n</text>\n\n${SIMPLIFY_MODES[mode]}`,
    schema: TEXT_SCHEMA,
    name: 'simplified',
    model: env.chatModel,
  });
}
