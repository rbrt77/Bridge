// Owner: Track B. Secondary nav inside Work.
import { NavLink } from 'react-router';

export default function WorkTabs() {
  return (
    <nav aria-label="Work" className="mb-4">
      <ul className="flex flex-wrap gap-1 border-b border-border-subtle pb-2">
        {[['tickets', 'Tickets'], ['reviews', 'Reviews'], ['setup', 'Setup']].map(([to, label]) => (
          <li key={to}><NavLink to={`/work/${to}`} className={({ isActive }) => `inline-flex min-h-11 items-center rounded-lg px-3 no-underline ${isActive ? 'bg-accent-soft font-bold text-accent' : 'text-fg hover:bg-accent-soft'}`}>{label}</NavLink></li>
        ))}
      </ul>
    </nav>
  );
}
