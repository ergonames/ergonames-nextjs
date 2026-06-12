// The actual ErgoName NFT artwork, mirrored from the bot's on-chain SVG
// generator (MintTxBuilders.ergoNameSvg): 500x500 card, tinted tilde, white
// monospace name. Keys must stay in sync with the bot's whitelists — the bot
// is the authority; this is the preview.

export const ART_BACKGROUNDS = {
  black: "#000000",
  midnight: "#0B0D16",
  violet: "#1A0B2E",
  forest: "#07261B",
  maroon: "#2B0A0A",
  navy: "#0A1530",
};

export const ART_ACCENTS = {
  orange: "orange",
  ember: "#FF5E18",
  mint: "#2BD9A9",
  sky: "#4DA6FF",
  violet: "#B26EF7",
  gold: "#F5C542",
};

export default function NftCard({ name, bg = "black", accent = "orange", className = "" }) {
  const bgHex = ART_BACKGROUNDS[bg] ?? ART_BACKGROUNDS.black;
  const accentHex = ART_ACCENTS[accent] ?? ART_ACCENTS.orange;
  // Match the on-chain card's proportions: font scales down for long names
  // (the on-chain SVG uses a fixed 42px at 500px; we shrink only when the
  // name would overflow the card).
  const fontSize = name.length > 16 ? Math.max(20, 42 - (name.length - 16) * 2) : 42;
  return (
    <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="0" y="0" width="500" height="500" fill={bgHex} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} fontFamily="Monospace">
        <tspan fill={accentHex} fontWeight="bolder">~</tspan>
        <tspan fill="white">{name}</tspan>
      </text>
    </svg>
  );
}
