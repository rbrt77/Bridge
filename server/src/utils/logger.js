// Owner: Track A. TODO(A): port utils/logger.js from Internal_ai. Never log question text on /api/anon.
export const logger = {
  info: (...a) => console.log('[info]', ...a),
  warn: (...a) => console.warn('[warn]', ...a),
  error: (...a) => console.error('[error]', ...a),
};
