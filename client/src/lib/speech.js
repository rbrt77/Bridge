// Owner: Track C. Browser TTS/STT first (free); server fallback in /api/voice.
export function speak(text, { slow = false } = {}) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = slow ? 0.75 : 1;
  speechSynthesis.speak(u);
  return true;
}
export const stopSpeaking = () => window.speechSynthesis?.cancel();

/** Returns a recognizer or null (Web Speech API is Chrome/Safari only → demo on Chrome). */
export function createRecognizer({ continuous = false, onResult, onEnd } = {}) {
  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.continuous = continuous;
  r.interimResults = true;
  r.onresult = (e) => onResult?.(Array.from(e.results).map((x) => x[0].transcript).join(' '), e.results[e.results.length - 1].isFinal);
  r.onend = () => onEnd?.();
  return r;
}
