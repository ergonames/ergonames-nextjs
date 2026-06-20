"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getStats, getQuote, resolveName } from "./lib/ergonames";
import HexLogo from "./components/HexLogo";
import NftCard from "./components/NftCard";
import LivingTilde from "./components/landing/LivingTilde";
import SmoothScroll from "./components/landing/SmoothScroll";
import Link from "next/link";
import { useRouter } from "next/navigation";

// THE LIVING TILDE — the redesign. The ErgoNames logo is a sine wave, so the
// whole page is built around ONE living orange sine-tilde you write your name
// onto and that the real resolver answers through (phase-locks green when a name
// is free). Swiss editorial restraint: oceans of black, two Poppins weights,
// machine-truth in mono, every animated pixel either your input or a live number.
// Content is the reviewed tournament synthesis, re-choreographed — nothing faked.

const SAFETY = [
  { n: "01", t: "Refundable at every step", d: "If a registration can't finish, you reclaim your funds with your signature alone. Worst case: you got your money back.", mint: true },
  { n: "02", t: "You keep custody", d: "Your name is an NFT in your wallet. We never hold your keys, your funds, or your name." },
  { n: "03", t: "Nobody can snipe your name", d: "Registration commits to your name in secret before revealing it, so front-runners see nothing worth stealing." },
  { n: "04", t: "Nothing hidden", d: "Contracts, bot, indexer, SDK — every line is public. Read it before you trust it." },
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

const VERIFY = [
  ["Registry state", "live on the Ergo explorer", "https://explorer.ergoplatform.com"],
  ["Contract code", "github.com/ergonames", "https://github.com/ergonames"],
  ["Resolution SDK", "ergonames — zero dependencies, MIT", "https://github.com/ergonames/ergonames-services/tree/master/sdk"],
  ["Live registrations", "ergonames.io/stats", "/stats"],
];

const PLACEHOLDERS = ["yourname", "satoshi", "alice", "kushti", "ergonauts"];

// Count-up for live stat numbers — settles on the real value, then stops.
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
  return <>{shown.toLocaleString()}</>;
}

