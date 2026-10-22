// Owner: Track A. TODO(A): port utils/supabase.js from Internal_ai.
import { createClient } from '@supabase/supabase-js';
import { env } from '../env.js';

export const supabaseAdmin = env.supabaseUrl && env.supabaseServiceKey
  ? createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } })
  : null;
