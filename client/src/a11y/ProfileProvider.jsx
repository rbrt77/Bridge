// Owner: Track B (F1). Profile lives on the device (localStorage); server sync is opt-in.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabaseClient.js';

export const DEFAULT_PREFS = {
  preset: [],
  display: { textSize: 'm', contrast: 'normal', font: 'default', spacing: 'normal', motion: 'full' },
  output: { length: 'normal', pace: 'normal', steps: false, tldr: false, literal: false, screenReader: false },
};
const KEY = 'bridge.prefs';
const SYNC_KEY = 'bridge.prefs.sync';
const ProfileContext = createContext(null);

const known = (group, values) => Object.fromEntries(Object.entries(values ?? {}).filter(([k]) => k in DEFAULT_PREFS[group]));

/** Fills in keys missing from older saved profiles or from the server, and drops settings that no longer exist. */
function withDefaults(p) {
  return {
    preset: Array.isArray(p?.preset) ? p.preset : [],
    display: { ...DEFAULT_PREFS.display, ...known('display', p?.display) },
    output: { ...DEFAULT_PREFS.output, ...known('output', p?.output) },
  };
}

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function write(key, value) {
  try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

export function ProfileProvider({ children }) {
  const [prefs, setPrefs] = useState(() => withDefaults(read(KEY)));
  const [sync, setSyncState] = useState(() => read(SYNC_KEY) === true);
  const hadLocal = useRef(read(KEY) != null);

  useEffect(() => {
    const root = document.documentElement;
    const d = prefs.display;
    root.dataset.textSize = d.textSize;
    root.dataset.contrast = d.contrast;
    root.dataset.font = d.font;
    root.dataset.spacing = d.spacing;
    root.dataset.motion = d.motion;
    write(KEY, prefs);
  }, [prefs]);

  // New device + signed in: pull a synced copy if the user saved one before.
  useEffect(() => {
    if (hadLocal.current || !supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const res = await api('/profile').catch(() => null);
      if (res?.prefs) { setPrefs(withDefaults(res.prefs)); setSyncState(true); write(SYNC_KEY, true); }
    });
  }, []);

  // Opt-in sync: push changes, debounced.
  useEffect(() => {
    if (!sync) return;
    const t = setTimeout(() => api('/profile', { method: 'PUT', body: { prefs } }).catch(() => {}), 800);
    return () => clearTimeout(t);
  }, [prefs, sync]);

  const setSync = useCallback((on) => { setSyncState(on); write(SYNC_KEY, on); }, []);

  const reset = useCallback(() => setPrefs(DEFAULT_PREFS), []);

  /** Delete = defaults on this device + remove the synced copy. Returns false if the server copy could not be removed. */
  const remove = useCallback(async () => {
    setPrefs(DEFAULT_PREFS);
    const hadSync = read(SYNC_KEY) === true;
    setSync(false);
    if (!hadSync) return true;
    return api('/profile', { method: 'DELETE' }).then(() => true, () => false);
  }, [setSync]);

  return (
    <ProfileContext.Provider value={{ prefs, setPrefs, reset, remove, sync, setSync }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
