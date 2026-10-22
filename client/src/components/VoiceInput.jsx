// Owner: Track C. Dictation button for any text field: Web Speech API first, else record → POST /api/voice/stt.
import { useRef, useState } from 'react';
import { createRecognizer, startRecording, transcribeOnServer } from '../lib/speech.js';
import { useAnnounce } from '../a11y/Announcer.jsx';

export default function VoiceInput({ onText }) {
  const announce = useAnnounce();
  const [state, setState] = useState('idle'); // idle | listening | transcribing
  const rec = useRef(null);
  const recording = useRef(null);

  const toggle = async () => {
    if (state === 'transcribing') return;
    if (state === 'listening') {
      if (rec.current) return rec.current.stop();
      setState('transcribing');
      try {
        const text = await transcribeOnServer(await recording.current.stop());
        onText(text);
        announce(text ? `Heard: ${text}` : 'I did not hear any words. Try again.');
      } catch (e) {
        announce(e.message, { urgent: true });
      } finally {
        recording.current = null;
        setState('idle');
      }
      return;
    }

    rec.current = createRecognizer({ onResult: (t) => onText(t), onEnd: () => setState('idle') });
    if (rec.current) {
      rec.current.start();
      setState('listening');
      return;
    }
    try {
      recording.current = await startRecording();
      setState('listening');
      announce('Recording. Press Stop dictation when you are done.');
    } catch {
      announce('Could not use the microphone. Allow microphone access or type instead.', { urgent: true });
    }
  };

  const label = state === 'listening' ? 'Stop dictation' : state === 'transcribing' ? 'Writing it down…' : 'Dictate';
  return (
    <button type="button" aria-pressed={state === 'listening'} disabled={state === 'transcribing'} onClick={toggle} className="btn">
      {label}
    </button>
  );
}
