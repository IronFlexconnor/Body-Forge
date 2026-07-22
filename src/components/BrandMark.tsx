/**
 * Body Forge brand mark: a barbell whose bar spikes at center —
 * one shape that reads as a rep, a heartbeat, and a flame.
 * Inline SVG so it inherits crispness at any size and needs no fetch.
 */
export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="Body Forge"
    >
      <defs>
        <linearGradient id="bf-tg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#59E3D2" />
          <stop offset="1" stopColor="#0FA5A0" />
        </linearGradient>
      </defs>
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path
          d="M120 322 L204 322 L256 196 L308 322 L392 322"
          stroke="url(#bf-tg)"
          strokeWidth="34"
        />
        <rect x="76" y="240" width="40" height="164" rx="20" fill="url(#bf-tg)" />
        <rect x="396" y="240" width="40" height="164" rx="20" fill="url(#bf-tg)" />
        <circle cx="256" cy="150" r="14" fill="#9BEFE3" />
      </g>
    </svg>
  );
}
