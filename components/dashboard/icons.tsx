type IconProps = { className?: string };

const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.6 } as const;
const small = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.8 } as const;

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <path
        d="M14.5 4.5l5 5L8 21H3v-5L14.5 4.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.5 6.5l5 5" strokeLinecap="round" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9 7V4.75A1.25 1.25 0 0 1 10.25 3.5h3.5A1.25 1.25 0 0 1 15 4.75V7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7l1 13.25A1.5 1.5 0 0 0 8.5 21.5h7a1.5 1.5 0 0 0 1.5-1.25L18 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

export function ClientsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} stroke="currentColor" aria-hidden="true">
      <circle cx="9" cy="7.5" r="3.25" />
      <path d="M2.75 19c0-3.45 2.8-5.5 6.25-5.5s6.25 2.05 6.25 5.5" strokeLinecap="round" />
      <path d="M15.5 4.6c1.6.35 2.75 1.75 2.75 3.4a3.5 3.5 0 0 1-2.25 3.27" strokeLinecap="round" />
      <path d="M17 13.6c2.3.5 3.75 2.1 3.75 4.4" strokeLinecap="round" />
    </svg>
  );
}

export function ClausesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} stroke="currentColor" aria-hidden="true">
      <rect x="5" y="2.75" width="14" height="18.5" rx="1.5" />
      <path d="M8.25 8h7.5M8.25 11.5h7.5M8.25 15h4.5" strokeLinecap="round" />
    </svg>
  );
}

export function TemplatesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} stroke="currentColor" aria-hidden="true">
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="1.5" />
      <path d="M2.75 9.25h18.5" />
      <path d="M9 9.25V21.25" />
    </svg>
  );
}

export function ContractsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} stroke="currentColor" aria-hidden="true">
      <path d="M6 2.75h9l4 4v13a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V4.25A1.5 1.5 0 0 1 6 2.75Z" />
      <path d="M14.5 2.75V7a1 1 0 0 0 1 1h4.25" />
      <path d="M8 13.5l2.5 2.5L16 10.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
