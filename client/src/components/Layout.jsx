// Owner: Track B. Landmarks, skip link, single h1 per page (pages render their own h1).
// Below lg the header collapses into a Menu disclosure so 320px / 200% zoom never scrolls sideways.
import { NavLink, Outlet, Link, useLocation } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { useShortcuts } from '../a11y/useShortcuts.js';
import { useHasRole, useSession } from '../auth/Session.jsx';

const NAV = [
  { to: '/today', label: 'Today' },
  { to: '/ask', label: 'Ask' },
  { to: '/work', label: 'Work' },
  { to: '/meetings', label: 'Meetings' },
  { to: '/support', label: 'Support' },
];

const item = 'inline-flex min-h-11 items-center px-3 text-fg';
const navClass = ({ isActive }) => `${item} underline-offset-4 ${isActive ? 'font-bold underline' : 'no-underline hover:underline'}`;

export default function Layout() {
  useShortcuts();
  const main = useRef(null);
  const menuButton = useRef(null);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { member, mode, signOut } = useSession();
  const isManager = useHasRole('manager', 'admin');
  const isAdmin = useHasRole('admin');

  useEffect(() => { setOpen(false); main.current?.focus(); }, [pathname]); // close menu, move focus on route change

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      menuButton.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <a href="#main" className="sr-only z-10 bg-bg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:p-3">Skip to content</a>
      <header className="border-b border-border">
        <div className="flex flex-wrap items-center gap-2 p-2 sm:p-4">
          <Link to="/today" className="inline-flex min-h-11 items-center px-2 text-xl font-bold text-fg no-underline">OnRamp</Link>
          <button
            ref={menuButton}
            type="button"
            className="ml-auto rounded border border-border px-4 lg:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
          >
            Menu
          </button>
          <div id="site-menu" className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-2 lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:flex-wrap lg:items-center`}>
            <nav aria-label="Main">
              <ul className="flex flex-col lg:flex-row lg:flex-wrap lg:gap-1">
                {NAV.map((n) => (
                  <li key={n.to}><NavLink to={n.to} className={navClass}>{n.label}</NavLink></li>
                ))}
              </ul>
            </nav>
            <ul className="flex flex-col border-t border-border pt-2 lg:flex-row lg:flex-wrap lg:border-0 lg:pt-0" aria-label="More">
              <li><NavLink to="/glossary" className={navClass}>Glossary</NavLink></li>
              {isManager && <li><NavLink to="/insights" className={navClass}>Insights</NavLink></li>}
              {isAdmin && <li><NavLink to="/company" className={navClass}>Company</NavLink></li>}
            </ul>
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2 lg:ml-auto lg:border-0 lg:pt-0">
              <NavLink to="/work-style" className={`${item} rounded border border-border no-underline`} aria-keyshortcuts="Alt+A Alt+Shift+A">
                Work style <span className="sr-only">(Alt+A or Alt+Shift+A)</span>
              </NavLink>
              {mode === 'supabase' && (
                <>
                  <span className="px-2 text-muted">{member?.name}</span>
                  <button type="button" onClick={signOut} className="rounded border border-border px-3">Sign out</button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main id="main" ref={main} tabIndex={-1} className="mx-auto max-w-4xl p-4 outline-none">
        <Outlet />
      </main>
      <footer className="border-t border-border p-4 text-muted">
        <Link to="/about-ai">About the AI</Link> · Answers are AI-generated and cite team documents.
      </footer>
    </>
  );
}
