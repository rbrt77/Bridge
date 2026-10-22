// Owner: Track C + D (F7). Catalog in data/dev_adjustments.json (D writes it).
import { notImplemented } from '../middleware/errors.js';

export async function advise(needIds, catalog) {
  // TODO(C): pick adjustments for needIds from catalog + retrieve(company policy, legal) → letter (needs only, no diagnosis)
  throw notImplemented('advise');
}
