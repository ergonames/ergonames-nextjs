// Official ErgoNames mark (Logo V4, 2022): grey octagon + orange wave tilde.
// Brand constants sampled from the V4 master files: octagon #61656B,
// tilde #FF5638, black field. Filename kept as HexLogo for import stability.
export default function HexLogo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <polygon
        points="32,4 51.8,12.2 60,32 51.8,51.8 32,60 12.2,51.8 4,32 12.2,12.2"
        fill="none" stroke="#61656B" strokeWidth="5.5" />
      <path d="M20.2 35c2.3-5.2 5.4-7.7 8.6-7.7 4.1 0 4.7 4.6 8.8 4.6 2.7 0 4.7-2 6.1-4.6"
        stroke="#FF5638" strokeWidth="7" strokeLinecap="butt" fill="none" />
    </svg>
  );
}
