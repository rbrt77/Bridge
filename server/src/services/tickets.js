// Owner: Track C (F2). Output shape = server/src/mocks/ticket.json.
import { notImplemented } from '../middleware/errors.js';

export async function decodeTicket({ issue_url, text }) {
  // TODO(C):
  // 1. github.getIssue(url) + comments  (or use pasted text)
  // 2. images in body → describeImage (F8)
  // 3. retrieve DoD/CONTRIBUTING/ARCHITECTURE/ADR + keyword match on github.getTree(repo)
  // 4. generateJson(prompts/ticket.js, TICKET_SCHEMA)
  throw notImplemented('decodeTicket');
}
