// Owner: Track A
export function errorHandler(err, req, res, _next) {
  console.error(err);
  if (res.headersSent) return res.end();
  res.status(err.status ?? 500).json({ error: { code: err.code ?? 'internal', message: err.expose ? err.message : 'Something went wrong' } });
}

export function notImplemented(what) {
  const err = new Error(`${what} not implemented yet`);
  err.status = 501;
  err.code = 'not_implemented';
  err.expose = true;
  return err;
}
