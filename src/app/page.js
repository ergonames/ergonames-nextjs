"use client";
import { useState, useEffect } from "react";
import { getStats } from "./lib/ergonames";
import HexLogo from "./components/HexLogo";
import HexArt from "./components/HexArt";
import ThemeToggle from "./components/ThemeToggle";
import Link from "next/link";
import { useRouter } from "next/navigation";

const FEATURES = [
  {
    title: "Yours for life",
    body: "One payment, permanent ownership. No renewals, no expiry, no losing your identity to a lapsed subscription. Your name is an NFT in your wallet.",
  },
  {
    title: "Fully on-chain",
    body: "The registry, the rules, even your name's artwork live on the Ergo blockchain. Nothing about your name depends on a server staying up.",
  },
  {
    title: "Stable USD pricing",
    body: "Names are priced in dollars by length and converted to ERG at the live oracle rate when you mint — short and memorable costs more, long costs cents.",
  },
  {
    title: "Safe by design",
    body: "Registration is front-running-proof, and every step is refundable with your signature alone. Nobody — including us — can strand your funds.",
  },
];

const STEPS = [
  { n: "1", t: "Search", d: "Find an available name you like." },
  { n: "2", t: "Register", d: "Sign two transactions with Nautilus. Our bot does the rest on-chain." },
  { n: "3", t: "Own it forever", d: "The name NFT lands in your wallet — use it, transfer it, keep it for life." },
];

export default function Home() {
  const [q, setQ] = useState("");
  const [stats, setStats] = useState(null);
  const router = useRouter();

  useEffect(() => { getStats().then(setStats); }, []);

  const go = () => {
    const c = q.trim().replace(/^~/, "");
    router.push(c ? `/mint?name=${encodeURIComponent(c)}` : "/mint");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#0B0D16] text-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-[76px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <HexLogo size={32} />
            <span className="text-lg tracking-wide"><b className="font-bold">ERGO</b><span className="font-light">NAMES</span></span>
            <span className="ml-1 px-2 py-0.5 rounded-full border border-ergo-500/60 text-ergo-400 text-[10px] font-bold tracking-widest">BETA</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/mint" className="text-sm text-white/70 hover:text-white transition hidden sm:block">Register</Link>
            <Link href="/records" className="text-sm text-white/70 hover:text-white transition hidden sm:block">My Names</Link>
            <Link href="/stats" className="text-sm text-white/70 hover:text-white transition hidden sm:block">Stats</Link>
            <ThemeToggle />
            <Link href="/mint" className="px-5 py-2 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition">Get your name</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-[#0B0D16] text-white">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-16 sm:pt-24 pb-20 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-6xl font-light tracking-tight animate-fade-up">
                Your name on <span className="font-bold">Ergo</span>.<br />
                <span className="text-ergo-400 font-bold">Forever.</span>
              </h1>
              <p className="mt-5 text-white/60 max-w-md leading-relaxed animate-fade-up" style={{ animationDelay: "60ms" }}>
                One human-readable name for your wallet and your on-chain identity.
                Bought once, owned for life — no renewals, ever.
              </p>
              <div className="mt-8 max-w-md flex items-stretch rounded-full bg-white/5 border border-white/15 overflow-hidden focus-within:border-ergo-500/60 transition animate-fade-up" style={{ animationDelay: "120ms" }}>
                <span className="pl-5 self-center text-ergo-500 text-xl font-bold">~</span>
                <input
                  className="flex-1 px-3 py-4 bg-transparent text-lg text-white placeholder:text-white/40 focus:outline-none min-w-0"
                  placeholder="find your name"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && go()}
                />
                <button onClick={go} className="px-7 bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition">Search</button>
              </div>
              {stats && (
                <p className="mt-6 text-white/40 text-sm animate-fade-in">
                  <span className="text-ergo-400 font-semibold">{stats.totalNames}</span> names registered
                  {stats.last7Days > 0 && <> · <span className="text-ergo-400 font-semibold">{stats.last7Days}</span> this week</>}
                  {" "}· from <span className="text-ergo-400 font-semibold">$0.01</span>
                </p>
              )}
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="w-80 h-80 rounded-3xl overflow-hidden border border-white/10 shadow-soft relative rotate-2 hover:rotate-0 transition-transform">
                <HexArt name="yourname" className="w-full h-full" />
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="text-white text-2xl font-semibold"><span className="text-ergo-400">~</span>yourname</div>
                  <div className="text-white/50 text-xs mt-0.5">Lifetime ownership · on-chain artwork</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-surface border border-line rounded-3xl shadow-soft p-6">
                <h3 className="text-ink font-semibold text-lg">{f.title}</h3>
                <p className="text-muted text-sm mt-2 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-16 sm:pb-20">
          <h2 className="text-ink text-2xl sm:text-3xl font-semibold text-center">How it works</h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-surface border border-line rounded-3xl shadow-soft p-6 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-ergo-500/15 text-ergo-500 font-bold flex items-center justify-center">{s.n}</div>
                <h3 className="text-ink font-semibold mt-3">{s.t}</h3>
                <p className="text-muted text-sm mt-1.5 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/mint" className="inline-block px-8 py-4 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition">
              Register your name
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted text-sm">
            <HexLogo size={20} />
            <span>ErgoNames — naming on the Ergo blockchain</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <a href="/whitepaper.pdf" target="_blank" rel="noreferrer" className="text-muted hover:text-ink transition">Whitepaper</a>
            <a href="https://github.com/ergonames" target="_blank" rel="noreferrer" className="text-muted hover:text-ink transition">GitHub</a>
            <Link href="/stats" className="text-muted hover:text-ink transition">Stats</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
