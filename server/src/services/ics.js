// Owner: Track C. Calendar file for deadlines (F2, F3).
export function toIcs(events) {
  const fmt = (d) => d.replaceAll('-', '');
  const body = events.map((e) => [
    'BEGIN:VEVENT', `UID:${crypto.randomUUID()}@onramp`, `DTSTART;VALUE=DATE:${fmt(e.date)}`, `SUMMARY:${e.what}`, 'END:VEVENT',
  ].join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OnRamp//EN', ...body, 'END:VCALENDAR'].join('\r\n');
}
