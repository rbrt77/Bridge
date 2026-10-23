// Owner: Track C. "Talk to Bridge": say (Alt+V) or type what you want; the AI picks one action and the app runs it,
// so someone who cannot see the screen can use every part of Bridge by voice. The jobs themselves are in lib/assistantTasks.js.
// Anything that sends, posts or records is read back first and runs only after a yes: CONFIRM below decides that, not the model.
// Settings and ticks apply at once and can be undone ("undo").
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { api } from '../lib/api.js';
import { postSse } from '../lib/sse.js';
import { askAnonymously } from '../lib/help.js';
import { canCaptureTab } from '../lib/meetingCapture.js';
import { createRecognizer, speak, startRecording, stopSpeaking, transcribeOnServer } from '../lib/speech.js';
import {
  describePage, findThread, flatSettings, latestSavedMeeting, pageText, termsText, meetingText, messagesText, ticketsText, reviewText, saveChecklist, sendReply, settingsPatch, setupText,
  spoken, standupDraft, termText, ticketText, tickStep, todayText,
} from '../lib/assistantTasks.js';
import { diffPrefs, mergePrefs } from '../a11y/workStyle.js';
import { useAnnounce } from '../a11y/Announcer.jsx';
import { useProfile } from '../a11y/ProfileProvider.jsx';
import { useSession } from '../auth/Session.jsx';
import { useLiveMeeting } from './LiveMeeting.jsx';

