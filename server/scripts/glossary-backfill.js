// Owner: Track A. Fills glossary_terms from documents ingested before extraction existed (or after a prompt change).
// Usage: node --env-file=../.env scripts/glossary-backfill.js [org_id]   (default: every organization)
import { supabaseAdmin as db } from '../src/utils/supabase.js';
import { backfillGlossary } from '../src/services/glossary.js';

const orgIds = process.argv[2] ? [process.argv[2]] : ((await db.from('organizations').select('id')).data ?? []).map((o) => o.id);
for (const orgId of orgIds) console.log(orgId, '→', await backfillGlossary(orgId), 'terms');
