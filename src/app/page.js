"use client";
import { useState, useEffect } from "react";
import { getStats, getQuote } from "./lib/ergonames";
import HexLogo from "./components/HexLogo";
import NftCard from "./components/NftCard";
import ThemeToggle from "./components/ThemeToggle";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Landing page — synthesis of an 8-variant, 5-persona review tournament.
// Winning elements: v1 search-first hero, v6 terminal resolver demo, v7
// plain-language safety + FAQ, v3 verify-yourself table + honest live stats,
// v4 card gallery (+v8 provenance trio), v5 SDK block. Hard rules from the
// review: no manufactured FOMO, every number live, price visible, beta
// disclosure framed with the launch hook.

const SAFETY = [
  { t: "Refundable at every step", d: "If a registration can't finish, you reclaim your funds with your signature alone. Worst case: you got your money back." },
  { t: "You keep custody", d: "Your name is an NFT in your wallet. We never hold your keys, your funds, or your name." },
  { t: "Nobody can snipe your name", d: "Registration commits to your name in secret before revealing it, so front-runners see nothing worth stealing." },
  { t: "Nothing hidden", d: "Contracts, bot, indexer, SDK — every line is public. Read it before you trust it." },
];

const FAQ = [
  { q: "Do I need to renew my name?", a: "No. Never. One payment, lifetime ownership — there is no rent and no expiry. (ENS charges you yearly; here the word “renewal” doesn't exist.)" },
  { q: "What do I need to register?", a: "A Nautilus wallet with a little ERG. That's it — search, sign two transactions, and the automated registrar does the rest on-chain." },
  { q: "What if something fails mid-registration?", a: "Every step is refundable by you alone, enforced by the contracts. A failed mint means recovered funds, not lost ones." },
  { q: "What does it cost?", a: "Stable USD pricing by length, paid in ERG at the live oracle rate — long names cost cents, short names are premium. The exact live price shows before you sign anything." },
];

const GALLERY = [
  { name: "alice", bg: "midnight", accent: "ember", hex: "silver" },
  { name: "kushti", bg: "black", accent: "orange", hex: "none" },
  { name: "mint_dao", bg: "forest", accent: "mint", hex: "mint" },
  { name: "satoshi", bg: "navy", accent: "gold", hex: "gold" },
  { name: "violetta", bg: "violet", accent: "violet", hex: "none" },
];

function Term({ children, dim }) {
  return <div className={`whitespace-pre font-mono text-[13px] sm:text-sm leading-7 ${dim ? "text-white/40" : "text-white/85"}`}>{children}</div>;
}

