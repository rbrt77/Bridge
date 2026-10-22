// Owner: Track C. Checklists from F2 show up in Today (Track B UI). Owner-only rows.
import { Router } from 'express';
import { env } from '../env.js';
import { mock } from '../utils/mock.js';
import { listChecklists, getChecklist, createChecklist, setItemDone, deleteChecklist } from '../services/checklists.js';
import { toIcs, checklistToEvents } from '../services/ics.js';

const r = Router();
r.get('/', async (req, res) => {
  if (env.mock) return res.json(mock('checklists'));
  res.json({ checklists: await listChecklists(req.user.id) });
});
r.post('/', async (req, res) => {
  if (env.mock) return res.json({ checklist: { id: crypto.randomUUID(), ...req.body } });
  res.status(201).json({ checklist: await createChecklist(req.user.id, req.body) });
});
r.patch('/:id/items/:itemId', async (req, res) => {
  if (env.mock) return res.json({ ok: true });
  await setItemDone(req.user.id, req.params.id, req.params.itemId, req.body.done);
  res.json({ ok: true });
});
r.delete('/:id', async (req, res) => {
  if (env.mock) return res.status(204).end();
  await deleteChecklist(req.user.id, req.params.id);
  res.status(204).end();
});
// ?start=ISO datetime for the first work block (default: next full hour).
r.get('/:id/ics', async (req, res) => {
  const checklist = env.mock ? mock('checklists').checklists[0] : await getChecklist(req.user.id, req.params.id);
  const start = req.query.start ? new Date(req.query.start) : undefined;
  if (start && Number.isNaN(start.getTime())) return res.status(400).json({ error: { code: 'bad_request', message: 'start must be an ISO date' } });
  res.type('text/calendar').attachment('checklist.ics').send(toIcs(checklistToEvents(checklist, start)));
});
export default r;
