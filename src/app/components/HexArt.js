// Deterministic generative art for an ErgoName — a hexagon lattice tinted by
// the name, so every name has a unique, stable "portrait".
function rng(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hexPath(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 6; p.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`); }
  return p.join(" ");
}

export default function HexArt({ name, className = "" }) {
  const r = rng(name);
  const hue = Math.floor(r() * 360);
  const hue2 = (hue + 40 + Math.floor(r() * 80)) % 360;
  const cells = [];
  const R = 26, cols = 4, rows = 4;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const x = 30 + col * R * 1.8 + (row % 2) * R * 0.9;
      const y = 30 + row * R * 1.55;
      const on = r() > 0.42;
      if (on) cells.push({ x, y, l: 40 + Math.floor(r() * 45), h: r() > 0.5 ? hue : hue2, o: 0.55 + r() * 0.45 });
    }
  return (
    <svg viewBox="0 0 240 240" className={className} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg-${name}`} x1="0" y1="0" x2="240" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor={`hsl(${hue} 70% 12%)`} /><stop offset="1" stopColor={`hsl(${hue2} 70% 8%)`} />
        </linearGradient>
      </defs>
      <rect width="240" height="240" fill={`url(#bg-${name})`} />
      {cells.map((c, i) => (
        <polygon key={i} points={hexPath(c.x, c.y, R * 0.92)} fill={`hsl(${c.h} 85% ${c.l}%)`} opacity={c.o} />
      ))}
    </svg>
  );
}
