import NameView from "./NameView";

// Edge SSR so every name page gets real Open Graph tags — the whole point of
// a shareable page is the link unfurling nicely in Discord/Telegram/X.
export const runtime = "edge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.ergonames.io";

const clean = (n) => decodeURIComponent(n ?? "").replace(/^~/, "").slice(0, 25).toLowerCase();

export async function generateMetadata({ params }) {
  const name = clean(params.name);
  let state = "on Ergo";
  try {
    const r = await (await fetch(`${API_URL}/resolve/${name}`, { signal: AbortSignal.timeout(4000) })).json();
    if (r.isAvailable === false) state = `registered ErgoName #${r.registrationNumber ?? ""}`.trim();
    else if (r.isReserved) state = "reserved — mintable with verification";
    else if (r.isAvailable) state = "available to register";
  } catch {}
  const title = `~${name} — ErgoNames`;
  const description = `~${name} is ${state}. Lifetime web3 username on the Ergo blockchain.`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: "ErgoNames", type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default function NamePage({ params }) {
  return <NameView name={clean(params.name)} />;
}
