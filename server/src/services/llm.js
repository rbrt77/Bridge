// Owner: Track A. Single place that talks to OpenAI. Everyone else calls these helpers.
import OpenAI from 'openai';
import { env } from '../env.js';

let client;
const openai = () => (client ??= new OpenAI({ apiKey: env.openaiKey }));

/** Strict JSON output (Structured Outputs). `schema` is a JSON Schema object. */
export async function generateJson({ system, input, schema, name, model = env.chatModel }) {
  const res = await openai().responses.create({
    model,
    reasoning: { effort: 'minimal' },
    instructions: system,
    input,
    text: { format: { type: 'json_schema', name, schema, strict: true } },
  });
  return JSON.parse(res.output_text);
}

/** Streamed text; calls onDelta(text) for each chunk. Returns the full text. */
export async function streamText({ system, input, verbosity = 'medium', model = env.chatModel, onDelta }) {
  const stream = await openai().responses.create({
    model,
    reasoning: { effort: 'minimal' },
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
