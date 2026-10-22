// Shared. Thin fetch wrapper; shapes are in docs/API.md.
import { supabase } from './supabaseClient.js';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function authHeaders() {
  const { data } = (await supabase?.auth.getSession()) ?? { data: {} };
  return data?.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: { ...(body && { 'Content-Type': 'application/json' }), ...(await authHeaders()) },
    body: form ?? (body && JSON.stringify(body)),
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw Object.assign(new Error(data?.error?.message ?? 'Request failed'), { code: data?.error?.code });
  return data;
}
