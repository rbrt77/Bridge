// Owner: Track C (F4). Output shape = server/src/mocks/review.json. Explains intent + convention, never emotions.
import { notImplemented } from '../middleware/errors.js';

export async function explainReview({ pr_url }) {
  // TODO(C): github.getPullComments + getPullReviews + getIssueComments → retrieve review guide → generateJson per comment
  // Convention: "nit:" = optional, "blocking:" = required, "?" = question
  throw notImplemented('explainReview');
}
