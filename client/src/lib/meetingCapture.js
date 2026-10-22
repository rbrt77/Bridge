// Owner: Track C (F3 live). Listens to a meeting: the sound of another tab (Meet, Teams, Zoom on the web) plus your microphone,
// or only the microphone for a meeting in the room. Cuts it into short standalone clips for live captions and keeps the whole
// recording in memory for "My tasks". Nothing is stored here; the caller decides what to send.

const CLIP_SECONDS = 6;
const TICK_MS = 500;
const SILENCE_RMS = 0.005; // below this a clip is not sent (saves calls, and STT invents words on silence)

// Only Chromium (Chrome, Edge) shares a tab's sound; Safari and Firefox have getDisplayMedia but no tab audio.
// userAgentData exists only in Chromium, so it is the feature check.
export const canCaptureTab = () => !!(navigator.userAgentData && navigator.mediaDevices?.getDisplayMedia && window.MediaRecorder && window.AudioContext);
export const canCaptureRoom = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder && window.AudioContext);

const pickType = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
export const extensionFor = (type) => (type.includes('mp4') ? 'm4a' : 'webm');

const fail = (message, code) => Object.assign(new Error(message), { code });

async function openInputs(source) {
  if (source === 'room') return [await navigator.mediaDevices.getUserMedia({ audio: true })];
  const tab = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' }, // Chrome only shares audio together with a picture
    audio: true,
    selfBrowserSurface: 'exclude',
    surfaceSwitching: 'include',
  });
  if (!tab.getAudioTracks().length) {
    tab.getTracks().forEach((t) => t.stop());
    throw fail('No sound was shared. Pick the meeting tab and turn on "Also share tab audio". This works in Chrome and Edge.', 'no-audio');
  }
  try {
    // Your own voice is not in the tab's sound. Captions still work if the microphone is refused.
    return [tab, await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })];
  } catch {
    return [tab];
  }
}

/**
 * @param {object} o
 * @param {'tab'|'room'} o.source
 * @param {(clip: Blob, at: number) => void} o.onClip  a standalone audio file of ~6 s with speech in it; `at` = when it started (ms)
 * @param {() => void} [o.onEnded]  the person stopped sharing from the browser bar
 * @returns {Promise<{ stop: (keep?: boolean) => Promise<Blob|null>, hasMic: boolean }>} stop() resolves to the whole recording when keep=true
 */
export async function startCapture({ source, onClip, onEnded }) {
  const inputs = await openInputs(source);
  const ctx = new AudioContext();
  const mix = ctx.createMediaStreamDestination();
  const meter = ctx.createAnalyser();
  meter.fftSize = 32768; // ~0.7 s window, so a sample every 500 ms sees almost all of the sound
  for (const stream of inputs) {
    const node = ctx.createMediaStreamSource(stream);
    node.connect(mix);
    node.connect(meter);
  }
  const samples = new Float32Array(meter.fftSize);
  const level = () => {
    meter.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const x of samples) sum += x * x;
    return Math.sqrt(sum / samples.length);
  };

  const options = { mimeType: pickType(), audioBitsPerSecond: 32_000 }; // ~14 MB per hour, under the 50 MB upload limit
  const newClip = () => {
    const rec = new MediaRecorder(mix.stream, options);
    const parts = [];
    const clip = { rec, heard: false, at: Date.now() };
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = () => clip.heard && parts.length && onClip(new Blob(parts, { type: rec.mimeType }), clip.at);
    rec.start();
    return clip;
  };

  // The full recorder's chunks are also the clock: media events keep firing in a background tab, timers get throttled.
  const full = new MediaRecorder(mix.stream, options);
  const recording = [];
  let clip = newClip();
  let ticks = 0;
  full.ondataavailable = (e) => {
    if (e.data.size) recording.push(e.data);
    if (full.state !== 'recording') return;
    if (level() > SILENCE_RMS) clip.heard = true;
    if (++ticks % ((CLIP_SECONDS * 1000) / TICK_MS) === 0) {
      const done = clip;
      clip = newClip();
      done.rec.stop();
    }
  };
  full.start(TICK_MS);

  let stopped = false;
  const stop = (keep = true) =>
    new Promise((resolve) => {
      if (stopped) return resolve(null);
      stopped = true;
      clip.rec.stop();
      full.onstop = () => {
        inputs.forEach((s) => s.getTracks().forEach((t) => t.stop()));
        ctx.close();
        resolve(keep && recording.length ? new Blob(recording, { type: full.mimeType }) : null);
      };
      full.stop();
    });

  for (const track of inputs[0].getTracks()) track.addEventListener('ended', () => !stopped && onEnded?.(), { once: true });
  return { stop, hasMic: source === 'room' || inputs.length > 1 };
}
