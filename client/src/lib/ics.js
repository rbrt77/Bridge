// Owner: Track C. Download deadlines as .ics (F2, F3).
export function downloadIcs(events, filename = 'onramp.ics') {
  const fmt = (d) => d.replaceAll('-', '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OnRamp//EN'];
  for (const e of events) lines.push('BEGIN:VEVENT', `UID:${crypto.randomUUID()}@onramp`, `DTSTART;VALUE=DATE:${fmt(e.date)}`, `SUMMARY:${e.what}`, 'END:VEVENT');
  lines.push('END:VCALENDAR');
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}
