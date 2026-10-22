// Owner: Track B. Email + password sign-in (accounts are created by supabase/seed/team.mjs, no sign-up).
// Supabase keeps the session in localStorage, so you stay signed in until you sign out.
// Rendered outside Layout, so it owns its <main>.
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { supabase } from '../lib/supabaseClient.js';
import { useSession } from '../auth/Session.jsx';
import { useAnnounce } from '../a11y/Announcer.jsx';
import Logo from '../components/Logo.jsx';
import Wordmark from '../components/Wordmark.jsx';

export default function Login() {
  const { status, mode } = useSession();
  const announce = useAnnounce();
  const from = useLocation().state?.from ?? '/today';
  const heading = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { heading.current?.focus(); }, []);

  if (mode === 'supabase' && status === 'signedIn') return <Navigate to={from} replace />;

  const signIn = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter an email address like name@company.com.');
    if (!password) return setError('Enter your password.');
    setError('');
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message);
      return;
    }
    announce('Signed in.');
  };

  return (
    <main id="main" className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <p className="flex items-center gap-2 text-xl font-bold">
        <Logo />
        <Wordmark />
      </p>
      <div className="card mt-6 sm:p-8">
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold outline-none">Sign in to Bridge</h1>

        {mode === 'demo' ? (
          <div className="mt-4 rounded-xl bg-accent-soft p-4">
            <p>Demo mode: sign-in is off because Supabase is not configured. You are signed in as Andrei.</p>
            <p className="mt-2"><Link to="/today">Continue to Today</Link></p>
          </div>
        ) : (
          <form onSubmit={signIn} noValidate className="mt-4 flex flex-col gap-3">
            <label htmlFor="email" className="font-semibold">Work email</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
              className="field"
            />
            <label htmlFor="password" className="font-semibold">Password</label>
            <div className="flex gap-2">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                className="field flex-1"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="btn">
                {showPassword ? 'Hide' : 'Show'}<span className="sr-only"> password</span>
              </button>
            </div>
            {error && <p id="login-error" role="alert" className="text-danger">{error}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
