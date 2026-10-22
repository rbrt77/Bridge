// Owner: Track A (A17). Warms the retrieval cache with the questions asked live in the demo (data/demo-questions.json),
// so on stage only the answer is generated. On with WARM_DEMO=1; refreshed before the cache entries expire.
import { readFileSync } from 'node:fs';
import { logger } from '../utils/logger.js';
import { supabaseAdmin as db } from '../utils/supabase.js';
import { retrieve } from './retrieval.js';
import { codeWhereSearch } from './codemap.js';

const REFRESH_MS = 50 * 60_000; // cache TTL is 60 min

export async function warmDemo() {
  const { ask = [], code_where: codeWhere = [] } = JSON.parse(readFileSync(new URL('../../data/demo-questions.json', import.meta.url), 'utf8'));
  const { data: orgs } = await db.from('organizations').select('id');
  const t0 = Date.now();
  let warmed = 0;
  for (const { id: orgId } of orgs ?? []) {
    for (const question of ask) {
      try {
        await retrieve({ question, orgId, fresh: true }); // same defaults as /api/ask → same cache key
        warmed++;
      } catch (err) {
        logger.warn('warm-up failed:', question, err.message);
      }
    }
    for (const question of codeWhere) {
      try {
        await codeWhereSearch(question, orgId, { fresh: true });
        warmed++;
      } catch (err) {
        logger.warn('warm-up failed:', question, err.message);
      }
    }
  }
  logger.info(`demo warm-up: ${warmed} questions in ${Date.now() - t0} ms`);
}

export function startDemoWarmup() {
  warmDemo();
  setInterval(warmDemo, REFRESH_MS).unref();
}
