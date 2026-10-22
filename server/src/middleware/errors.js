// Owner: Track A
export function errorHandler(err, req, res, _next) {
  console.error(err);
  if (res.headersSent) return res.end();
  if (err.name === 'MulterError') {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({ error: { code: tooBig ? 'file_too_large' : 'bad_upload', message: tooBig ? 'The file is too large.' : err.message } });
  }
  res.status(err.status ?? 500).json({ error: { code: err.code ?? 'internal', message: err.expose ? err.message : 'Something went wrong' } });
}

export function notImplemented(what) {
  const err = new Error(`${what} not implemented yet`);
  err.status = 501;
  err.code = 'not_implemented';
  err.expose = true;
  return err;
}
