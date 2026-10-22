// Owner: Track C. Download deadlines as .ics (F2, F3).
import { API_URL, authHeaders } from './api.js';

export function downloadIcs(events, filename = 'bridge.ics') {
  const fmt = (d) => d.replaceAll('-', '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bridge//EN'];
  for (const e of events) lines.push('BEGIN:VEVENT', `UID:${crypto.randomUUID()}@bridge`, `DTSTART;VALUE=DATE:${fmt(e.date)}`, `SUMMARY:${e.what}`, 'END:VEVENT');
  lines.push('END:VCALENDAR');
  saveBlob(new Blob([lines.join('\r\n')], { type: 'text/calendar' }), filename);
}

/** Open steps of a saved checklist as back-to-back calendar blocks (built server-side). */
export async function downloadChecklistIcs(checklistId, filename = 'checklist.ics') {
  const res = await fetch(`${API_URL}/api/checklists/${checklistId}/ics`, { headers: await authHeaders() });
  if (!res.ok) throw new Error('Could not download the calendar file');
  saveBlob(await res.blob(), filename);
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}
