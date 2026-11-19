import { Link } from 'react-router';

export function PinIcon({ size = 28, color = 'var(--accent)' }: { size?: number; color?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.6" />
    </svg>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <Link to="/" className="logo" aria-label="Onde Tô? — início">
      <PinIcon size={size + 8} />
      <span style={{ fontSize: size }}>Onde Tô?</span>
    </Link>
  );
}
