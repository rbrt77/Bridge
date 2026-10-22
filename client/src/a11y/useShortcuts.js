// Owner: Track B. Alt+A = Work style, Alt+Q = Ask. Esc is handled by dialogs.
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export function useShortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'a') { e.preventDefault(); navigate('/work-style'); }
      if (k === 'q') { e.preventDefault(); navigate('/ask'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
}
