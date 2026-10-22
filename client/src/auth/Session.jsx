// Owner: Track B. Supabase session (magic link) + SessionGuard. Without VITE_SUPABASE_* the app runs as the demo user (MOCK).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { supabase } from '../lib/supabaseClient.js';

const DEMO = { user: { id: '00000000-0000-0000-0000-000000000001', email: null }, member: { name: 'Andrei', role: 'member' } };
const SessionContext = createContext(null);

async function loadMember(user) {
  const { data } = await supabase
    .from('organization_members')
    .select('display_name, role, org_id, manager_id')
    .eq('user_id', user.id)
    .maybeSingle();
  // No row yet (or no RLS select policy): treat as a plain member.
  return data
    ? { name: data.display_name, role: data.role, orgId: data.org_id, managerId: data.manager_id }
    : { name: user.email?.split('@')[0] ?? 'You', role: 'member' };
}

export function SessionProvider({ children }) {
  const [state, setState] = useState(() =>
    supabase ? { status: 'loading', user: null, member: null } : { status: 'signedIn', ...DEMO },
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const apply = async (session) => {
      if (!session) return active && setState({ status: 'signedOut', user: null, member: null });
      const member = await loadMember(session.user).catch(() => ({ name: session.user.email, role: 'member' }));
      if (active) setState({ status: 'signedIn', user: session.user, member });
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    // Supabase warns against awaiting other calls inside this callback, so defer the member lookup.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(() => apply(session), 0);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const signOut = useCallback(() => supabase?.auth.signOut(), []);
  const value = { ...state, mode: supabase ? 'supabase' : 'demo', signOut };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

/** True when the current user may open a page restricted to `roles` (always true in demo mode). */
export function useHasRole(...roles) {
  const { member, mode } = useSession();
  return mode === 'demo' || roles.includes(member?.role);
}

export function SessionGuard({ roles }) {
  const { status, member, mode } = useSession();
  const location = useLocation();
  if (status === 'loading') return <p role="status" className="p-4">Loading…</p>;
  if (status === 'signedOut') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  // Demo mode opens every page so manager/admin screens (F9, F13) can be shown without accounts.
  if (roles && mode !== 'demo' && !roles.includes(member?.role)) {
    return (
      <>
        <h1 className="text-2xl font-bold">Not available</h1>
        <p className="mt-2">This page is only for {roles.join(' or ')} accounts.</p>
      </>
    );
  }
  return <Outlet />;
}
