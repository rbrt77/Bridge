// Owner: Track A. Verifies the Supabase JWT and loads org + role from organization_members.
import { env } from '../env.js';
import { supabaseAdmin } from '../utils/supabase.js';

const MOCK_USER = { id: '00000000-0000-0000-0000-000000000001', name: 'Andrei', role: 'member', orgId: 'demo-org', managerId: 'manager-ana' };

const deny = (res, status, code, message) => res.status(status).json({ error: { code, message } });

// Membership rarely changes during a demo; cache it briefly to keep TTFT low.
const memberCache = new Map();
const MEMBER_TTL_MS = 60_000;

async function loadMember(userId) {
  const hit = memberCache.get(userId);
  if (hit && hit.at > Date.now() - MEMBER_TTL_MS) return hit.member;
  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('org_id, display_name, role, manager_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  memberCache.set(userId, { member: data, at: Date.now() });
  return data;
}

export async function auth(req, res, next) {
  if (env.mock) {
    req.user = MOCK_USER;
    return next();
  }
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
  if (!token) return deny(res, 401, 'unauthenticated', 'Missing Authorization header');
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return deny(res, 401, 'unauthenticated', 'Invalid or expired session');
    const member = await loadMember(data.user.id);
    if (!member) return deny(res, 403, 'no_org', 'You are not a member of any organization');
    req.user = {
      id: data.user.id,
      email: data.user.email,
      name: member.display_name,
      role: member.role,
      orgId: member.org_id,
      managerId: member.manager_id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user?.role) ? next() : deny(res, 403, 'forbidden', 'Not allowed');
}
