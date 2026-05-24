/** Transparent empty workstation — use instead of a flat white PNG on dark UI */
export function EmptyWorkstationVisual({
  className = 'w-14 h-14',
  title = 'Empty workstation',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Table top */}
      <path
        d="M12 28 L32 18 L52 28 L32 38 Z"
        fill="rgba(34,211,238,0.12)"
        stroke="rgba(34,211,238,0.55)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Front face */}
      <path
        d="M12 28 L12 44 L32 54 L32 38 Z"
        fill="rgba(15,23,42,0.6)"
        stroke="rgba(148,163,184,0.7)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Right face */}
      <path
        d="M32 38 L52 28 L52 44 L32 54 Z"
        fill="rgba(30,41,59,0.75)"
        stroke="rgba(148,163,184,0.55)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Legs */}
      <line x1="16" y1="44" x2="16" y2="56" stroke="rgba(148,163,184,0.5)" strokeWidth="2" strokeLinecap="round" />
      <line x1="48" y1="44" x2="48" y2="56" stroke="rgba(148,163,184,0.5)" strokeWidth="2" strokeLinecap="round" />
      {/* Plus hint */}
      <circle cx="32" cy="24" r="7" fill="rgba(34,211,238,0.15)" stroke="rgba(34,211,238,0.6)" strokeWidth="1.2" />
      <path d="M32 20.5 V27.5 M28.5 24 H35.5" stroke="rgba(34,211,238,0.9)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
