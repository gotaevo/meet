import * as React from 'react';

type P = { size?: number };
const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const MicIcon = ({ size, off }: P & { off?: boolean }) => (
  <svg {...base(size)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d={`M5 11a7 7 0 0 0 14 0M12 18v3${off ? 'M3 3l18 18' : ''}`} />
  </svg>
);
export const CamIcon = ({ size, off }: P & { off?: boolean }) => (
  <svg {...base(size)}>
    <rect x="2" y="6" width="14" height="12" rx="3" />
    <path d={`M16 10l6-3v10l-6-3${off ? 'M3 3l18 18' : ''}`} />
  </svg>
);
export const ShareIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M12 14V8M9 11l3-3 3 3M8 21h8" />
  </svg>
);
export const NoiseIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10v4" />
  </svg>
);
export const MoreIcon = ({ size }: P) => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
);
export const HangUpIcon = ({ size = 26 }: P) => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <path d="M12 9c-3.2 0-6.2.9-8.6 2.6-.6.4-.8 1.2-.5 1.9l.9 1.8c.3.6 1 .9 1.7.7l2.7-.9c.6-.2 1-.8 1-1.4v-1.5c.9-.3 1.8-.4 2.8-.4s1.9.1 2.8.4v1.5c0 .6.4 1.2 1 1.4l2.7.9c.7.2 1.4-.1 1.7-.7l.9-1.8c.3-.7.1-1.5-.5-1.9C18.2 9.9 15.2 9 12 9z" />
  </svg>
);
export const ChatIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 5h16v11H8l-4 4z" />
  </svg>
);
export const PeopleIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20c0-4 3-6 7-6s7 2 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.5 4 2.5 4 6" />
  </svg>
);
export const PipIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <rect x="12" y="11" width="8" height="7" rx="1" />
  </svg>
);
export const InfoIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const CloseIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const ChevronUpIcon = ({ size = 16 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);
export const SendIcon = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const PinIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v6" />
  </svg>
);
export const LayoutIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 12h18M12 4v16" />
  </svg>
);
export const ExpandIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);
export const GearIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </svg>
);
export const CopyIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M4 16V4h12" />
  </svg>
);
