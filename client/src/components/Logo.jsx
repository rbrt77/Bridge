// Owner: Track B. Decorative mark next to the "Bridge" text: a tied-arch bridge over its reflection.
// Colors follow the contrast tokens; client/public/favicon.svg is the same mark with fixed colors.
export default function Logo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 shrink-0">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <g fill="none" stroke="var(--accent-fg)" strokeLinecap="round">
        <path d="M6 16.5 Q16 -1.5 26 16.5" strokeWidth="2.4" />
        <path d="M4.5 16.5 H27.5" strokeWidth="2.4" />
        <path d="M11 9.75 V16.5 M16 7.5 V16.5 M21 9.75 V16.5" strokeWidth="1.2" strokeLinecap="butt" />
        <path d="M9 21.5 H23 M12.5 25 H19.5" strokeWidth="1.6" strokeOpacity=".55" />
      </g>
    </svg>
  );
}
