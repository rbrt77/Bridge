// Owner: Track B (F5 UI). Help threads + messages: REST for reads/writes, Supabase Realtime for live updates,
// polling as fallback (no Supabase on the client, or the channel can't subscribe). RLS limits both to participants.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { supabase } from './supabaseClient.js';

const POLL_MS = 2000;
const THREADS_POLL_MS = 5000;
const SUBSCRIBE_TIMEOUT_MS = 5000;

/**
 * Subscribes to Postgres changes, or calls `poll` on an interval if Realtime is unavailable.
 * @returns {'live'|'polling'} how updates currently arrive (shown to the user, not just for debugging)
 */
function useLive({ channel, table, event = 'INSERT', filter, onChange, poll, pollMs, enabled = true }) {
  const [mode, setMode] = useState(supabase ? 'connecting' : 'polling');
  const cb = useRef({ onChange, poll });
  cb.current = { onChange, poll };

  useEffect(() => {
    if (!enabled) return;
    let timer = null;
    const startPolling = () => {
      if (timer) return;
      setMode('polling');
      timer = setInterval(() => cb.current.poll(), pollMs);
    };
    if (!supabase) {
      startPolling();
      return () => clearInterval(timer);
    }
    const fallback = setTimeout(startPolling, SUBSCRIBE_TIMEOUT_MS);
    const ch = supabase
      .channel(channel)
      .on('postgres_changes', { event, schema: 'public', table, ...(filter && { filter }) }, (p) => cb.current.onChange(p))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(fallback);
          clearInterval(timer);
          timer = null;
          setMode('live');
          cb.current.poll(); // catch anything sent between the first load and the subscription
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startPolling();
        }
      });
    return () => {
      clearTimeout(fallback);
      clearInterval(timer);
      supabase.removeChannel(ch);
    };
  }, [channel, table, event, filter, pollMs, enabled]);

  return mode === 'connecting' ? 'polling' : mode;
}

const byTime = (a, b) => a.created_at.localeCompare(b.created_at);
const merge = (list, incoming) => {
  const seen = new Map(list.map((m) => [m.id, m]));
  for (const m of incoming) seen.set(m.id, { ...seen.get(m.id), ...m });
  return [...seen.values()].sort(byTime);
};

/**
 * Messages of one thread, live. `names` maps user_id → display name (Realtime rows only carry author_id).
 * `onIncoming` fires for messages that arrive after the first load (for announcements).
 */
export function useThreadMessages(thread, { onIncoming } = {}) {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const loaded = useRef(false);
  const id = thread?.id;
  const names = useRef({});
  names.current = thread ? { [thread.requester_id]: thread.requester, [thread.helper?.id]: thread.helper?.name } : {};
  const incoming = useRef(onIncoming);
  incoming.current = onIncoming;

  // Side effects stay outside the state updater (StrictMode may run updaters twice).
  const ids = useRef(new Set());
  const add = useCallback((list) => {
    const fresh = list.filter((m) => !ids.current.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => ids.current.add(m.id));
    if (loaded.current) incoming.current?.(fresh);
    setMessages((cur) => merge(cur, fresh));
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { messages: list } = await api(`/help/threads/${id}/messages`);
      add(list);
      loaded.current = true;
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [id, add]);

  useEffect(() => {
    loaded.current = false;
    ids.current = new Set();
    setMessages([]);
    load();
  }, [load]);

  const mode = useLive({
    channel: `help-messages-${id}`,
    table: 'help_messages',
    filter: `thread_id=eq.${id}`,
    enabled: Boolean(id),
    pollMs: POLL_MS,
    poll: load,
    onChange: ({ new: m }) => add([{ ...m, author: names.current[m.author_id] ?? 'Someone' }]),
  });

  const send = async (body) => {
    const { message } = await api(`/help/threads/${id}/messages`, { method: 'POST', body: { body } });
    add([message]); // Realtime may deliver the same row too; ids dedupe it
    return message;
  };

  return { messages, error, mode, send, reload: load };
}

/** My threads (as requester or helper), refreshed live. `onNew` fires for threads that appear after the first load. */
export function useThreads({ userId, onNew } = {}) {
  const [threads, setThreads] = useState(null);
  const [error, setError] = useState('');
  const known = useRef(null);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  const load = useCallback(async () => {
    try {
      const { threads: list } = await api('/help/threads');
      if (known.current) {
        const fresh = list.filter((t) => !known.current.has(t.id));
        if (fresh.length) onNewRef.current?.(fresh);
      }
      known.current = new Set(list.map((t) => t.id));
      setThreads(list);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const mode = useLive({
    channel: `help-threads-${userId}`,
    table: 'help_threads',
    event: '*',
    pollMs: THREADS_POLL_MS,
    poll: load,
    onChange: load, // a row changed (new question, answered): reload names + order from the server
  });

  return { threads, error, mode, reload: load };
}

// Anonymous questions: the claim token is the only link to the asker and lives only in this browser.
const ANON_KEY = 'bridge.anon';
export function readAnon() {
  try { return JSON.parse(localStorage.getItem(ANON_KEY)) ?? []; } catch { return []; }
}
export function saveAnon(list) {
  try { localStorage.setItem(ANON_KEY, JSON.stringify(list)); } catch { /* private mode: token lives only in memory */ }
}
export async function askAnonymously(question) {
  const { claim_token } = await api('/anon', { method: 'POST', body: { question } });
  const entry = { token: claim_token, question, at: new Date().toISOString(), status: 'open' };
  saveAnon([entry, ...readAnon()]);
  return entry;
}
