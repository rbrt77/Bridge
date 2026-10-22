// Owner: Track B. One polite + one assertive live region. Announce status once, never token-by-token.
import { createContext, useCallback, useContext, useState } from 'react';

const AnnouncerContext = createContext(() => {});

export function AnnouncerProvider({ children }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const announce = useCallback((msg, { urgent = false } = {}) => {
    const set = urgent ? setAssertive : setPolite;
    set('');
    setTimeout(() => set(msg), 50); // re-announce identical messages
  }, []);
  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div className="sr-only" aria-live="polite" role="status">{polite}</div>
      <div className="sr-only" aria-live="assertive" role="alert">{assertive}</div>
    </AnnouncerContext.Provider>
  );
}

export const useAnnounce = () => useContext(AnnouncerContext);
