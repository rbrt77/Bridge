// Owner: Track A. TODO(A): port middleware/auth.js from Internal_ai (verify Supabase JWT, load org + role).
import { env } from '../env.js';

const MOCK_USER = { id: '00000000-0000-0000-0000-000000000001', name: 'Andrei', role: 'member', orgId: 'demo-org', managerId: 'manager-ana' };

export function auth(req, res, next) {
  if (env.mock) {
    req.user = MOCK_USER;
    return next();
  }
  // TODO(A): validate Bearer token with supabase.auth.getUser(token), then attach req.user.
  return res.status(501).json({ error: { code: 'not_implemented', message: 'Auth not implemented yet; run with MOCK=1' } });
}

export function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ error: { code: 'forbidden', message: 'Not allowed' } });
}
