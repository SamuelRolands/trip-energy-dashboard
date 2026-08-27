// GRADIA's mark: an ascending sparkline (a "gradient" - the pun the name is
// built on - and a trip's energy curve) inside a rounded square. No image
// assets, just inline SVG so it stays crisp at any size.
export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="gradia-mark" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4285f4" />
          <stop offset="1" stopColor="#00bfa5" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#gradia-mark)" />
      <path
        d="M7 21.5L12.5 16L17 19L25 9"
        stroke="white"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <circle cx="25" cy="9" r="2.4" fill="white" />
    </svg>
  );
}
