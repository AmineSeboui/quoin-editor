import type { ReactNode } from 'react';

function Icon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const MoonIcon = () => (
  <Icon className="icon-moon">
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
  </Icon>
);

export const SunIcon = () => (
  <Icon className="icon-sun">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const CopyIcon = () => (
  <Icon className="icon-copy">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </Icon>
);

export const CheckIcon = () => (
  <Icon className="icon-check">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const PlayIcon = () => (
  <Icon className="icon-play">
    <path d="M8 5.5v13l11-6.5Z" />
  </Icon>
);

export const PauseIcon = () => (
  <Icon className="icon-pause">
    <path d="M9.5 5v14M14.5 5v14" />
  </Icon>
);

export const SearchIcon = () => (
  <Icon className="icon-search">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);

export const GitHubIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.5v-1.8c-2.92.63-3.54-1.4-3.54-1.4-.48-1.22-1.17-1.54-1.17-1.54-.95-.65.07-.64.07-.64 1.06.07 1.61 1.09 1.61 1.09.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.66-1.4-2.33-.27-4.78-1.17-4.78-5.2 0-1.14.41-2.08 1.08-2.81-.11-.27-.47-1.33.1-2.77 0 0 .88-.28 2.89 1.07a10 10 0 0 1 5.26 0c2-1.35 2.88-1.07 2.88-1.07.57 1.44.21 2.5.1 2.77.68.73 1.08 1.67 1.08 2.81 0 4.04-2.46 4.93-4.8 5.19.38.33.71.97.71 1.96v2.9c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z" />
  </svg>
);
