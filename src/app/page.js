"use client";
import { useState, useEffect, useRef } from "react";
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
// disclosure framed with the launch hook. Visual layer: motion vocabulary in
// globals.css ("landing jazz"), copy unchanged from the reviewed synthesis.

const SAFETY = [
  { t: "Refundable at every step", d: "If a registration can't finish, you reclaim your funds with your signature alone. Worst case: you got your money back.", icon: "M12 3l7 3v5c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6l7-3zm-2.8 9.2l2 2 3.8-4" },
  { t: "You keep custody", d: "Your name is an NFT in your wallet. We never hold your keys, your funds, or your name.", icon: "M14 7a4 4 0 11-1.2 7.8L9 18.5H6.5V21H3v-3.5l7.2-7.2A4 4 0 0114 7zm1.5 2.5h.01" },
  { t: "Nobody can snipe your name", d: "Registration commits to your name in secret before revealing it, so front-runners see nothing worth stealing.", icon: "M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6zm9 2.5a2.5 2.5 0 100-5M4 4l16 16" },
  { t: "Nothing hidden", d: "Contracts, bot, indexer, SDK — every line is public. Read it before you trust it.", icon: "M8 6l-5 6 5 6m8-12l5 6-5 6m-3-14l-2 16" },
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

// Scroll-reveal wrapper: fades/slides children in the first time they enter
// the viewport. Uses a rAF-throttled scroll check rather than an
// IntersectionObserver: instant jumps (anchor links, scroll restoration,
// programmatic scrolls) can hop OVER an element between frames, which an
// observer never sees — leaving it invisible forever. "Entered or already
// passed" counts as revealed; the listener detaches once shown.
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    let ticking = false;
    const check = () => {
      ticking = false;
      if (done) return;
      const r = el.getBoundingClientRect();
      // Some embedded/headless contexts report innerHeight 0 — fall back to
      // the root element's client height, and if the viewport is genuinely
      // unmeasurable, reveal rather than hide.
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      if (vh === 0 || r.top < vh * 0.92 || r.bottom < 0) {
        el.classList.add("in-view");
        done = true;
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(check); }
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

// Count-up for the live stats number — settles on the real value.
function CountUp({ value }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (value == null) return;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / 900, 1);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{shown}</>;
}

function Term({ children, dim, delay, type, ch }) {
  if (type) {
    return (
      <div className="font-mono text-[13px] sm:text-sm leading-7 text-white/85">
        <span className="type-line" style={{ "--ch": ch, animationDelay: `${delay}ms` }}>{children}</span>
      </div>
    );
  }
  return (
    <div className={`term-fade whitespace-pre font-mono text-[13px] sm:text-sm leading-7 ${dim ? "text-white/40" : "text-white/85"}`}
      style={{ animationDelay: `${delay}ms` }}>{children}</div>
  );
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
      <header className="sticky top-0 z-50 bg-[#0B0D16]/85 backdrop-blur-md border-b border-white/5 text-white">
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
            <a href={appUrl("/mint")} className="shine-sweep whitespace-nowrap px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-ergo-500 to-ergo-400 hover:to-ergo-500 text-white font-semibold text-xs sm:text-sm transition hover:scale-[1.04]">Get your name</a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — v1: one job, search a name. */}
        <section className="relative bg-[#0B0D16] text-white overflow-hidden">
          {/* aurora glow + ghost tilde backdrop */}
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[34rem] w-[34rem] rounded-full bg-ergo-500/20 blur-[120px]" style={{ animation: "aurora 14s ease-in-out infinite" }} />
            <div className="absolute top-20 right-[-10%] h-72 w-72 rounded-full bg-[#F5C542]/10 blur-[100px]" style={{ animation: "aurora 18s ease-in-out infinite reverse" }} />
            <div className="absolute inset-x-0 top-6 text-center font-mono font-bold text-[26rem] leading-none text-white/[0.025] select-none">~</div>
          </div>
          <div className="relative max-w-3xl mx-auto px-6 sm:px-8 pt-20 sm:pt-28 pb-16 text-center">
            <h1 className="text-4xl sm:text-6xl font-light tracking-tight animate-fade-up">
              One payment. <span className="font-bold gradient-name">~yourname</span> forever.
            </h1>
            <p className="mt-5 text-white/60 leading-relaxed max-w-xl mx-auto animate-fade-up" style={{ animationDelay: "60ms" }}>
              A human-readable name for your Ergo wallet — an NFT you own for life.
              No renewals, no expiry, no middlemen able to take it back.
            </p>
            <div className="mt-9 flex items-stretch rounded-full bg-white/5 border border-white/15 overflow-hidden transition animate-fade-up focus-within:border-ergo-500/70 focus-within:shadow-[0_0_45px_-5px_rgba(255,86,56,0.45)]" style={{ animationDelay: "120ms" }}>
              <span className="pl-6 self-center text-ergo-500 text-2xl font-bold font-mono">~</span>
              <input
                className="flex-1 px-3 py-5 bg-transparent text-xl font-mono text-white placeholder:text-white/35 focus:outline-none min-w-0"
                placeholder="find your name"
                value={q}
                onChange={(e) => setQ(e.target.value.toLowerCase())}
                onKeyDown={(e) => e.key === "Enter" && go()}
                aria-label="Search for a name"
              />
              <button onClick={go} className="shine-sweep px-8 bg-gradient-to-r from-ergo-500 to-ergo-400 hover:to-ergo-500 text-white font-semibold transition">Search</button>
            </div>
            {/* Live stats bar — v3: real numbers with the honest asterisk. */}
            <p className="mt-7 text-white/45 text-sm font-mono animate-fade-in">
              {stats ? <><span className="text-ergo-400 font-semibold"><CountUp value={stats.totalNames} /></span> names on mainnet*</> : "live on Ergo mainnet*"}
              {stats?.last7Days > 0 && <> · <span className="text-ergo-400 font-semibold">{stats.last7Days}</span> this week</>}
              {fromPrice != null && <> · from <span className="text-ergo-400 font-semibold">${fromPrice < 1 ? fromPrice.toFixed(2) : fromPrice}</span></>}
              {" "}· renewal fees: <span className="text-mint font-semibold">0&nbsp;ERG</span>
            </p>
            <p className="mt-2 text-white/30 text-xs">*public beta — 8+ character names for now; beta names may be purged before launch. Short names drop at launch.</p>
          </div>
        </section>

        {/* Terminal demo — v6: show the product in three commands (typed live). */}
        <section className="relative bg-[#0B0D16] pb-20">
          <div className="max-w-2xl mx-auto px-6 sm:px-8">
            <Reveal>
              <div className="rounded-2xl bg-black border border-white/10 shadow-[0_25px_80px_-25px_rgba(255,86,56,0.25)] p-6 sm:p-8 overflow-x-auto">
                <div className="flex gap-1.5 mb-4"><span className="h-3 w-3 rounded-full bg-[#FF5638]/70" /><span className="h-3 w-3 rounded-full bg-[#F5C542]/60" /><span className="h-3 w-3 rounded-full bg-[#2BD9A9]/60" /></div>
                <Term type ch={16} delay={200}><span className="text-ergo-400">$</span> resolve ~alice</Term>
                <Term dim delay={1200}>9h2quS8eoZF9pEm6LN52Jgq9tvZ6C7TdjJXnGm2Keqc6L1ZDKs4</Term>
                <Term type ch={20} delay={1700}><span className="text-ergo-400">$</span> send 50 ERG ~alice</Term>
                <Term dim delay={2800}><span className="text-mint">✓</span> confirmed — no address copied, none mistyped</Term>
                <Term type ch={26} delay={3300}><span className="text-ergo-400">$</span> reverse 9h2quS8e…ZDKs4</Term>
                <Term dim delay={4400}>~alice<span className="caret ml-1">&nbsp;</span></Term>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Safety — v7: plain-language guarantees. */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-20">
          <Reveal>
            <h2 className="text-ink text-2xl sm:text-3xl font-semibold text-center">Built so you can&apos;t get hurt</h2>
            <p className="text-muted text-center mt-2">Not promises — properties of the contracts. They hold by construction, not by policy.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
            {SAFETY.map((f, i) => (
              <Reveal key={f.t} delay={i * 90}>
                <div className="group h-full bg-surface border border-line rounded-3xl shadow-soft p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-ergo-500/50 hover:shadow-[0_18px_50px_-18px_rgba(255,86,56,0.4)]">
                  <svg viewBox="0 0 24 24" className="h-8 w-8 mb-3 text-ergo-500 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                  <h3 className="text-ink font-semibold">{f.t}</h3>
                  <p className="text-muted text-sm mt-2 leading-relaxed">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Gallery — v4 cards + v8 provenance trio. */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-16 sm:pb-20">
          <Reveal>
            <h2 className="text-ink text-2xl sm:text-3xl font-semibold text-center">The name is the artwork</h2>
            <p className="text-muted text-center mt-2 max-w-xl mx-auto">Card, tilde, and frame are chosen at mint and stored inside the token — no servers, no links that rot. No two cards alike.</p>
          </Reveal>
          <div className="mt-9 flex flex-wrap justify-center gap-5">
            {GALLERY.map((g, i) => (
              <Reveal key={g.name} delay={i * 80}>
                <div
                  className="w-36 sm:w-44 rounded-2xl overflow-hidden border border-line shadow-soft transition-all duration-300 hover:scale-110 hover:!rotate-0 hover:z-10 hover:shadow-[0_25px_70px_-20px_rgba(255,86,56,0.55)]"
                  style={{ "--rot": `${(i - 2) * 1.8}deg`, transform: `rotate(${(i - 2) * 1.8}deg)`, animation: `floaty-slow ${5 + i * 0.7}s ease-in-out ${i * 0.4}s infinite` }}>
                  <NftCard name={g.name} bg={g.bg} accent={g.accent} hex={g.hex} className="w-full h-auto" />
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={150}>
            <div className="mt-9 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-body font-mono">
              <span>on-chain forever</span><span className="text-ergo-500">·</span>
              <span>one owner at a time</span><span className="text-ergo-500">·</span>
              <span>2.5% royalty travels with it</span>
            </div>
          </Reveal>
        </section>

        {/* Verify — v3: every claim with a place to check it. */}
        <section className="relative bg-[#0B0D16] text-white py-16 sm:py-20 overflow-hidden">
          <div aria-hidden className="absolute -bottom-32 left-[-10%] h-80 w-80 rounded-full bg-ergo-500/10 blur-[110px]" style={{ animation: "glow-breathe 9s ease-in-out infinite" }} />
          <div className="relative max-w-3xl mx-auto px-6 sm:px-8">
            <Reveal>
              <h2 className="text-2xl sm:text-3xl font-semibold text-center">Don&apos;t trust it — query it</h2>
              <p className="text-white/50 text-center mt-2">Every claim on this page is checkable. Beta software: read the code before relying on it.</p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8 rounded-2xl border border-white/10 overflow-hidden font-mono text-sm">
                {[
                  ["Registry state", "live on the Ergo explorer", "https://explorer.ergoplatform.com"],
                  ["Contract code", "github.com/ergonames", "https://github.com/ergonames"],
                  ["Resolution SDK", "@ergonames/sdk — zero dependencies, MIT", "https://github.com/ergonames/ergonames-services/tree/master/sdk"],
                  ["Live registrations", "ergonames.io/stats", "/stats"],
                ].map(([k, v, href]) => (
                  <a key={k} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                    className="group flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10 last:border-0 border-l-2 border-l-transparent hover:border-l-ergo-500 hover:bg-white/5 transition-all">
                    <span className="text-white/85">{k}</span>
                    <span className="text-ergo-400 text-right truncate transition-transform duration-200 group-hover:-translate-x-1">{v} ↗</span>
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Builders — v5: the SDK block. */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <h2 className="text-ink text-2xl sm:text-3xl font-semibold">Building on Ergo?</h2>
            <p className="text-muted mt-3 leading-relaxed">Resolve names in your wallet or dApp with two calls. No API keys, no rate limits, no ErgoNames servers in your critical path — resolution reads the chain.</p>
            <div className="mt-5 flex gap-3">
              <a href="https://github.com/ergonames/ergonames-services/tree/master/sdk" target="_blank" rel="noreferrer" className="shine-sweep px-5 py-2.5 rounded-full bg-gradient-to-r from-ergo-500 to-ergo-400 hover:to-ergo-500 text-white font-semibold text-sm transition hover:scale-[1.04]">SDK docs</a>
              <a href="https://github.com/ergonames" target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-full border border-line text-body hover:text-ink hover:border-ergo-500/50 text-sm transition">GitHub</a>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="rounded-2xl bg-[#0B0D16] border border-ergo-500/25 shadow-[0_20px_70px_-25px_rgba(255,86,56,0.35)] p-6 font-mono text-[13px] leading-7 overflow-x-auto">
              <div className="text-white/35">// npm install @ergonames/sdk</div>
              <div><span className="text-violet-400">import</span> <span className="text-white/85">{"{ resolveAddress, primaryName }"}</span> <span className="text-violet-400">from</span> <span className="text-mint">&quot;@ergonames/sdk&quot;</span>;</div>
              <div className="mt-2"><span className="text-white/85">await</span> <span className="text-ergo-400">resolveAddress</span><span className="text-white/85">(<span className="text-mint">&quot;~alice&quot;</span>)</span> <span className="text-white/35">// 9h2quS8e…</span></div>
              <div><span className="text-white/85">await</span> <span className="text-ergo-400">primaryName</span><span className="text-white/85">(addr)</span> <span className="text-white/35">// &quot;alice&quot;</span><span className="caret ml-1">&nbsp;</span></div>
            </div>
          </Reveal>
        </section>

        {/* FAQ — v7. */}
        <section className="max-w-3xl mx-auto px-6 sm:px-8 pb-20">
          <Reveal>
            <h2 className="text-ink text-2xl sm:text-3xl font-semibold text-center">Questions, answered straight</h2>
          </Reveal>
          <div className="mt-8 flex flex-col gap-4">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <div className="bg-surface border border-line rounded-2xl p-5 transition-all duration-300 hover:border-ergo-500/40 hover:shadow-soft">
                  <h3 className="text-ink font-semibold"><span className="text-ergo-500 font-mono mr-2">~</span>{f.q}</h3>
                  <p className="text-muted text-sm mt-1.5 leading-relaxed">{f.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={100}>
            <div className="mt-10 text-center">
              <a href={appUrl("/mint")} className="shine-sweep inline-block px-10 py-4 rounded-2xl bg-gradient-to-r from-ergo-500 to-ergo-400 hover:to-ergo-500 text-white font-semibold transition hover:scale-[1.04] shadow-[0_15px_50px_-12px_rgba(255,86,56,0.5)]">Search your name →</a>
            </div>
          </Reveal>
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
