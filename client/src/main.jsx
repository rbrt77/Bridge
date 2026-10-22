import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.jsx';
import './styles.css';

// The app used to be called OnRamp: carry saved prefs, setup step and anon-question tokens over to the new keys.
try {
  for (const old of Object.keys(localStorage).filter((k) => k.startsWith('onramp.'))) {
    const key = old.replace('onramp.', 'bridge.');
    if (localStorage.getItem(key) == null) localStorage.setItem(key, localStorage.getItem(old));
    localStorage.removeItem(old);
  }
} catch { /* private mode */ }

if (import.meta.env.DEV) {
  const [React, ReactDOM, axe] = await Promise.all([import('react'), import('react-dom'), import('@axe-core/react')]);
  axe.default(React, ReactDOM, 1000);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
