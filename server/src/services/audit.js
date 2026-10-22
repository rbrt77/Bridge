// Owner: Track A + D (F9). Criteria in data/audit_criteria.dev.json (D). Output = mocks/audit.json.
import { notImplemented } from '../middleware/errors.js';

export const priority = (f) => (f.impact * (f.mandatory ? 1.5 : 1) * ({ missing: 1, partial: 0.5 }[f.status] ?? 0)) / f.effort;

export async function runAudit(repo, user) {
  // TODO(A): layer 1 repo checks via GitHub API ; layer 2 LLM-judge per criterion with retrieve() + quotes
  // score 0–100, findings sorted by priority(), wording "no evidence found in the repo/docs"
  throw notImplemented('runAudit');
}