const YES = /^(yes|yeah|yep|sure|ok(ay)?|send( it)?|post( it)?|save( it)?|do it|go ahead|confirm|please( do)?$|da)\b/;
const NO = /^(no|nope|cancel|don'?t|stop|never ?mind|nu)\b/;
const HELP = 'You can ask me to do anything in Bridge. For example: what is on today? Mark the next step done. Read my messages. Which tickets are there? Explain ticket 142. Next setup step. Make the text bigger. Ask my manager who approves migrations. While I talk, say stop, repeat, slower, faster or undo.';
const GREETING = "Hi, I'm Bridge. Tell me what you want to do and I will do it, or say: show me around. Press Alt+V to talk.";
const VOICE_KEY = 'bridge.assistant.voice';
const SEEN_KEY = 'bridge.assistant.seen';
const HISTORY_TURNS = 12;
const END_WINDOW_MS = 4000; // during a meeting, a second Alt+V within this time ends it

/** Actions that send, post or record: read back, then run only after "yes" (spoken or the Yes button). */
const CONFIRM = {
  message_manager: { ask: (a) => `Send this to ${a.recipient}: "${a.draft}". Say yes to send it, no to cancel, or tell me what to change.`, yes: 'Yes, send it' },
  reply_message: { ask: (a) => `Reply to ${a.recipient}: "${a.draft}". Send it?`, yes: 'Yes, send it' },
  ask_anonymously: { ask: (a) => `Ask the team without your name: "${a.question}". Yes or no?`, yes: 'Yes, send it' },
  save_checklist: { ask: (a) => (a.items.length === 1 ? 'Save this step to Today?' : `Save these ${a.items.length} steps to Today?`), yes: 'Yes, save' },
  start_captions: {
    ask: (a) => `Start live captions for ${a.source === 'tab' ? 'the meeting in another tab' : 'the meeting in this room'}? Say yes only if everyone in the meeting agreed to be recorded.`,
    yes: 'Yes, start captions',
  },
  end_meeting: { ask: (a) => (a.get_tasks === false ? 'Turn off live captions? The recording is dropped.' : 'End the meeting and get your tasks?'), yes: 'Yes, end it' },
};

const today = () => new Date().toLocaleDateString('sv-SE');
// Actions whose own result is the reply: the model's intro would only repeat it.
const QUIET = new Set(['change_settings', 'describe_page', 'read_page', 'define_term', 'list_terms', 'tick_step', 'read_meeting']);

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

/** Short tone: "I'm listening" (high) / "got it" (low), so nobody has to look at the screen. */
let tones;
function tone(freq) {
  try {
    tones ??= new AudioContext();
    const osc = tones.createOscillator();
    const gain = tones.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(tones.destination);
    osc.start();
    osc.stop(tones.currentTime + 0.09);
  } catch { /* no audio: the panel still says "Listening" */ }
}

export default function Assistant() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const announce = useAnnounce();
  const { prefs, setPrefs } = useProfile();
  const { member, user } = useSession();
  const m = useLiveMeeting();
  const [open, setOpen] = useState(false);
  const [mic, setMic] = useState('idle'); // idle | listening | transcribing
  const [heard, setHeard] = useState('');
  const [thinking, setThinking] = useState(false);
  const [log, setLog] = useState([]); // { id, who: 'you' | 'bridge', text }
  const [pending, setPending] = useState(null); // the action waiting for yes or no
  const [typed, setTyped] = useState('');
  const [voice, setVoice] = useState(() => read(VOICE_KEY) ?? !prefs.output.screenReader); // off: the screen reader reads replies
  const slow = prefs.output.pace === 'slow'; // Work style > Reading speed
  const last = useRef('');
  const undo = useRef(null); // the last setting change or tick, for "undo"
  const rec = useRef(null);
  const recording = useRef(null);
  const latest = useRef({}); // the recognizer and the shortcut call into the newest render
  const launcher = useRef(null);
  const input = useRef(null);
  const yesButton = useRef(null);
  const logBox = useRef(null);
  const wasOpen = useRef(false);
  const endArmed = useRef(0); // when the first Alt+V of "press twice to end the meeting" came
  const wantMeeting = useRef(null); // parts asked for while the meeting was still being processed: read them once it is ready

  const add = (who, text) => setLog((l) => [...l, { id: crypto.randomUUID(), who, text }]);

  const say = (text, { queue = false, pace = slow } = {}) => {
    last.current = text;
    add('bridge', text);
    if (!voice || !speak(text, { slow: pace, queue })) announce(text);
  };

  /** Says `text` and resolves once it has been read out, so the microphone can start without capturing it. */
  const sayAndWait = (text) =>
    new Promise((done) => {
      last.current = text;
      add('bridge', text);
      const words = text.split(' ').length;
      // Some browsers never fire onend, so never wait longer than the sentence takes (the screen reader also reads from the speakers).
      setTimeout(done, 1500 + words * (slow ? 650 : 450));
      if (voice && speak(text, { slow, onEnd: done })) return;
      announce(text);
    });

  /** Alt+V during a meeting: the first press warns, a second one within END_WINDOW_MS ends it and gets the tasks. */
  const endByKey = async () => {
    if (Date.now() - endArmed.current > END_WINDOW_MS) {
      endArmed.current = Date.now();
      tone(660);
      return say('Press Alt+V again to end the meeting and get your tasks. To talk to me, press Alt+Shift+V.');
    }
    endArmed.current = 0;
    await m.end(true);
    navigate('/meetings');
    say('Meeting ended. I opened Meetings; your tasks are on the way.');
  };

  /** Applies settings at once (they are easy to undo) and says exactly what changed. `limit`: why a size step was left out. */
  const changeSettings = (patch, limit = '') => {
    const before = prefs;
    const next = mergePrefs(prefs, patch);
    const changes = diffPrefs(before, next);
    if (!changes.length) return say(limit || 'Those settings are already on.');
    setPrefs(next);
    undo.current = () => setPrefs(before);
    say(`${limit} Changed: ${changes.map((c) => `${c.label} to ${c.to}`).join(', ')}. Say undo to go back.`.trim(), { pace: next.output.pace === 'slow' });
  };

  /** Offers a follow-up that needs a yes (save to Today) right after reading something out. */
  const offer = (a, text) => {
    setPending(a);
    say(`${text} ${CONFIRM[a.type].ask(a)}`, { queue: true });
  };

  const askDocs = async (question) => {
    let answer = '';
    let sources = [];
    let handoff = null;
    let error = '';
    await postSse('/ask', { question, history: [], prefs, mode: 'normal' }, {
      token: (d) => { answer += d.text; },
      sources: (d) => { sources = d.sources; },
      handoff: (d) => { handoff = d; },
      error: (d) => { error = d.message; },
    });
    if (error) return say(`Sorry, ${error}`, { queue: true });
    // Not in the docs: offer the manager, with the same draft the Ask page would show.
    if (handoff) return offer({ type: 'message_manager', question, draft: handoff.draft, recipient: handoff.helper?.name ?? 'your manager' }, "I could not find this in the team's documents.");
    say(`${spoken(answer)}${sources[0]?.title ? ` Source: ${sources[0].title}.` : ''}`, { queue: true });
  };

  /** Runs one action. Confirmed ones only get here after a yes. */
  const run = async (a, { byVoice = false } = {}) => {
    try {
      switch (a.type) {
        case 'navigate':
          return navigate(a.path);
        case 'describe_page':
          return say(describePage(m.live), { queue: true });
        case 'read_page':
          return say(pageText(a.question), { queue: true });
        case 'list_terms':
          return say(await termsText(a.which === 'all'), { queue: true });
        case 'read_today':
          return say(await todayText(), { queue: true });
        case 'tick_step': {
          const r = await tickStep({ item: a.item, done: a.done !== false });
          if (r.undo) undo.current = r.undo;
          return say(r.say, { queue: true });
        }
        case 'read_messages':
          return say(await messagesText(user?.id), { queue: true });
        case 'ask':
          return await askDocs(a.question);
        case 'define_term': {
          const text = await termText(a.term);
          return text ? say(text, { queue: true }) : await askDocs(`What does ${a.term} mean?`);
        }
        case 'change_settings': {
          const { patch, limit } = settingsPatch(a.settings, prefs);
          return changeSettings(patch, limit);
        }
        case 'list_tickets':
          return say(await ticketsText(), { queue: true });
        case 'explain_ticket': {
          const r = await ticketText(a.url);
          return r.save ? offer({ type: 'save_checklist', ...r.save }, r.say) : say(r.say, { queue: true });
        }
        case 'explain_review': {
          const r = await reviewText(a.url);
          return r.save ? offer({ type: 'save_checklist', ...r.save }, r.say) : say(r.say, { queue: true });
        }
        case 'setup_step':
          return say(await setupText({ step: a.step, question: a.question }), { queue: true });
        case 'standup':
          return say((await standupDraft()).say, { queue: true });
        case 'save_checklist':
          await saveChecklist(a);
          return say('Saved in Today. Say "what is on today" to hear the next step.');
        case 'message_manager':
          await api('/help/threads', { method: 'POST', body: { question: a.question || a.draft, draft: a.draft } });
          return say(`Sent to ${a.recipient}. The reply will show in Messages.`);
        case 'reply_message':
          await sendReply(a.thread_id, a.draft);
          return say(`Sent to ${a.recipient}.`);
        case 'ask_anonymously':
          await askAnonymously(a.question);
          return say('Sent to the team without your name. The answer will show in Messages.');
        case 'start_captions': {
          if (m.live) return say('Live captions are already on.');
          if (a.source === 'tab' && byVoice) {
            // The browser only opens the tab picker after a key press or click, not after speech.
            setPending(a);
            requestAnimationFrame(() => yesButton.current?.focus());
            return say('Sharing a tab needs a key press. Press Enter now, then pick the meeting tab and turn on "Also share tab audio".');
          }
          if (!m.who.current.me) m.who.current = { me: member?.name ?? '', date: today() };
          // The microphone must not caption Bridge's own voice: in the room, finish talking first, then start.
          // A tab needs the click right now (the share picker), so there Bridge only goes quiet.
          if (a.source === 'room') await sayAndWait('Starting live captions. I will stay quiet now. Press Alt+V twice to end the meeting.');
          else stopSpeaking();
          const problem = await m.start(a.source);
          if (problem) return say(problem);
          tone(660);
          return add('bridge', 'Live captions are on. Press Alt+V twice to end the meeting, Alt+Shift+V to talk to me.'); // shown, not spoken
        }
        case 'read_meeting': {
          const r = m.result;
          if (r?.status === 'working') {
            wantMeeting.current = a.parts ?? [];
            return say('Your meeting is still being processed. I will read it out as soon as it is ready, in about 20 seconds.');
          }
          if (r?.status === 'done') return say(meetingText(r.data, a.parts), { queue: true });
          const saved = await latestSavedMeeting(user?.id);
          if (saved) return say(`From your meeting "${saved.title}". ${meetingText(saved, a.parts)}`, { queue: true });
          return say(r?.status === 'error'
            ? `The last meeting could not be processed. ${r.error}`
            : 'There is no finished meeting yet. Say "start captions" when a meeting begins, or upload a recording on the Meetings page.');
        }
        case 'meeting_notes': {
          if (!m.live) return say('No meeting is live right now. Say "start captions" to begin.', { queue: true });
          const text = a.which === 'missed' ? await m.catchUp() : await m.showNotes(a.which);
          return say(text || 'Sorry, I could not get that.', { queue: true });
        }
        case 'end_meeting':
          if (!m.live) return say('No meeting is live right now.');
          await m.end(a.get_tasks !== false);
          if (a.get_tasks === false) return say('Live captions are off.');
          navigate('/meetings');
          return say('Meeting ended. I opened Meetings; your tasks are on the way.');
        case 'close':
          // The goodbye is already being read out; closing does not cut it off.
          rec.current?.abort();
          return setOpen(false);
        default:
          return undefined;
      }
    } catch (e) {
      say(`Sorry, that did not work. ${e.message}`);
    }
  };

  const act = async ({ say: text, action: a }) => {
    setPending(null);
    let full = a;
    if (a.type === 'start_captions') full = { ...a, source: a.source ?? (canCaptureTab() ? 'tab' : 'room') };
    if (a.type === 'reply_message') {
      const thread = await findThread(a.person, user?.id);
      if (!thread) return say('You have no conversations yet. Say "ask my manager" to start one.');
      full = { ...a, thread_id: thread.id, recipient: thread.recipient };
    }
    if (CONFIRM[a.type]) {
      setPending(full);
      return say(CONFIRM[a.type].ask(full)); // our own read-back, word for word, never the model's paraphrase
    }
    if (text && !QUIET.has(a.type) && !(a.type === 'meeting_notes' && !m.live)) say(text); // no "here is what you missed" before "no meeting is live"
    return run(full);
  };

  const decide = (yes) => {
    const a = pending;
    setPending(null);
    if (yes) return run(a);
    say('Okay, cancelled.');
  };

  const handle = async (raw) => {
    const text = raw.trim();
    if (!text || thinking) return;
    add('you', text);
    const t = text.toLowerCase().replace(/[.!?]+$/, '');
    if (/^(repeat|again|say (that|it) again|what did you say)$/.test(t)) return last.current ? say(last.current) : say(HELP);
    if (/^(slower|speak slower|slow down)$/.test(t)) return changeSettings({ output: { pace: 'slow' } });
    if (/^(faster|speak faster|normal speed)$/.test(t)) return changeSettings({ output: { pace: 'normal' } });
    if (/^(help|what can i say)$/.test(t)) return say(HELP);
    if (/^(undo|undo that|take it back|revert)$/.test(t)) {
      if (!undo.current) return say('There is nothing to undo.');
      await undo.current();
      undo.current = null;
      return say('Undone.');
    }
    if (pending && YES.test(t)) { setPending(null); return run(pending, { byVoice: true }); }
    if (pending && NO.test(t)) { setPending(null); return say('Okay, cancelled.'); }
    if (/^(stop|quiet|be quiet|shh)$/.test(t)) return stopSpeaking();

    const history = log.slice(-HISTORY_TURNS).map((e) => ({ role: e.who === 'you' ? 'user' : 'assistant', text: e.text }));
    const meeting = { working: 'being processed', done: 'processed, ready to read', error: 'failed' }[m.result?.status];
    const page = { path: pathname, title: document.querySelector('main h1')?.textContent ?? '', live: m.live, meeting };
    setThinking(true);
    try {
      await act(await api('/assistant', { method: 'POST', body: { text, history, page, settings: flatSettings(prefs), pending } }));
    } catch (e) {
      say(`Sorry, that did not work. ${e.message}`);
    } finally {
      setThinking(false);
    }
  };

  const listen = async () => {
    if (mic === 'transcribing') return;
    if (mic === 'listening') {
      if (rec.current) return rec.current.stop(); // onEnd sends what was heard
      setMic('transcribing');
      try {
        const text = await transcribeOnServer(await recording.current.stop());
        tone(440);
        handle(text);
      } catch (e) {
        say(e.message);
      } finally {
        recording.current = null;
        setMic('idle');
      }
      return;
    }
    stopSpeaking();
    setOpen(true);
    setHeard('');
    let got = '';
    let failed = '';
    rec.current = createRecognizer({
      onResult: (t) => { got = t; setHeard(t); },
      onError: (e) => { failed = e; },
      onEnd: () => {
        rec.current = null;
        setMic('idle');
        if (got.trim()) { tone(440); return latest.current.handle(got); }
        latest.current.say(failed === 'not-allowed' ? 'The microphone is blocked. Allow it in the browser, or type instead.' : "I didn't hear anything. Press Alt+V and try again.");
      },
    });
    tone(880);
    if (rec.current) {
      rec.current.start();
      return setMic('listening');
    }
    try {
      recording.current = await startRecording(); // no Web Speech (Firefox): record, then the server writes it down
      setMic('listening');
    } catch (e) {
      say(e.message);
    }
  };

  useEffect(() => {
    latest.current = { handle, listen, say, open, live: m.live, listening: mic !== 'idle', endByKey };
  });

  // Alt+V from anywhere: start or stop listening; during a live meeting it ends the meeting instead (press twice).
  // Alt+Shift+V always talks. Physical key, so it works on any layout and on Mac (Option+V). Esc in the panel: stop talking and listening.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && latest.current.open) {
        stopSpeaking();
        rec.current?.stop();
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey || e.code !== 'KeyV') return;
      e.preventDefault();
      if (latest.current.live && !e.shiftKey && !latest.current.listening) return latest.current.endByKey();
      latest.current.listen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    logBox.current?.scrollTo({ top: logBox.current.scrollHeight });
  }, [log, open]);

  // Asked about the meeting while it was being processed: read it out the moment it is ready.
  useEffect(() => {
    const status = m.result?.status;
    if (!wantMeeting.current || !status || status === 'working') return;
    const parts = wantMeeting.current;
    wantMeeting.current = null;
    latest.current.say(status === 'done' ? meetingText(m.result.data, parts) : `The meeting could not be processed. ${m.result.error}`, { queue: true });
  }, [m.result]);

  // Closing hands focus back to the launcher, so keyboard users are not dropped at the top of the page.
  useEffect(() => {
    if (!open && wasOpen.current) launcher.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const openPanel = () => {
    setOpen(true);
    requestAnimationFrame(() => input.current?.focus());
    if (!read(SEEN_KEY)) {
      write(SEEN_KEY, true);
      say(GREETING);
    }
  };

  const close = () => {
    stopSpeaking();
    rec.current?.abort();
    setOpen(false);
  };

  const submit = (e) => {
    e.preventDefault();
    const text = typed;
    setTyped('');
    handle(text);
  };

  const status = mic === 'listening' ? `Listening… ${heard}` : mic === 'transcribing' ? 'Writing down what you said…' : thinking ? 'Working on it…' : '';

  if (!open) {
    return (
      <button ref={launcher} type="button" className="btn btn-primary fixed right-4 bottom-4 z-20 shadow-lg" aria-keyshortcuts={m.live ? 'Alt+Shift+V' : 'Alt+V Alt+Shift+V'} onClick={openPanel}>
        Talk to Bridge ({m.live ? 'Alt+Shift+V' : 'Alt+V'})
      </button>
    );
  }

  return (
    <section
      aria-labelledby="talk-h"
      className="card fixed right-4 bottom-4 z-20 flex max-h-[min(36rem,80vh)] w-[min(26rem,calc(100vw-2rem))] flex-col gap-3 shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="talk-h" className="text-lg font-semibold">Talk to Bridge</h2>
        <button type="button" className="btn" onClick={close}>Close</button>
      </div>

      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must be reachable by keyboard to reread earlier replies */}
      <ol ref={logBox} aria-label="Conversation" tabIndex={0} className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto">
        {log.length === 0 && <li className="text-muted">{HELP}</li>}
        {log.map((e) => (
          <li key={e.id} className={`rounded-lg px-3 py-2 ${e.who === 'you' ? 'justify-self-end bg-accent-soft' : 'border border-[var(--border)]'}`}>
            <span className="sr-only">{e.who === 'you' ? 'You: ' : 'Bridge: '}</span>
            {e.text}
          </li>
        ))}
      </ol>

      {pending && (
        <div role="group" aria-label="Waiting for your answer" className="flex flex-wrap gap-2">
          <button ref={yesButton} type="button" className="btn btn-primary" onClick={() => decide(true)}>{CONFIRM[pending.type].yes}</button>
          <button type="button" className="btn" onClick={() => decide(false)}>No</button>
        </div>
      )}
      {status && <p className="text-muted">{status}</p>}

      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={listen} disabled={mic === 'transcribing'}>
          {mic === 'listening' ? 'Stop listening' : 'Speak'}
        </button>
        <label htmlFor="talk-input" className="sr-only">Type a request</label>
        <input
          ref={input}
          id="talk-input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Or type here"
          autoComplete="off"
          className="field min-h-11 min-w-0 flex-1"
        />
        <button type="submit" className="btn btn-primary" disabled={thinking || !typed.trim()}>Go</button>
      </form>
      <label className="inline-flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          checked={voice}
          onChange={(e) => { setVoice(e.target.checked); write(VOICE_KEY, e.target.checked); if (!e.target.checked) stopSpeaking(); }}
          className="size-5"
        />
        Read replies aloud with Bridge's voice
      </label>
      <p className="text-sm text-muted">Turn it off if your screen reader should read them. Nothing is sent or recorded without your yes.</p>
      {m.live && <p className="text-sm text-muted">A meeting is running: press Alt+V twice to end it, Alt+Shift+V to talk to me. Headphones keep my voice out of the meeting.</p>}
    </section>
  );
}
