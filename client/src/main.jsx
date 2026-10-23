import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.jsx';
import './styles.css';

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