export default function Home() {
  const [q, setQ] = useState("");
  const [stats, setStats] = useState(null);
  const [fromPrice, setFromPrice] = useState(null);
  // Domain split: www.ergonames.io serves this landing; app.ergonames.io is
  // the app, so its root forwards straight to /mint. Wallet-facing links
  // cross to the app subdomain. Local dev keeps relative links.
  const [appBase, setAppBase] = useState("");
  const router = useRouter();

  useEffect(() => {
    const h = window.location.hostname;
    if (h === "app.ergonames.io") { router.replace("/mint"); return; }
    if (h.endsWith("ergonames.io") || h.endsWith("ergonames.com")) {
      setAppBase("https://app.ergonames.io");
    }
    getStats().then(setStats).catch(() => {});
    // Live "from" price: a quote for a long (cheapest-tier) name. Never
    // hardcoded — the skeptic persona was explicit about fake numbers.
    getQuote("ergonauts").then((qt) => { if (qt?.priceCents != null) setFromPrice(qt.priceCents / 100); }).catch(() => {});
  }, [router]);

  const appUrl = (p) => `${appBase}${p}`;
  const go = () => {
    const c = q.trim().replace(/^~/, "").toLowerCase();
    const path = c ? `/mint?name=${encodeURIComponent(c)}` : "/mint";
    if (appBase) window.location.href = appUrl(path);
    else router.push(path);
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
            <a href={appUrl("/records")} className="text-sm text-white/70 hover:text-white transition hidden sm:block">My Names</a>
            <Link href="/stats" className="text-sm text-white/70 hover:text-white transition hidden sm:block">Stats</Link>
            <a href="https://github.com/ergonames" target="_blank" rel="noreferrer" className="text-sm text-white/70 hover:text-white transition hidden sm:block">GitHub</a>
            <ThemeToggle />
            <a href={appUrl("/mint")} className="px-5 py-2 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition">Get your name</a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — v1: one job, search a name. */}
        <section className="bg-[#0B0D16] text-white">
          <div className="max-w-3xl mx-auto px-6 sm:px-8 pt-20 sm:pt-28 pb-16 text-center">
            <h1 className="text-4xl sm:text-6xl font-light tracking-tight animate-fade-up">
              One payment. <span className="font-bold text-ergo-400">~yourname</span> forever.
            </h1>
            <p className="mt-5 text-white/60 leading-relaxed max-w-xl mx-auto animate-fade-up" style={{ animationDelay: "60ms" }}>
              A human-readable name for your Ergo wallet — an NFT you own for life.
              No renewals, no expiry, no middlemen able to take it back.
            </p>
            <div className="mt-9 flex items-stretch rounded-full bg-white/5 border border-white/15 overflow-hidden focus-within:border-ergo-500/60 transition animate-fade-up" style={{ animationDelay: "120ms" }}>
              <span className="pl-6 self-center text-ergo-500 text-2xl font-bold font-mono">~</span>
              <input
                className="flex-1 px-3 py-5 bg-transparent text-xl font-mono text-white placeholder:text-white/35 focus:outline-none min-w-0"
                placeholder="find your name"
                value={q}
                onChange={(e) => setQ(e.target.value.toLowerCase())}
                onKeyDown={(e) => e.key === "Enter" && go()}
                aria-label="Search for a name"
              />
              <button onClick={go} className="px-8 bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition">Search</button>
            </div>
            {/* Live stats bar — v3: real numbers with the honest asterisk. */}
            <p className="mt-7 text-white/45 text-sm font-mono animate-fade-in">
              {stats ? <><span className="text-ergo-400 font-semibold">{stats.totalNames}</span> names on mainnet*</> : "live on Ergo mainnet*"}
              {stats?.last7Days > 0 && <> · <span className="text-ergo-400 font-semibold">{stats.last7Days}</span> this week</>}
              {fromPrice != null && <> · from <span className="text-ergo-400 font-semibold">${fromPrice < 1 ? fromPrice.toFixed(2) : fromPrice}</span></>}
              {" "}· renewal fees: <span className="text-mint font-semibold">0&nbsp;ERG</span>
            </p>
            <p className="mt-2 text-white/30 text-xs">*public beta — 8+ character names for now; beta names may be purged before launch. Short names drop at launch.</p>
          </div>
        </section>

        {/* Terminal demo — v6: show the product in three commands. */}
        <section className="bg-[#0B0D16] pb-20">
          <div className="max-w-2xl mx-auto px-6 sm:px-8">
            <div className="rounded-2xl bg-black border border-white/10 shadow-soft p-6 sm:p-8">
              <div className="flex gap-1.5 mb-4"><span className="h-3 w-3 rounded-full bg-white/15" /><span className="h-3 w-3 rounded-full bg-white/15" /><span className="h-3 w-3 rounded-full bg-white/15" /></div>
              <Term><span className="text-ergo-400">$</span> resolve ~alice</Term>
              <Term dim>9h2quS8eoZF9pEm6LN52Jgq9tvZ6C7TdjJXnGm2Keqc6L1ZDKs4</Term>
              <Term><span className="text-ergo-400">$</span> send 50 ERG ~alice</Term>
              <Term dim><span className="text-mint">✓</span> confirmed — no address copied, none mistyped</Term>
              <Term><span className="text-ergo-400">$</span> reverse 9h2quS8e…ZDKs4</Term>
              <Term dim>~alice</Term>
            </div>
          </div>
        </section>

        {/* Safety — v7: plain-language guarantees. */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-20">
          <h2 className="text-ink text-2xl sm:text-3xl font-semibold text-center">Built so you can&apos;t get hurt</h2>
          <p className="text-muted text-center mt-2">Not promises — properties of the contracts. They hold by construction, not by policy.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
            {SAFETY.map((f) => (
              <div key={f.t} className="bg-surface border border-line rounded-3xl shadow-soft p-6">
                <h3 className="text-ink font-semibold">{f.t}</h3>
                <p className="text-muted text-sm mt-2 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Gallery — v4 cards + v8 provenance trio. */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-16 sm:pb-20">
          <h2 className="text-ink text-2xl sm:text-3xl font-semibold text-center">The name is the artwork</h2>
          <p className="text-muted text-center mt-2 max-w-xl mx-auto">Card, tilde, and frame are chosen at mint and stored inside the token — no servers, no links that rot. No two cards alike.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-5">
            {GALLERY.map((g, i) => (
              <div key={g.name} className="w-36 sm:w-44 rounded-2xl overflow-hidden border border-line shadow-soft hover:-translate-y-1.5 transition-transform" style={{ transform: `rotate(${(i - 2) * 1.6}deg)` }}>
                <NftCard name={g.name} bg={g.bg} accent={g.accent} hex={g.hex} className="w-full h-auto" />
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-body font-mono">
            <span>on-chain forever</span><span className="text-line">·</span>
            <span>one owner at a time</span><span className="text-line">·</span>
            <span>2.5% royalty travels with it</span>
          </div>
        </section>

        {/* Verify — v3: every claim with a place to check it. */}
        <section className="bg-[#0B0D16] text-white py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-6 sm:px-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-center">Don&apos;t trust it — query it</h2>
            <p className="text-white/50 text-center mt-2">Every claim on this page is checkable. Beta software: read the code before relying on it.</p>
            <div className="mt-8 rounded-2xl border border-white/10 overflow-hidden font-mono text-sm">
              {[
                ["Registry state", "live on the Ergo explorer", "https://explorer.ergoplatform.com"],
                ["Contract code", "github.com/ergonames", "https://github.com/ergonames"],
                ["Resolution SDK", "@ergonames/sdk — zero dependencies, MIT", "https://github.com/ergonames/ergonames-services/tree/master/sdk"],
                ["Live registrations", "ergonames.io/stats", "/stats"],
              ].map(([k, v, href]) => (
                <a key={k} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                  className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10 last:border-0 hover:bg-white/5 transition">
                  <span className="text-white/85">{k}</span>
                  <span className="text-ergo-400 text-right truncate">{v} ↗</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Builders — v5: the SDK block. */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-ink text-2xl sm:text-3xl font-semibold">Building on Ergo?</h2>
            <p className="text-muted mt-3 leading-relaxed">Resolve names in your wallet or dApp with two calls. No API keys, no rate limits, no ErgoNames servers in your critical path — resolution reads the chain.</p>
            <div className="mt-5 flex gap-3">
              <a href="https://github.com/ergonames/ergonames-services/tree/master/sdk" target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition">SDK docs</a>
              <a href="https://github.com/ergonames" target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-full border border-line text-body hover:text-ink text-sm transition">GitHub</a>
            </div>
          </div>
          <div className="rounded-2xl bg-[#0B0D16] border border-line p-6 font-mono text-[13px] leading-7 overflow-x-auto">
            <div className="text-white/35">// npm install @ergonames/sdk</div>
            <div><span className="text-violet-400">import</span> <span className="text-white/85">{"{ resolveAddress, primaryName }"}</span> <span className="text-violet-400">from</span> <span className="text-mint">&quot;@ergonames/sdk&quot;</span>;</div>
            <div className="mt-2"><span className="text-white/85">await</span> <span className="text-ergo-400">resolveAddress</span><span className="text-white/85">(<span className="text-mint">&quot;~alice&quot;</span>)</span> <span className="text-white/35">// 9h2quS8e…</span></div>
            <div><span className="text-white/85">await</span> <span className="text-ergo-400">primaryName</span><span className="text-white/85">(addr)</span> <span className="text-white/35">// &quot;alice&quot;</span></div>
          </div>
        </section>

        {/* FAQ — v7. */}
        <section className="max-w-3xl mx-auto px-6 sm:px-8 pb-20">
          <h2 className="text-ink text-2xl sm:text-3xl font-semibold text-center">Questions, answered straight</h2>
          <div className="mt-8 flex flex-col gap-4">
            {FAQ.map((f) => (
              <div key={f.q} className="bg-surface border border-line rounded-2xl p-5">
                <h3 className="text-ink font-semibold">{f.q}</h3>
                <p className="text-muted text-sm mt-1.5 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a href={appUrl("/mint")} className="inline-block px-10 py-4 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition">Search your name →</a>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted text-sm"><HexLogo size={22} /> ErgoNames — lifetime names on Ergo</div>
          <div className="flex gap-6 text-sm text-muted">
            <a href="https://github.com/ergonames" target="_blank" rel="noreferrer" className="hover:text-ink transition">GitHub</a>
            <Link href="/stats" className="hover:text-ink transition">Stats</Link>
            <a href="/whitepaper.pdf" className="hover:text-ink transition">Whitepaper</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
