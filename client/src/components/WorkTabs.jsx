// Owner: Track B. Secondary nav inside Work.
import { NavLink } from 'react-router';

export default function WorkTabs() {
  return (
    <nav aria-label="Work" className="mb-4">
      <ul className="flex gap-2">
        {[['tickets', 'Tickets'], ['reviews', 'Reviews'], ['setup', 'Setup']].map(([to, label]) => (
          <li key={to}><NavLink to={`/work/${to}`} className={({ isActive }) => `inline-flex items-center px-3 ${isActive ? 'font-bold underline' : ''}`}>{label}</NavLink></li>
        ))}
      </ul>
    </nav>
  );
}
