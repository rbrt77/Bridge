// Owner: Track A. Single place that talks to OpenAI. Everyone else calls these helpers.
import OpenAI from 'openai';
import { env } from '../env.js';

let client;
const openai = () => (client ??= new OpenAI({ apiKey: env.openaiKey }));

// Only reasoning models (gpt-5*, o*) accept `reasoning`; gpt-4.1* rejects it.
const reasoningFor = (model) => (/^(gpt-5|o\d)/.test(model) ? { reasoning: { effort: 'minimal' } } : {});

/** Strict JSON output (Structured Outputs). `schema` is a JSON Schema object. */
export async function generateJson({ system, input, schema, name, model = env.chatModel, timeoutMs }) {
  const res = await openai().responses.create({
    model,
    ...reasoningFor(model),
    instructions: system,
    input,
    text: { format: { type: 'json_schema', name, schema, strict: true } },
  }, timeoutMs ? { timeout: timeoutMs, maxRetries: 0 } : undefined);
  return JSON.parse(res.output_text);
}

/** Short plain text, not streamed (background jobs). */
export async function generateText({ system, input, model = env.backgroundModel, timeoutMs, cacheKey }) {
  const res = await openai().responses.create({
    model,
    ...reasoningFor(model),
    instructions: system,
    input,
    ...(cacheKey ? { prompt_cache_key: cacheKey } : {}),
  }, timeoutMs ? { timeout: timeoutMs, maxRetries: 1 } : undefined);
  return res.output_text.trim();
}

/** Streamed text; calls onDelta(text) for each chunk. Returns the full text. */
export async function streamText({ system, input, verbosity = 'medium', model = env.chatModel, onDelta }) {
  const stream = await openai().responses.create({
    model,
    ...reasoningFor(model),
    text: { verbosity },
    instructions: system,
    input,
    stream: true,
  });
  let full = '';
  for await (const ev of stream) {
    if (ev.type === 'response.output_text.delta') {
      full += ev.delta;
      onDelta?.(ev.delta);
    }
  }
  return full;
}

export { openai };
