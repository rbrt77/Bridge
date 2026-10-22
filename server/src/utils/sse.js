// Owner: Track A. SSE helper; event names are defined in docs/API.md.
export function openSse(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  res.on('close', () => clearInterval(ping));
  return { send, end: () => { clearInterval(ping); res.end(); } };
}
