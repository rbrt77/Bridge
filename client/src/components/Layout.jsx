// Owner: Track B. Landmarks, skip link, single h1 per page (pages render their own h1).
// Below xl the header collapses into a Menu disclosure so 320px / 200% zoom never scrolls sideways,
// and the admin nav (2 extra links) still fits on one line at 1280px.
import { NavLink, Outlet, Link, useLocation } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { useShortcuts } from '../a11y/useShortcuts.js';
import { useHasRole, useSession } from '../auth/Session.jsx';
import Logo from './Logo.jsx';

const NAV = [
  { to: '/today', label: 'Today' },
  { to: '/ask', label: 'Ask' },
  { to: '/work', label: 'Work' },
  { to: '/meetings', label: 'Meetings' },
  { to: '/support', label: 'Support' },
];

const item = 'inline-flex min-h-11 items-center rounded-lg px-3 no-underline';
// Active page: tinted pill + bold (not color alone); aria-current="page" comes from NavLink.
const navClass = ({ isActive }) => `${item} ${isActive ? 'bg-accent-soft font-bold text-accent' : 'text-fg hover:bg-accent-soft'}`;

export default function Layout() {
  useShortcuts();
  const main = useRef(null);
  const menuButton = useRef(null);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { member, mode, signOut } = useSession();
  const isManager = useHasRole('manager', 'admin');
  const isAdmin = useHasRole('admin');

  // On route change: close menu, start at the top, move focus to the new page without scrolling past the header.
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

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
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only z-10 rounded-lg bg-surface focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:p-3">Skip to content</a>
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2 sm:px-6 sm:py-3">
          <Link to="/today" className="mr-2 inline-flex min-h-11 items-center gap-2 px-1 text-xl font-bold text-fg no-underline">
            <Logo />
            OnRamp
          </Link>
          <button
            ref={menuButton}
            type="button"
            className="btn ml-auto xl:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
          >
            Menu
          </button>
          <div id="site-menu" className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-2 xl:flex xl:w-auto xl:flex-1 xl:flex-row xl:flex-wrap xl:items-center`}>
            <nav aria-label="Main">
              <ul className="flex flex-col xl:flex-row xl:flex-wrap xl:gap-1">
                {NAV.map((n) => (
                  <li key={n.to}><NavLink to={n.to} className={navClass}>{n.label}</NavLink></li>
                ))}
              </ul>
            </nav>
            <ul className="flex flex-col border-t border-border-subtle pt-2 xl:flex-row xl:flex-wrap xl:gap-1 xl:border-0 xl:pt-0" aria-label="More">
              <li><NavLink to="/glossary" className={navClass}>Glossary</NavLink></li>
              {isManager && <li><NavLink to="/insights" className={navClass}>Insights</NavLink></li>}
              {isAdmin && <li><NavLink to="/company" className={navClass}>Company</NavLink></li>}
            </ul>
            <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-2 xl:ml-auto xl:border-0 xl:pt-0">
              <NavLink
                to="/work-style"
                className={({ isActive }) => `btn ${isActive ? 'border-accent bg-accent-soft text-accent' : ''}`}
                aria-keyshortcuts="Alt+A Alt+Shift+A"
              >
                Work style <span className="sr-only">(Alt+A or Alt+Shift+A)</span>
              </NavLink>
              {mode === 'supabase' && (
                <>
                  <span title={member?.name} className="flex items-center gap-2 px-1 text-muted">
                    <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-accent-soft font-bold text-accent uppercase">
                      {member?.name?.[0]}
                    </span>
                    <span className="sr-only 2xl:not-sr-only">{member?.name}</span>
                  </span>
                  <button type="button" onClick={signOut} className="btn">Sign out</button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main id="main" ref={main} tabIndex={-1} className="mx-auto w-full max-w-4xl px-4 py-6 outline-none sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="mt-auto border-t border-border-subtle bg-surface">
        <p className="mx-auto max-w-7xl px-4 py-4 text-sm text-muted sm:px-6">
          <Link to="/about-ai">About the AI</Link> · Answers are AI-generated and cite team documents.
        </p>
      </footer>
    </div>
  );
}
