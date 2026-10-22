// Owner: Track B. Alt+A = Work style, Alt+Q = Ask; Alt+Shift+A/Q also work when an OS app grabs Alt+A. Esc is handled by dialogs.
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export function useShortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e) => {
      // Physical key (e.code), so it works on any layout (RO, Mac Option+A = "å").
      // Skip Ctrl+Alt: that is AltGr on Windows, used to type ă/â/ș.
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.code === 'KeyA') { e.preventDefault(); navigate('/work-style'); }
      if (e.code === 'KeyQ') { e.preventDefault(); navigate('/ask'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
}
