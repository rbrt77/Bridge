// Owner: Track B. Decorative mark next to the "OnRamp" text; colors follow the contrast tokens.
export default function Logo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 shrink-0">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M8 23 L23 9 M14 9 h9 v9" fill="none" stroke="var(--accent-fg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
