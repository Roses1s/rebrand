/**
 * Набор иконок проекта. Все рисуются в SVG 24×24 и наследуют цвет текста.
 * Использование: <Icon name="truck" size={18} />
 */
const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
    </>
  ),
  leads: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.6" />
      <rect x="9.5" y="4" width="5" height="10" rx="1.6" />
      <rect x="16" y="4" width="5" height="13" rx="1.6" />
    </>
  ),
  requests: (
    <>
      <path d="M14 3v5h5" />
      <path d="M19.5 21h-15A1.5 1.5 0 0 1 3 19.5v-15A1.5 1.5 0 0 1 4.5 3H14l6 6v10.5A1.5 1.5 0 0 1 19.5 21z" />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 6.5h11v10h-11z" />
      <path d="M13.5 10h4l3.5 3.5v3h-7.5z" />
      <circle cx="6.5" cy="18.5" r="2" />
      <circle cx="17.5" cy="18.5" r="2" />
    </>
  ),
  carriers: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.6 20c0-3.6 2.9-6 6.4-6s6.4 2.4 6.4 6" />
      <path d="M17 4.9a3.6 3.6 0 0 1 0 6.9" />
      <path d="M18.6 14.4c1.9.8 3 2.4 3 4.6" />
    </>
  ),
  warehouse: (
    <>
      <path d="M2.5 9.5 12 4l9.5 5.5V21H2.5z" />
      <path d="M7 21v-6.5h10V21" />
      <path d="M7 17.5h10" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20V11" />
      <path d="M10 20V4.5" />
      <path d="M16 20v-6" />
      <path d="M22 20H2" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="5.5" width="18" height="13.5" rx="2.6" />
      <path d="M3 10h18" />
      <circle cx="17" cy="14.6" r="1.1" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.2a2.7 2.7 0 1 1 4 2.4c-.8.5-1.3 1.1-1.3 2v.4" />
      <circle cx="12" cy="17.2" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5.5-2 6.5-2 6.5h16s-2-1-2-6.5" />
      <path d="M13.8 19a2 2 0 0 1-3.6 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6" />
    </>
  ),
  moon: <path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a7.1 7.1 0 0 0 11.1 11.1z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m6 9.5 6 6 6-6" />,
  arrowRight: (
    <>
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4-4" />
    </>
  ),
  spark: <path d="M13 2.5 4.5 14H10l-1 7.5L18.5 10H13z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20.5c0-4 3.4-6.6 7.5-6.6s7.5 2.6 7.5 6.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
};

export default function Icon({ name, size = 18, className = '', strokeWidth = 1.7 }) {
  const content = ICONS[name];
  if (!content) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`ico ${className}`.trim()}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}
