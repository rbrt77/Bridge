// Owner: Track A. Redaction for anonymous questions; medical-word filter for F1 free text.
export function redactPII(text) {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\+?\d[\d\s-]{7,}\d/g, '[phone]');
}
