// Owner: Track C. Listen (normal/slow; slow by default when Work style > Reading speed is Slow): browser speechSynthesis first, POST /api/voice/tts when it is missing or fails.
import { useEffect, useRef, useState } from 'react';
import { speak, stopSpeaking, speakOnServer } from '../lib/speech.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import { useProfile } from '../a11y/ProfileProvider.jsx';

export default function AudioButton({ text, slow: slowProp = false, label = 'Listen' }) {
  const announce = useAnnounce();
  const { prefs } = useProfile();
  const slow = slowProp || prefs.output.pace === 'slow'; // Work style > Reading speed
  const [playing, setPlaying] = useState(false);
  const audio = useRef(null);
  const run = useRef(0); // cancel() ends the previous utterance late; only the latest run may clear `playing`

  const stop = () => {
    run.current += 1;
    stopSpeaking();
    audio.current?.pause();
    audio.current = null;
    setPlaying(false);
  };
  useEffect(() => stop, []); // stop when the component goes away

  const play = async (asSlow) => {
    stop();
    if (!text?.trim()) return;
    setPlaying(true);
    const id = run.current;
    const done = () => id === run.current && setPlaying(false);
    const onServer = async () => {
      try {
        audio.current = await speakOnServer(text, { slow: asSlow, onEnd: done });
        if (!audio.current) done();
      } catch (e) {
        done();
        announce(e.message, { urgent: true });
      }
    };
    // The browser voice can exist and still fail (no voice installed): then the server reads it.
    if (speak(text, { slow: asSlow, onEnd: done, onError: () => id === run.current && onServer() })) return;
    await onServer();
  };

  return (
    <span className="inline-flex flex-wrap gap-2">
      <button type="button" className="btn" onClick={() => play(slow)}>{label}</button>
      {!slow && <button type="button" className="btn" onClick={() => play(true)}>{label} slowly</button>}
      {playing && <button type="button" className="btn" onClick={stop}>Stop</button>}
    </span>
  );
}
