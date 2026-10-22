// Owner: Track B. Secondary nav inside Ask: the docs Q&A and the conversations with people (PLAN §5: Help inbox lives in Ask).
import { NavLink } from 'react-router';

export default function AskTabs() {
  return (
    <nav aria-label="Ask" className="mb-6">
      <ul className="flex flex-wrap gap-1 border-b border-border-subtle pb-2">
        {[['/ask', 'Ask the docs'], ['/ask/messages', 'Messages']].map(([to, label]) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) => `inline-flex min-h-11 items-center rounded-lg px-3 no-underline ${isActive ? 'bg-accent-soft font-bold text-accent' : 'text-fg hover:bg-accent-soft'}`}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
