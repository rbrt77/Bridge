// Owner: Track C. Dictation button for any text field: Web Speech API first, else record → POST /api/voice/stt.
// With Web Speech, a backup recording goes to the server when the browser fails or is unsure (speech.js).
import { useRef, useState } from 'react';
import { createRecognizer, needsServer, settleDictation, startBackup, startRecording, transcribeOnServer } from '../lib/speech.js';
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

    let got = '';
    let confidence = 0;
    let failed = '';
    let backup = null;
    rec.current = createRecognizer({
      onResult: (t, _final, c) => { got = t; confidence = c; onText(t); },
      onError: (e) => { failed = e; },
      onEnd: async () => {
        rec.current = null;
        if (needsServer({ text: got, confidence, error: failed })) setState('transcribing');
        const { text, server } = await settleDictation({ text: got, confidence, error: failed, backup });
        setState('idle');
        if (server) onText(text);
        if (text.trim()) return announce(`Heard: ${text}`);
        announce(failed === 'not-allowed' ? 'The microphone is blocked. Allow it in the browser, or type instead.' : 'I did not hear any words. Try again.');
      },
    });
    if (rec.current) {
      rec.current.start();
      backup = startBackup();
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
