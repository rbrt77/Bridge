// Owner: Track B (F1). Profile lives on the device (localStorage); server sync is optional.
import { createContext, useContext, useEffect, useState } from 'react';

const DEFAULT_PREFS = {
  preset: [],
  display: { textSize: 'm', contrast: 'normal', font: 'default', spacing: 'normal', motion: 'full' },
  output: { length: 'normal', steps: false, tldr: false, audio: false, literal: false, screenReader: false },
};
const KEY = 'onramp.prefs';
const ProfileContext = createContext(null);

function load() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function ProfileProvider({ children }) {
  const [prefs, setPrefs] = useState(load);

  useEffect(() => {
    const root = document.documentElement;
    const d = prefs.display;
    root.dataset.textSize = d.textSize;
    root.dataset.contrast = d.contrast;
    root.dataset.font = d.font;
    root.dataset.spacing = d.spacing;
    root.dataset.motion = d.motion;
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
  }, [prefs]);

  const reset = () => setPrefs(DEFAULT_PREFS);
  return <ProfileContext.Provider value={{ prefs, setPrefs, reset }}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);
