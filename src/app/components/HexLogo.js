// ErgoNames hexagon mark — the Ergo hexagon with a tilde, the ~name identity.
export default function HexLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="hexg" x1="0" y1="0" x2="56" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF7A45" />
          <stop offset="1" stopColor="#FF5C19" />
        </linearGradient>
      </defs>
      <path d="M28 1.15L54.27 16.3v30.3L28 61.74 1.73 46.6V16.3z"
        fill="url(#hexg)" fillOpacity="0.14" stroke="url(#hexg)" strokeWidth="2" />
      <path d="M17 36c2.2-5 5.3-7.5 8.4-7.5 4 0 4.6 4.5 8.6 4.5 2.6 0 4.6-1.9 6-4.5"
        stroke="url(#hexg)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}