// The hero name field: the "~" prefix + a content-sized input. When empty and
// unfocused it runs a typewriter through example names (type → hold → delete →
// next) with a blinking caret. Isolated so its per-character re-renders don't
// churn the rest of the page. `value`/onChange/onSubmit are lifted to Home so
// the wave + availability + the footer search can share the same query.
function NameField({ value, onChange, onSubmit, words }) {
  const [typed, setTyped] = useState("");
  const [focused, setFocused] = useState(false);
  const [w, setW] = useState(120);
  const sizerRef = useRef(null);
  const showType = value === "" && !focused;

  // Typewriter — only while the field is empty + unfocused.
  useEffect(() => {
    if (showType === false) { setTyped(""); return; }
    let wi = 0, ci = 0, deleting = false, timer;
    const tick = () => {
      const word = words[wi];
      if (!deleting) {
        ci++; setTyped(word.slice(0, ci));
        if (ci === word.length) { deleting = true; timer = setTimeout(tick, 1600); return; }
        timer = setTimeout(tick, 92);
      } else {
        ci--; setTyped(word.slice(0, ci));
        if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; timer = setTimeout(tick, 380); return; }
        timer = setTimeout(tick, 44);
      }
    };
    timer = setTimeout(tick, 450);
    return () => clearTimeout(timer);
  }, [showType, words]);

  // Width tracks the visible text so "~name" stays one tight, centered unit.
  useEffect(() => {
    const measure = () => {
      const el = sizerRef.current;
      if (!el) return;
      const vw = (typeof window !== "undefined" && window.innerWidth) || 600;
      setW(Math.min(Math.max(el.offsetWidth + 10, 44), Math.round(vw * 0.78)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, typed]);

  const shown = value || typed;
  return (
    <div className="flex items-baseline justify-center gap-1.5 max-w-full px-4">
      <span className="h-hero font-bold text-ergo-500 leading-none select-none shrink-0">~</span>
      <span className="relative shrink-0 transition-[width] duration-150 ease-out" style={{ width: w }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Search for a name"
          spellCheck={false}
          autoComplete="off"
          className="block w-full h-hero font-bold bg-transparent text-white text-left outline-none caret-ergo-500"
        />
        {showType && (
          <span aria-hidden className="absolute inset-y-0 left-0 flex items-center pointer-events-none h-hero font-bold text-white/30 whitespace-pre">
            {typed}<span className="tw-caret" />
          </span>
        )}
        <span ref={sizerRef} aria-hidden className="h-hero font-bold absolute opacity-0 pointer-events-none whitespace-pre -z-10 left-0 top-0">{shown || " "}</span>
      </span>
    </div>
  );
}

export default function Home() {
  const [q, setQ] = useState("");
  const [avail, setAvail] = useState(null); // {state:'checking'|'available'|'taken'|'reserved'|'invalid', name}
  const [stats, setStats] = useState(null);
  const [fromPrice, setFromPrice] = useState(null);
  const [appBase, setAppBase] = useState("");
  const router = useRouter();
  const waveCtl = useRef({ kind: "none", pulse() {}, setAvailability() {}, setScroll() {} });
  const heroRef = useRef(null);

  // Domain split: www serves this landing; app.ergonames.io is the app.
  useEffect(() => {
    const h = window.location.hostname;
    if (h === "app.ergonames.io") { router.replace("/mint"); return; }
    if (h.endsWith("ergonames.io") || h.endsWith("ergonames.com")) setAppBase("https://app.ergonames.io");
    getQuote("ergonauts").then((qt) => { if (qt?.priceCents != null) setFromPrice(qt.priceCents / 100); }).catch(() => {});
  }, [router]);

  // Live registration heartbeat — real mainnet registrations pulse green down
  // the wave. New registrations are detected as totalNames deltas across 30s
  // polls; between polls, synthetic pulses are paced to the live daily rate.
  // Green ALWAYS means a real on-chain registration — never decoration.
  useEffect(() => {
    let lastTotal = null, stopped = false, synthTimer = null;
    const beat = () => waveCtl.current.heartbeat?.();
    const scheduleSynthetic = (perDay) => {
      clearTimeout(synthTimer);
      if (stopped || !perDay || perDay <= 0) return; // genuinely idle → stay quiet
      const interval = Math.min(Math.max(86400000 / perDay, 28000), 140000);
      synthTimer = setTimeout(() => { beat(); scheduleSynthetic(perDay); }, interval);
    };
    const poll = async () => {
      const s = await getStats().catch(() => null);
      if (stopped || !s) return;
      setStats(s);
      if (lastTotal != null && s.totalNames > lastTotal) {
        const delta = Math.min(s.totalNames - lastTotal, 6);
        for (let i = 0; i < delta; i++) setTimeout(beat, i * 650);
      }
      lastTotal = s.totalNames;
      scheduleSynthetic(s.last24Hours);
    };
    poll();
    const pollTimer = setInterval(poll, 30000);
    return () => { stopped = true; clearInterval(pollTimer); clearTimeout(synthTimer); };
  }, []);


  // Availability phase-lock — the wave reads the REAL resolver (debounced). The
  // search itself never waits on this; the shader only consumes the boolean.
  useEffect(() => {
    const name = q.trim().replace(/^~/, "");
    if (!name) { setAvail(null); waveCtl.current.setAvailability("idle"); return; }
    setAvail({ state: "checking", name });
    const id = setTimeout(async () => {
      try {
        const r = await resolveName(name);
        if (!r.isValid) { setAvail({ state: "invalid", name }); waveCtl.current.setAvailability("idle"); }
        else if (r.isAvailable) { setAvail({ state: "available", name }); waveCtl.current.setAvailability("available"); }
        else if (r.isReserved) { setAvail({ state: "reserved", name }); waveCtl.current.setAvailability("taken"); }
        else { setAvail({ state: "taken", name }); waveCtl.current.setAvailability("taken"); }
      } catch { setAvail(null); waveCtl.current.setAvailability("idle"); }
    }, 380);
    return () => clearTimeout(id);
  }, [q]);

  // Smooth-scroll reveals (GSAP) + hero-exit flatten driving the wave.
  useEffect(() => {
    let cleanup = () => {};
    let killed = false;
    (async () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const reveals = Array.from(document.querySelectorAll(".reveal"));
      if (reduce) { reveals.forEach((e) => e.classList.add("in-view")); return; }
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);
      const triggers = reveals.map((el) =>
        ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => el.classList.add("in-view") })
      );
      let flatten;
      if (heroRef.current) {
        flatten = ScrollTrigger.create({
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
          onUpdate: (self) => waveCtl.current.setScroll(self.progress),
        });
      }
      cleanup = () => { triggers.forEach((t) => t.kill()); flatten?.kill(); };
    })();
    return () => { killed = true; cleanup(); };
  }, []);

  const appUrl = (p) => `${appBase}${p}`;
  const go = useCallback((override) => {
    const c = (override ?? q).trim().replace(/^~/, "").toLowerCase();
    const path = c ? `/mint?name=${encodeURIComponent(c)}` : "/mint";
    if (appBase) window.location.href = appUrl(path);
    else router.push(path);
  }, [q, appBase, router]); // eslint-disable-line

  const onType = (val) => {
    const v = val.toLowerCase();
    setQ(v);
    // write-on-wave: each keystroke plucks the tilde at a marching position
    const xn = ((v.length % 11) / 11) * 1.6 - 0.8;
    waveCtl.current.pulse(xn, 1);
  };

  const availLine = (() => {
    if (!avail) return null;
    if (avail.state === "checking") return <span className="text-muted">checking the chain…</span>;
    if (avail.state === "available") return <span className="text-mint">~{avail.name} · available</span>;
    if (avail.state === "reserved") return <span className="text-muted">~{avail.name} · reserved</span>;
    if (avail.state === "invalid") return <span className="text-muted">~{avail.name} · try 8+ characters (beta)</span>;
    return <span className="text-muted">~{avail.name} · taken</span>;
  })();

  return (
    <div className="min-h-screen bg-[#090B12] text-[#f4f5f8] selection:bg-ergo-500/30">
      <SmoothScroll />

      {/* ---- header ---- */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#090B12]/70 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <HexLogo size={30} />
            <span className="text-[15px] tracking-[0.06em]"><b className="font-bold">ERGO</b><span className="font-light">NAMES</span></span>
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full border border-ergo-500/50 text-ergo-400 text-[9px] font-bold tracking-[0.18em]">BETA</span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-5">
            <a href={appUrl("/records")} className="text-[13px] text-white/55 hover:text-white transition hidden sm:block">My Names</a>
            <Link href="/stats" className="text-[13px] text-white/55 hover:text-white transition hidden sm:block">Stats</Link>
            <a href="https://github.com/ergonames" target="_blank" rel="noreferrer" className="text-[13px] text-white/55 hover:text-white transition hidden sm:block">GitHub</a>
            <a href={appUrl("/mint")} className="whitespace-nowrap px-4 py-2 rounded-full bg-ergo-500 hover:bg-ergo-400 text-white font-semibold text-[13px] transition">Get your name</a>
          </div>
        </div>
      </header>

      <main>
        {/* ====== 01 · HERO ====== */}
        <section ref={heroRef} className="relative min-h-[100svh] flex flex-col items-center justify-center px-5 sm:px-8 pt-24 pb-16 text-center overflow-hidden">
          <p className="eyebrow mb-7 text-white/40">Lifetime names on Ergo</p>

          <h1 className="h-hero font-light leading-[0.95] text-white/90">One payment.</h1>

          {/* the living tilde */}
          <div className="relative w-full max-w-[560px] h-[clamp(72px,13vw,140px)] my-1 sm:my-2">
            <LivingTilde controller={waveCtl} />
          </div>

          {/* name-as-input — typewriter placeholder, content-sized "~name" unit */}
          <NameField value={q} onChange={onType} onSubmit={() => go()} words={PLACEHOLDERS} />

          <h1 className="font-light leading-[0.95] text-white/85 mt-5 sm:mt-7 text-[clamp(2rem,6vw,4.4rem)]">forever.</h1>

          {/* availability readout (real resolver) */}
          <div className="h-6 mt-6 font-mono text-sm tracking-wide">{availLine}</div>

          {/* search action + live stat line */}
          <button onClick={() => go()} className="mt-3 px-7 py-3 rounded-full bg-ergo-500 hover:bg-ergo-400 text-white font-semibold text-sm transition active:scale-[0.98]">
            {avail?.state === "available" ? `Claim ~${avail.name} →` : "Search your name →"}
          </button>

          <p className="mt-8 text-white/40 text-[13px] font-mono tabular-nums flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {stats ? <span><span className="text-ergo-400 font-semibold"><CountUp value={stats.totalNames} /></span> names on mainnet</span> : <span>live on Ergo mainnet</span>}
            {stats?.last7Days > 0 && <><span className="text-white/20">/</span><span><span className="text-ergo-400 font-semibold">{stats.last7Days}</span> this week</span></>}
            {fromPrice != null && <><span className="text-white/20">/</span><span>from <span className="text-ergo-400 font-semibold">${fromPrice < 1 ? fromPrice.toFixed(2) : fromPrice}</span></span></>}
            <span className="text-white/20">/</span><span>renewals <span className="text-mint font-semibold">0 ERG</span></span>
          </p>
          <p className="mt-2 text-white/25 text-[11px]">Public beta · 8+ character names for now · short names drop at launch</p>
        </section>

        {/* ====== 02 · WHAT A NAME DOES ====== */}
        <section className="relative max-w-5xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="spine-rule mb-14" />
          <p className="eyebrow text-white/40 reveal">What a name does</p>
          <h2 className="reveal mt-6 h-sec font-light max-w-3xl">A nickname for your wallet — <span className="font-semibold">readable, shareable, yours.</span></h2>
          <p className="reveal mt-5 text-white/55 max-w-2xl leading-relaxed">
            Your wallet is a 51-character address like{" "}
            <span className="font-mono text-white/70 text-[0.92em]">9h2quS8e…ZDKs4</span>. A name maps to it — so people use{" "}
            <span className="font-mono text-ergo-400">~alice</span> instead, and wallets translate between the two automatically, in both directions.
          </p>

          <div className="mt-16 grid sm:grid-cols-3 gap-x-10 gap-y-12">
            {[
              { n: "01", label: "Look it up", desc: "A name resolves to the wallet address behind it.", from: "~alice", rel: "resolves to", to: "9h2quS8e…ZDKs4" },
              { n: "02", label: "Get paid", desc: "Share your name — funds arrive at your wallet, with no address to copy or mistype.", from: "send to ~alice", rel: "arrives at", to: "your wallet" },
              { n: "03", label: "Know who's who", desc: "Any address can be reversed to its name, so you see who you're dealing with.", from: "9h2quS8e…ZDKs4", rel: "is", to: "~alice" },
            ].map((r, i) => (
              <div key={r.n} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="font-mono text-xs text-ergo-500">{r.n}</div>
                <h3 className="mt-3 text-lg font-semibold text-white/90">{r.label}</h3>
                <p className="mt-1.5 text-white/45 text-sm leading-relaxed">{r.desc}</p>
                <div className="mt-5 font-mono text-sm leading-relaxed">
                  <div className="text-white/85 break-all">{r.from}</div>
                  <div className="my-1.5 flex items-center gap-2 text-white/35 text-xs"><span className="h-px w-5 bg-ergo-500/60" />{r.rel}</div>
                  <div className="text-ergo-400 break-all">{r.to}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ====== 03 · LIVE STATS ====== */}
        <section className="relative max-w-5xl mx-auto px-5 sm:px-8 py-20">
          <div className="spine-rule mb-14" />
          <p className="eyebrow text-white/40 reveal">Measured on mainnet, not marketed</p>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { v: stats ? <CountUp value={stats.totalNames} /> : "—", l: "names registered" },
              { v: stats ? <CountUp value={stats.last7Days} /> : "—", l: "in the last 7 days" },
              { v: fromPrice != null ? `$${fromPrice < 1 ? fromPrice.toFixed(2) : fromPrice}` : "—", l: "cheapest name, from" },
              { v: <span className="text-mint">0 ERG</span>, l: "renewal fees, ever" },
            ].map((s, i) => (
              <div key={i} className="reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                <div className="font-mono tabular-nums text-[clamp(2rem,6vw,3.4rem)] font-semibold text-ergo-400 leading-none">{s.v}</div>
                <div className="mt-3 text-white/45 text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ====== 04 · SAFETY ====== */}
        <section className="relative max-w-5xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="spine-rule mb-14" />
          <h2 className="reveal h-sec font-light max-w-2xl">Built so you <span className="font-semibold">can&apos;t get hurt.</span></h2>
          <p className="reveal mt-4 text-white/45 max-w-lg">Not promises — properties of the contracts. They hold by construction, not by policy.</p>
          <div className="mt-14 grid sm:grid-cols-2 gap-x-12 gap-y-12">
            {SAFETY.map((f, i) => (
              <div key={f.n} className="reveal border-t border-white/10 pt-6 group" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className={`font-mono text-sm ${f.mint ? "text-mint" : "text-ergo-500"}`}>{f.n}</div>
                <h3 className="mt-3 text-xl font-semibold text-white/90">{f.t}{f.mint && <span className="text-mint"> ✓</span>}</h3>
                <p className="mt-2 text-white/50 leading-relaxed max-w-md">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ====== 05 · NAME AS ARTWORK ====== */}
        <section className="relative max-w-5xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="spine-rule mb-14" />
          <h2 className="reveal h-sec font-light text-center">The name <span className="font-semibold">is the artwork.</span></h2>
          <p className="reveal mt-4 text-white/45 text-center max-w-xl mx-auto">Card, tilde, and frame are chosen at mint and stored inside the token — no servers, no links that rot. No two cards alike.</p>
          <div className="mt-14 flex flex-wrap justify-center gap-5">
            {GALLERY.map((g, i) => (
              <div key={g.name} className="reveal w-36 sm:w-44 rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 hover:scale-[1.07] hover:!rotate-0 hover:z-10 hover:border-ergo-500/40"
                style={{ transitionDelay: `${i * 70}ms`, "--rot": `${(i - 2) * 2}deg`, transform: `rotate(${(i - 2) * 2}deg)` }}>
                <NftCard name={g.name} bg={g.bg} accent={g.accent} hex={g.hex} className="w-full h-auto block" />
              </div>
            ))}
          </div>
          <p className="reveal mt-12 text-center text-sm text-white/40 font-mono flex flex-wrap justify-center gap-x-6 gap-y-1">
            <span>on-chain forever</span><span>one owner at a time</span><span>2.5% royalty travels with it</span>
          </p>
        </section>

        {/* ====== 06 · VERIFY ====== */}
        <section className="relative max-w-5xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="spine-rule mb-14" />
          <h2 className="reveal h-sec font-light">Don&apos;t trust it — <span className="font-semibold">query it.</span></h2>
          <p className="reveal mt-4 text-white/45 max-w-lg">Every claim on this page is checkable. Beta software: read the code before relying on it.</p>
          <div className="mt-12 border-t border-white/10">
            {VERIFY.map(([k, v, href], i) => (
              <a key={k} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                className="verify-row reveal group flex items-center justify-between gap-4 py-5 border-b border-white/10" style={{ transitionDelay: `${i * 60}ms` }}>
                <span className="flex items-center gap-3 text-lg text-white/85">
                  <span className="verify-tilde text-ergo-500 font-mono">~</span>{k}
                </span>
                <span className="text-ergo-400/80 text-sm text-right transition-transform duration-200 group-hover:-translate-x-1">{v} ↗</span>
              </a>
            ))}
          </div>
        </section>

        {/* ====== 07 · SDK ====== */}
        <section className="relative max-w-5xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="spine-rule mb-14" />
          <p className="eyebrow text-white/40 reveal">Building on Ergo</p>
          <h2 className="reveal mt-6 h-sec font-light max-w-2xl">Two calls. <span className="font-semibold">Reads the chain.</span> No server.</h2>
          <div className="reveal mt-12 font-mono text-[clamp(0.95rem,2.6vw,1.6rem)] leading-[1.8]">
            <div className="text-white/35 text-base">// npm install ergonames</div>
            <div className="mt-4"><span className="text-white/45">ergonames.</span><span className="text-ergo-400">resolveAddress</span><span className="text-white/80">(</span><span className="text-mint">&quot;~alice&quot;</span><span className="text-white/80">)</span> <span className="text-white/30 text-base">→ 9h2quS8e…</span></div>
            <div><span className="text-white/45">ergonames.</span><span className="text-ergo-400">primaryName</span><span className="text-white/80">(addr)</span> <span className="text-white/30 text-base">→ &quot;alice&quot;</span></div>
          </div>
          <div className="reveal mt-10 flex gap-4">
            <a href="https://github.com/ergonames/ergonames-services/tree/master/sdk" target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-full bg-ergo-500 hover:bg-ergo-400 text-white font-semibold text-sm transition">SDK docs</a>
            <a href="https://github.com/ergonames" target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-ergo-500/50 text-sm transition">GitHub</a>
          </div>
        </section>

        {/* ====== 08 · FAQ + FINAL CTA ====== */}
        <section className="relative max-w-3xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="spine-rule mb-14" />
          <h2 className="reveal h-sec font-light text-center mb-12">Questions, <span className="font-semibold">answered straight.</span></h2>
          <div className="flex flex-col">
            {FAQ.map((f, i) => (
              <details key={f.q} className="faq reveal border-b border-white/10 py-5 group" style={{ transitionDelay: `${i * 60}ms` }}>
                <summary className="flex cursor-pointer list-none items-center justify-between text-lg text-white/90 font-medium">
                  <span><span className="text-ergo-500 font-mono mr-2">~</span>{f.q}</span>
                  <span className="faq-plus text-ergo-500 ml-4 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-white/55 leading-relaxed max-w-xl">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="reveal mt-24 text-center">
            <h2 className="h-sec font-light">Write your <span className="font-semibold gradient-name">name.</span></h2>
            <div className="mt-8 flex items-stretch max-w-md mx-auto rounded-full bg-white/[0.04] border border-white/15 overflow-hidden focus-within:border-ergo-500/60 transition">
              <span className="pl-5 self-center text-ergo-500 text-xl font-bold font-mono">~</span>
              <input
                value={q}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && go()}
                placeholder="find your name"
                aria-label="Search for a name"
                className="flex-1 px-3 py-4 bg-transparent font-mono text-white placeholder:text-white/30 outline-none min-w-0"
              />
              <button onClick={() => go()} className="px-7 bg-ergo-500 hover:bg-ergo-400 text-white font-semibold text-sm transition">Search</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-white/45 text-sm"><HexLogo size={22} /> ErgoNames — lifetime names on Ergo</div>
          <div className="flex gap-6 text-sm text-white/45">
            <a href="https://github.com/ergonames" target="_blank" rel="noreferrer" className="hover:text-white transition">GitHub</a>
            <Link href="/stats" className="hover:text-white transition">Stats</Link>
            <a href="/whitepaper.pdf" className="hover:text-white transition">Whitepaper</a>
            <button type="button" onClick={() => window.dispatchEvent(new Event("ergonames:open-report"))} className="hover:text-white transition">Report an issue</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
