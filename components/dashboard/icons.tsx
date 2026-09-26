type IconProps = { className?: string };

const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.6 } as const;
const small = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.8 } as const;

export function EyeIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <path
        d="M3.5 3.5l17 17M10.6 10.7a3 3 0 0 0 4.2 4.2M7.4 7.6C4.9 9 3 12 3 12s3.5 7 9.5 7c1.7 0 3.2-.4 4.5-1.1M14.9 5.6A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a15 15 0 0 1-2.4 3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GoogleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.85Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.85C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

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

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} stroke="currentColor" aria-hidden="true">
      <path d="M3.5 11.5L12 4l8.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.75 9.75V19a1 1 0 0 0 1 1H10v-4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.25a1 1 0 0 0 1-1V9.75" strokeLinecap="round" strokeLinejoin="round" />
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

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} stroke="currentColor" aria-hidden="true">
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <path d="M21 3L10.5 13.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3l-7 18-4-8-8-4 19-6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CollapseIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M14.5 9.5L12 12l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExpandIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M12.5 9.5L15 12l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 16l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.25 12H9" strokeLinecap="round" />
    </svg>
  );
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} stroke="currentColor" aria-hidden="true">
      <rect x="4" y="3" width="11" height="18" rx="1" />
      <path d="M15 8.5h4.25a1 1 0 0 1 1 1V21H15" />
      <path d="M7.25 7h1.5M7.25 10.5h1.5M7.25 14h1.5M11 7h1.5M11 10.5h1.5M11 14h1.5" strokeLinecap="round" />
      <path d="M17 12.5h1M17 16h1" strokeLinecap="round" />
      <path d="M8 21v-3.25a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21" />
    </svg>
  );
}

export function HelpIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" />
      <path
        d="M9.5 9.25a2.5 2.5 0 1 1 3.6 2.24c-.75.38-1.1.9-1.1 1.76v.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CardIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} stroke="currentColor" aria-hidden="true">
      <rect x="2.75" y="5" width="18.5" height="14" rx="2" />
      <path d="M2.75 9.5h18.5" />
      <path d="M6 14h4" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <path d="M4.5 12.5l5 5 10-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...small} className={className} stroke="currentColor" aria-hidden="true">
      <path d="M12 3.5v11.5" strokeLinecap="round" />
      <path d="M7.5 11L12 15.5 16.5 11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 17.5v2a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2" strokeLinecap="round" strokeLinejoin="round" />
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
