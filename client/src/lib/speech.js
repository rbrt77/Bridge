// Owner: Track C. Browser TTS/STT first (free); server fallback in /api/voice.
import { API_URL, authHeaders } from './api.js';

// What Bridge read aloud in the last minute. Live captions use it to drop Bridge's own voice when the microphone picks it up.
const ECHO_MS = 60_000;
const said = [];
const remember = (text) => {
  said.push({ text, at: Date.now() });
  while (said.length && Date.now() - said[0].at > ECHO_MS) said.shift();
};
const pairs = (text) => {
  const w = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  return w.slice(1).map((x, i) => `${w[i]} ${x}`);
};
/** True when most of `text` (word pairs, so common words alone do not count) is something Bridge just said aloud. */
export function isOwnSpeech(text) {
  const heard = pairs(text);
  if (heard.length < 2) return false;
  const recent = new Set(said.filter((s) => Date.now() - s.at < ECHO_MS).flatMap((s) => pairs(s.text)));
  return heard.filter((p) => recent.has(p)).length / heard.length >= 0.5;
}

/** `queue`: speak after what is already playing instead of cutting it off. */
export function speak(text, { slow = false, onEnd, queue = false } = {}) {
  if (!('speechSynthesis' in window)) return false;
  remember(text);
  if (!queue) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = slow ? 0.75 : 1;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
  return true;
}
export const stopSpeaking = () => window.speechSynthesis?.cancel();

/** Server TTS (gpt-4o-mini-tts). Resolves to the playing Audio element, or null when the server has no audio (MOCK). */
export async function speakOnServer(text, { slow = false, onEnd } = {}) {
  remember(text);
  const res = await fetch(`${API_URL}/api/voice/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ text, pace: slow ? 'slow' : 'normal' }),
  });
  if (!res.ok) throw new Error('Could not read this out loud');
  if (res.status === 204) return null;
  const url = URL.createObjectURL(await res.blob());
  const audio = new Audio(url);
  audio.onended = () => {
    URL.revokeObjectURL(url);
    onEnd?.();
  };
  await audio.play();
  return audio;
}

/**
 * Returns a recognizer or null (Web Speech API is Chrome/Safari only → demo on Chrome).
 * onResult(allText, isFinal) for dictation; onFinal(segment) / onInterim(text) for live captions.
 */
export function createRecognizer({ continuous = false, onResult, onFinal, onInterim, onEnd, onError } = {}) {
  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.continuous = continuous;
  r.interimResults = true;
  r.onresult = (e) => {
    onResult?.(Array.from(e.results).map((x) => x[0].transcript).join(' '), e.results[e.results.length - 1].isFinal);
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) onFinal?.(e.results[i][0].transcript.trim());
      else interim += e.results[i][0].transcript;
    }
    onInterim?.(interim.trim());
  };
  r.onerror = (e) => onError?.(e.error);
  r.onend = () => onEnd?.();
  return r;
}

/** Microphone recording for the server STT fallback. stop() resolves to the recorded Blob. */
export async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('This browser cannot record audio');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        recorder.stop();
      }),
  };
}

/** Server STT (gpt-4o-mini-transcribe). `prompt` = the text just before this clip, so words cut at the edge come out right. */
export async function transcribeOnServer(blob, prompt) {
  const form = new FormData();
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  form.append('audio', blob, `speech.${ext}`);
  if (prompt) form.append('prompt', prompt);
  const res = await fetch(`${API_URL}/api/voice/stt`, { method: 'POST', headers: await authHeaders(), body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Could not understand the recording');
  return data.text;
}
