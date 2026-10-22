// Owner: Track B. Magic-link sign-in (no password, no CAPTCHA). Rendered outside Layout, so it owns its <main>.
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { supabase } from '../lib/supabaseClient.js';
import { useSession } from '../auth/Session.jsx';
import { useAnnounce } from '../a11y/Announcer.jsx';
import Logo from '../components/Logo.jsx';

export default function Login() {
  const { status, mode } = useSession();
  const announce = useAnnounce();
  const from = useLocation().state?.from ?? '/today';
  const heading = useRef(null);
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');

  useEffect(() => { heading.current?.focus(); }, []);

  if (mode === 'supabase' && status === 'signedIn') return <Navigate to={from} replace />;

  const send = async (e) => {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter an email address like name@company.com.');
      return;
    }
    setError('');
    setPhase('sending');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + from },
    });
    if (err) {
      setPhase('idle');
      setError(err.message || 'Could not send the link. Check the address and try again.');
      return;
    }
    setPhase('sent');
    announce(`Sign-in link sent to ${email.trim()}. Check your inbox.`);
  };

  return (
    <main id="main" className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <p className="flex items-center gap-2 text-xl font-bold">
        <Logo />
        OnRamp
      </p>
      <div className="card mt-6 sm:p-8">
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold outline-none">Sign in to OnRamp</h1>

        {mode === 'demo' ? (
          <div className="mt-4 rounded-xl bg-accent-soft p-4">
            <p>Demo mode: sign-in is off because Supabase is not configured. You are signed in as Andrei.</p>
            <p className="mt-2"><Link to="/today">Continue to Today</Link></p>
          </div>
        ) : phase === 'sent' ? (
          <div className="mt-4 rounded-xl bg-accent-soft p-4">
            <p>We sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device to continue.</p>
            <p className="mt-2 text-muted">The link works once. No email after a minute? Check spam or send it again.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={send} className="btn">Send again</button>
              <button type="button" onClick={() => setPhase('idle')} className="btn">Use a different email</button>
            </div>
          </div>
        ) : (
          <form onSubmit={send} noValidate className="mt-4 flex flex-col gap-3">
            <p className="text-muted">We email you a one-time link. No password needed.</p>
            <label htmlFor="email" className="font-semibold">Work email</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'email-error' : undefined}
              className="field"
            />
            {error && <p id="email-error" role="alert" className="text-danger">{error}</p>}
            <button type="submit" disabled={phase === 'sending'} className="btn btn-primary">
              {phase === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
