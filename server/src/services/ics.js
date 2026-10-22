// Owner: Track C. Calendar file for deadlines (F2, F3).
// events: { what, date: 'YYYY-MM-DD' } (all-day) or { what, start: Date, minutes } (timed); optional description.
export function toIcs(events) {
  const body = events.map((e) => {
    const when = e.start
      ? [`DTSTART:${utc(e.start)}`, `DTEND:${utc(new Date(e.start.getTime() + (e.minutes ?? 30) * 60_000))}`]
      : [`DTSTART;VALUE=DATE:${e.date.replaceAll('-', '')}`];
    return [
      'BEGIN:VEVENT', `UID:${crypto.randomUUID()}@bridge`, `DTSTAMP:${utc(new Date())}`, ...when,
      `SUMMARY:${escape(e.what)}`, ...(e.description ? [`DESCRIPTION:${escape(e.description)}`] : []), 'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bridge//EN', ...body, 'END:VCALENDAR'].join('\r\n');
}

/** Open items of a checklist → back-to-back work blocks from `start`; items with a due date become all-day events. */
export function checklistToEvents(checklist, start = nextHour()) {
  let cursor = start;
  return checklist.items
    .filter((it) => !it.done)
    .map((it) => {
      const description = `${checklist.title}${checklist.source_url ? `\n${checklist.source_url}` : ''}`;
      if (it.due) return { what: it.text, date: it.due, description };
      const ev = { what: it.text, start: cursor, minutes: it.minutes ?? 30, description };
      cursor = new Date(cursor.getTime() + ev.minutes * 60_000);
      return ev;
    });
}

const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escape = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

function nextHour() {
  const d = new Date();
  d.setMinutes(60, 0, 0);
  return d;
}
