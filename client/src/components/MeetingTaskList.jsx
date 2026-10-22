// Owner: Track C (F3). Tasks from a meeting with a tick box, the same in Meetings, live captions and Today.
// tasks: [{ task, due, ticket, who, minute, quote, done?, meeting? }]. `compact` = the floating caption window.
import { dueLabel } from '../lib/dates.js';
import { GlossaryText } from './GlossaryTerm.jsx';

const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const tasksText = (tasks) =>
  tasks.map((t, i) => `${i + 1}. ${t.task}. ${t.due ? sentence(dueLabel(t.due)) : 'No deadline'}.${t.who ? ` Asked by ${t.who}.` : ''}`).join('\n');

export default function MeetingTaskList({ tasks, onToggle, legend = 'My tasks', showLegend = false, compact = false }) {
  const done = tasks.filter((t) => t.done).length;
  return (
    <fieldset>
      <legend className={showLegend ? 'text-lg font-semibold' : 'sr-only'}>{legend}</legend>
      <p className="text-sm text-muted">{done} of {tasks.length} done</p>
      <ul className="mt-1 flex flex-col">
        {tasks.map((t, i) => (
          <li key={t.key ?? `${i}-${t.task}`}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-accent-soft">
              <input type="checkbox" checked={!!t.done} onChange={(e) => onToggle(t, e.target.checked, i)} className="mt-1 size-5 min-h-0 shrink-0" />
              <span>
                <span className={`font-semibold ${t.done ? 'text-muted line-through' : ''}`}>{compact ? t.task : <GlossaryText text={t.task} />}</span>
                <span className="block text-sm">{t.due ? dueLabel(t.due) : 'No deadline'}{t.ticket && ` · Ticket ${t.ticket}`}{t.meeting && ` · ${t.meeting}`}</span>
                {!compact && t.quote && <span className="block text-sm text-muted">{t.who}{t.minute && ` at ${t.minute}`}: <q>{t.quote}</q></span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
