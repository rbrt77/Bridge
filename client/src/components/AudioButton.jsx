// Owner: Track C. Listen (normal/slow). TODO(C): fallback to POST /api/voice/tts when speechSynthesis is missing.
import { speak, stopSpeaking } from '../lib/speech.js';

export default function AudioButton({ text, slow = false, label = 'Listen' }) {
  return (
    <>
      <button type="button" className="rounded border px-3" onClick={() => speak(text, { slow })}>{label}</button>
      <button type="button" className="rounded border px-3" onClick={stopSpeaking}>Stop</button>
    </>
  );
}
