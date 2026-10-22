// Owner: Track C. Dictation button for any text field. TODO(C): fallback recording → /api/voice/stt.
import { useRef, useState } from 'react';
import { createRecognizer } from '../lib/speech.js';

export default function VoiceInput({ onText }) {
  const [listening, setListening] = useState(false);
  const rec = useRef(null);
  const toggle = () => {
    if (listening) return rec.current?.stop();
    rec.current = createRecognizer({ onResult: (t) => onText(t), onEnd: () => setListening(false) });
    if (!rec.current) return alert('Voice input works in Chrome or Safari.');
    rec.current.start();
    setListening(true);
  };
  return <button type="button" aria-pressed={listening} onClick={toggle} className="rounded border px-3">{listening ? 'Stop dictation' : 'Dictate'}</button>;
}
