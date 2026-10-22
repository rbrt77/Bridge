// Shared. Friendly deadlines: "due tomorrow", "due Thu 29 Oct", "overdue since Mon 19 Oct".
export function dueLabel(iso) {
  const days = Math.round((new Date(`${iso}T00:00`) - new Date(new Date().toDateString())) / 86_400_000);
  const date = new Date(`${iso}T00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return days < 0 ? `overdue since ${date}` : days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : `due ${date}`;
}
