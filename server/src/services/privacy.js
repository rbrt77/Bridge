// Owner: Track A. Redaction for anonymous questions; medical-word filter for F1 free text.
import { createHash, randomBytes } from 'node:crypto';

export function redactPII(text) {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\+?\d[\d\s-]{7,}\d/g, (m) => (/^\d{4}-\d{2}-\d{2}$/.test(m) ? m : '[phone]')) // keep ISO dates
    .replace(/(^|[^\w])@[\w-]{2,}/g, '$1[handle]'); // GitHub/Slack handles name the asker as surely as an email
}

/** Anonymous claim tokens: the browser keeps the token, the DB only its hash. */
export const newClaimToken = () => randomBytes(24).toString('base64url');
export const hashClaimToken = (token) => createHash('sha256').update(String(token)).digest('hex');
