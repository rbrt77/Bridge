// Owner: Track B (F5 UI). Pre-filled draft, user edits and presses Send — nothing is sent automatically.
// TODO(B): Supabase Realtime subscription on help_messages (fallback poll every 2s); announce new messages politely.
import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAnnounce } from '../a11y/Announcer.jsx';

export default function HelpChat({ handoff, question, onClose }) {
  const [draft, setDraft] = useState(handoff.draft);
  const [sent, setSent] = useState(false);
  const announce = useAnnounce();
  const send = async () => {
    await api('/help/threads', { method: 'POST', body: { question, draft } });
    setSent(true);
    announce(`Sent to ${handoff.helper.name}`);
  };
  return (
    <section aria-labelledby="help-h" className="mt-4 rounded border p-4">
      <h2 id="help-h" className="font-semibold">Ask {handoff.helper.name} ({handoff.helper.role})</h2>
      {handoff.topic_owner && <p>{handoff.topic_owner}</p>}
      <label htmlFor="help-draft" className="block">Your message (you can edit it)</label>
      <textarea id="help-draft" value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className="w-full border p-2" disabled={sent} />
      <div className="flex gap-2">
        <button type="button" onClick={send} disabled={sent} className="rounded border px-3">{sent ? 'Sent' : 'Send'}</button>
        <button type="button" onClick={onClose} className="rounded border px-3">Cancel</button>
      </div>
      {/* TODO(B): anonymous option "Send anonymously to the team FAQ" — "Your team sees the question, never who asked." */}
    </section>
  );
}
