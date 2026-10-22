// Shared (Track B owns). Buffered SSE parser over fetch POST: events split across chunks are NOT lost
// (fixes the Internal_ai ChatPage.jsx bug).
import { API_URL, authHeaders } from './api.js';

/**
 * @param {string} path e.g. '/ask'
 * @param {object} body
 * @param {Record<string,(data:any)=>void>} handlers keyed by event name (status, token, sources, enrich, handoff, done, error)
 * @param {AbortSignal} [signal]
 */
export async function postSse(path, body, handlers, signal) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(await authHeaders()) },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    // Auth/role errors come back as plain JSON before any stream starts (docs/API.md error shape).
    const err = await res.json().catch(() => null);
    throw Object.assign(new Error(err?.error?.message ?? `Request failed (${res.status})`), { code: err?.error?.code, status: res.status });
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let sep;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = 'message';
      const dataLines = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
      }
      if (!dataLines.length) continue; // comment / ping
      handlers[event]?.(JSON.parse(dataLines.join('\n')));
    }
  }
}
