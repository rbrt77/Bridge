// Owner: Track B. Landmarks, skip link, single h1 per page (pages render their own h1).
import { NavLink, Outlet, Link, useLocation } from 'react-router';
import { useEffect, useRef } from 'react';
import { useShortcuts } from '../a11y/useShortcuts.js';

const NAV = [
  { to: '/today', label: 'Today' },
  { to: '/ask', label: 'Ask' },
  { to: '/work', label: 'Work' },
  { to: '/meetings', label: 'Meetings' },
  { to: '/support', label: 'Support' },
];

export default function Layout() {
  useShortcuts();
  const main = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { main.current?.focus(); }, [pathname]); // move focus on route change

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:p-3 focus:bg-[var(--bg)]">Skip to content</a>
      <header className="flex flex-wrap items-center gap-4 border-b border-[var(--border)] p-4">
        <Link to="/today" className="text-xl font-bold">OnRamp</Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-2">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} className={({ isActive }) => `inline-flex items-center px-3 underline-offset-4 ${isActive ? 'font-bold underline' : ''}`}>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Link to="/glossary" className="inline-flex items-center px-3">Glossary</Link>
        <Link to="/work-style" className="ml-auto inline-flex items-center rounded border border-[var(--border)] px-3" aria-keyshortcuts="Alt+A">
          Work style <span className="sr-only">(Alt+A)</span>
        </Link>
      </header>
      <main id="main" ref={main} tabIndex={-1} className="mx-auto max-w-4xl p-4 outline-none">
        <Outlet />
      </main>
      <footer className="border-t border-[var(--border)] p-4 text-[var(--muted)]">
        <Link to="/about-ai">About the AI</Link> · Answers are AI-generated and cite team documents.
      </footer>
    </>
  );
}
