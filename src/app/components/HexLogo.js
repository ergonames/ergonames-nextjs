export default function HexLogo({ size = 34, dark = true }) {
  const stroke = dark ? "#C9CDD2" : "#3D3D3D";
  return (
    <svg width={size} height={size} viewBox="0 0 56 64" fill="none" aria-hidden="true">
      <path d="M28 1.7L53.6 16.5v29.5L28 60.8 2.4 46V16.5z" fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d="M17 35c2.3-5.2 5.4-7.7 8.6-7.7 4.1 0 4.7 4.6 8.8 4.6 2.7 0 4.7-2 6.1-4.6"
        stroke="#FF5537" strokeWidth="3.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
