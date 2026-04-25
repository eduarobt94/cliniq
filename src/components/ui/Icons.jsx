export const Icons = {
  Logo: ({ size = 20, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5L3.5 7.5V16.5L12 21.5L20.5 16.5V7.5L12 2.5Z" stroke={color} strokeWidth="1.4" />
      <circle cx="12" cy="12" r="3.2" fill={color} />
    </svg>
  ),
  Arrow: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7h8m0 0L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowUpRight: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M4 10L10 4M10 4H5M10 4V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Check: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Home: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 7L8 2.5L13.5 7V13.5H2.5V7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  Calendar: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 2V5M11 2V5M2.5 6.5H13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Users: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 13C2 10.8 3.8 9.5 6 9.5C8.2 9.5 10 10.8 10 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 4.5C12.4 4.5 13.5 5.6 13.5 7C13.5 8.4 12.4 9.5 11 9.5M11.5 13H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Zap: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9 2L3.5 9H8L7 14L12.5 7H8L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  Chat: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 3.5H13.5V11H6L3 13.5V11H2.5V3.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  Chart: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 13.5H14M4 11V8M7 11V4M10 11V7M13 11V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Settings: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.5 3.5L4.5 4.5M11.5 11.5L12.5 12.5M3.5 12.5L4.5 11.5M11.5 4.5L12.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Search: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Bell: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 7C4 4.8 5.8 3 8 3C10.2 3 12 4.8 12 7V10L13 11.5H3L4 10V7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6.5 13C6.7 13.6 7.3 14 8 14C8.7 14 9.3 13.6 9.5 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Whatsapp: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 13.5L3.5 10.5C2.9 9.6 2.5 8.6 2.5 7.5C2.5 4.7 4.7 2.5 7.5 2.5C10.3 2.5 12.5 4.7 12.5 7.5C12.5 10.3 10.3 12.5 7.5 12.5C6.4 12.5 5.4 12.1 4.5 11.5L2.5 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.5 6.5C5.5 7.9 6.6 9.5 8 9.5M6 6.2C6.3 5.8 6.5 5.2 6 5C5.5 4.8 5 5.3 5 5.8M8.2 8.8C8.8 9 9.5 9 9.8 8.5C10 8 9.3 7.5 9 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  Plus: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  Menu: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 5.5H15M3 9H15M3 12.5H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  Close: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  Eye: ({ size = 16, open = true }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {open ? (
        <>
          <path d="M1.5 8C3 5 5.3 3.5 8 3.5C10.7 3.5 13 5 14.5 8C13 11 10.7 12.5 8 12.5C5.3 12.5 3 11 1.5 8Z" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
        </>
      ) : (
        <>
          <path d="M1.5 8C3 5 5.3 3.5 8 3.5C10.7 3.5 13 5 14.5 8C13 11 10.7 12.5 8 12.5C5.3 12.5 3 11 1.5 8Z" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 2L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </>
      )}
    </svg>
  ),
  Lock: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7V5C5 3.3 6.3 2 8 2C9.7 2 11 3.3 11 5V7" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  Mail: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 4.5L8 8.5L13.5 4.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  Sparkle: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5L8.2 5.8L12.5 7L8.2 8.2L7 12.5L5.8 8.2L1.5 7L5.8 5.8L7 1.5Z" fill="currentColor" />
    </svg>
  ),
  TrendUp: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 10L6 6L8.5 8.5L12 5M12 5H9M12 5V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  TrendDown: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 5L6 9L8.5 6.5L12 10M12 10H9M12 10V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  More: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="4" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
  ),
  Pulse: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8H4L5.5 3.5L8.5 12.5L10.5 8H15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  UserPlus: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 13C2 10.8 4 9.5 6.5 9.5C9 9.5 11 10.8 11 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 6V10M11 8H15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Copy: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="4.5" y="4.5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 9.5H2.5C1.95 9.5 1.5 9.05 1.5 8.5V2.5C1.5 1.95 1.95 1.5 2.5 1.5H8.5C9.05 1.5 9.5 1.95 9.5 2.5V4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
};
