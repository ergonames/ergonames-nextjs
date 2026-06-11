"use client";
import { useState, useRef, useEffect } from "react";
import { resolveName, mintErgoName, connectWallet, getStatus, txLink, refundStuckMint, getQuote } from "../lib/ergonames";
import HexLogo from "../components/HexLogo";
import ThemeToggle from "../components/ThemeToggle";
import Link from "next/link";

function Avatar({ seed, size = 40 }) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  const bg = `linear-gradient(135deg, hsl(${h} 90% 62%), hsl(${(h + 50) % 360} 90% 55%))`;
  return <span style={{ width: size, height: size, background: bg }} className="rounded-full shrink-0" />;
}

const erg = (n) => `${(n / 1e9).toFixed(4)} ERG`;

// Plain-language cost breakdown so the user sees exactly what they pay for.
function PriceBreakdown({ q }) {
  const usd = (n) => (n / q.nanoErgPerUsd);
  const Row = ({ label, hint, nano, strong }) => (
    <div className="flex items-start justify-between gap-3 py-2">
      <div>
        <div className={strong ? "text-ink font-semibold" : "text-body"}>{label}</div>
        {hint && <div className="text-muted text-xs">{hint}</div>}
      </div>
      <div className="text-right shrink-0">
        <div className={strong ? "text-ink font-semibold" : "text-body"}>{erg(nano)}</div>
        <div className="text-muted text-xs">≈ ${usd(nano).toFixed(usd(nano) < 0.1 ? 4 : 2)}</div>
      </div>
    </div>
  );
  return (
    <div className="rounded-2xl bg-raised border border-line p-4">
      <Row label="Name price" hint="The cost of the name itself" nano={q.priceNanoErg} />
      <div className="border-t border-line" />
      <Row label="Network fee" hint="Ergo blockchain miner fees (4 transactions)" nano={q.networkFeeNanoErg} />
      <Row label="Service fee" hint="Runs the automated registration for you" nano={q.serviceFeeNanoErg} />
      <Row label="Deposit" hint="Stays in your name's NFT box — remains yours" nano={q.depositNanoErg} />
      <div className="border-t border-line mt-1" />
      <Row label="Total" nano={q.totalNanoErg} strong />
    </div>
  );
}

const STEPS = ["Enter the minting queue", "Wait for the commit to confirm", "Reveal & register", "Receive your ErgoName"];
const stepsDone = (s) => ({ not_found: 1, queued: 1, revealing: 2, registering: 3, registered: 4, refunded: 0 }[s] ?? 0);

export default function MintPage() {
  const [name, setName] = useState(""); const [result, setResult] = useState(null);
  const [status, setStatus] = useState(""); const [tracked, setTracked] = useState(null);
  const [busy, setBusy] = useState(false); const [address, setAddress] = useState(null);
  const [walletErr, setWalletErr] = useState(""); const [detected, setDetected] = useState(null);
  const [connectStep, setConnectStep] = useState(""); const [quote, setQuote] = useState(null); const pollRef = useRef(null);

  useEffect(() => {
    let t = 0; const id = setInterval(() => {
      if (typeof window !== "undefined" && window.ergoConnector?.nautilus) { setDetected(true); clearInterval(id); }
      else if (++t > 6) { setDetected(false); clearInterval(id); }
    }, 500); return () => clearInterval(id);
  }, []);

  const clean = (n) => n.trim().replace(/^~/, ""); const short = (a) => `${a.slice(0, 5)}…${a.slice(-4)}`;
  const connect = async () => { setWalletErr(""); setConnectStep(""); setBusy(true);
    try { setAddress(await connectWallet(setConnectStep)); setConnectStep(""); } catch (e) { setWalletErr(e.message ?? String(e)); setConnectStep(""); } setBusy(false); };
  const check = async () => { setResult(null); setStatus(""); setTracked(null); setQuote(null);
    const c = clean(name);
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(c)) { setResult({ error: "Names are 1–25 chars: letters, numbers, underscore." }); return; }
    if (c.length < 8) { setResult({ error: "During the testing phase, only names with 8 or more characters can be registered." }); return; }
    setBusy(true);
    try { const r = await resolveName(c); setResult(r); if (r.isAvailable) getQuote(c).then(setQuote); }
    catch { setResult({ error: "Couldn't reach the name service. Try again." }); }
    setBusy(false); };
  const startTracking = (c) => { if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => { try { const s = await getStatus(c); setTracked(s);
      if (s.state === "registered" || s.state === "refunded") clearInterval(pollRef.current); } catch {} }, 15000); };
  const mint = async () => { const c = clean(name); setBusy(true); setStatus(""); setTracked(null);
    try { await mintErgoName(c, address, setStatus); setStatus(""); setTracked({ state: "not_found" }); startTracking(c); } catch (e) { setStatus(`${e.message ?? e}`); } setBusy(false); };

  const c = clean(name); const done = tracked ? stepsDone(tracked.state) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#0B0D16] text-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-[76px] flex items-center justify-between">
          <Link href="/mint" className="flex items-center gap-2">
            <HexLogo size={32} />
            <span className="text-lg tracking-wide"><b className="font-bold">ERGO</b><span className="font-light">NAMES</span></span>
            <span className="ml-1 px-2 py-0.5 rounded-full border border-ergo-500/60 text-ergo-400 text-[10px] font-bold tracking-widest">BETA</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/records" className="text-sm text-white/70 hover:text-white transition hidden sm:block">My Names</Link>
            <ThemeToggle />
            {address ? (
              <span className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/20 text-sm">
                <span className="h-2 w-2 rounded-full bg-ergo-500" /> {short(address)}
              </span>
            ) : (
              <button onClick={connect} disabled={busy}
                className="px-5 py-2 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition disabled:opacity-50">
                {busy ? "Connecting…" : "Connect Wallet"}</button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-24 flex flex-col items-center">
        <h1 className="text-4xl sm:text-5xl text-center text-ink font-light tracking-tight animate-fade-up">
          Your <span className="font-bold">web3</span> username</h1>
        <p className="mt-4 text-center text-muted max-w-md leading-relaxed animate-fade-up" style={{ animationDelay: "60ms" }}>
          Your identity across web3. One name for all your crypto addresses, on the Ergo blockchain.</p>

        <div className="w-full mt-9 flex items-stretch rounded-full bg-surface border border-line shadow-soft overflow-hidden focus-within:border-ergo-500/50 transition animate-fade-up" style={{ animationDelay: "120ms" }}>
          <span className="pl-5 self-center text-ergo-500 text-xl font-bold">~</span>
          <input className="flex-1 px-3 py-4 bg-transparent text-lg text-ink placeholder:text-muted/70 focus:outline-none"
            placeholder="Search for a name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && check()} />
          <button onClick={check} disabled={busy}
            className="px-7 bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">{busy ? "…" : "Search"}</button>
        </div>

        {detected === false && (
          <div className="w-full mt-5 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm text-center animate-fade-in">
            Nautilus wallet not detected. Install the{" "}
            <a className="underline" href="https://chromewebstore.google.com/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai" target="_blank" rel="noreferrer">Nautilus extension</a> and reload.</div>)}
        {connectStep && <div className="w-full mt-5 p-3 rounded-2xl bg-surface border border-line text-muted text-sm text-center animate-fade-in">{connectStep}</div>}
        {walletErr && <div className="w-full mt-5 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm text-center animate-fade-in">{walletErr}</div>}
        {result?.error && <p className="w-full mt-5 text-center text-red-500 text-sm animate-fade-in">{result.error}</p>}

        {result && !result.error && result.isValid && !tracked && (
          <div className="w-full mt-6 bg-surface border border-line rounded-3xl shadow-soft p-5 sm:p-6 animate-scale-in">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar seed={c || "x"} />
                <span className="text-xl text-ink truncate"><span className="text-ergo-500">~</span>{result.isAvailable ? c : result.ergoname}</span></div>
              {result.isAvailable
                ? <span className="px-3.5 py-1.5 rounded-full bg-mint/15 text-mint text-sm font-semibold shrink-0 border border-mint/30">Available</span>
                : <span className="px-3.5 py-1.5 rounded-full bg-raised text-muted text-sm font-semibold shrink-0">Taken</span>}</div>
            {result.isAvailable ? (
              <div className="mt-5 flex flex-col gap-3">
                {quote ? <PriceBreakdown q={quote} />
                  : <p className="text-muted text-sm">Price: <span className="text-ink font-medium">${result.mintCost}</span> · loading breakdown…</p>}
                <p className="text-muted text-xs text-center">Prices update live with the ERG/USD oracle.</p>
                {!address
                  ? <button onClick={connect} disabled={busy} className="py-3.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">Connect wallet to register</button>
                  : <button onClick={mint} disabled={busy} className="py-3.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">{busy ? "Working…" : `Register ~${c}`}</button>}
              </div>
            ) : (result.owner && <p className="mt-3 text-muted text-xs break-all">Owner: {result.owner}</p>)}
          </div>)}

        {busy && status && <p className="w-full mt-5 text-center text-muted text-sm animate-fade-in">{status}</p>}
        {!busy && status && <p className="w-full mt-5 text-center text-red-500 text-sm animate-fade-in">{status}</p>}

        {tracked && (
          <div className="w-full mt-6 bg-surface border border-line rounded-3xl shadow-soft p-6 sm:p-8 animate-fade-up">
            <h2 className="text-center text-2xl text-ink font-semibold">Minting Process</h2>
            <p className="text-center text-muted text-sm mt-1">Registering your name takes four steps</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              {STEPS.map((s, i) => {
                const isDone = i < done, isActive = i === done && tracked.state !== "registered";
                return (
                  <div key={i} className={`rounded-2xl p-4 border text-center flex flex-col items-center gap-2.5 transition-colors duration-500
                    ${isActive ? "bg-ergo-500 border-ergo-500 text-white" : "bg-surface border-line"}`}>
                    <span className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition
                      ${isDone ? "bg-mint text-[#06301d]" : isActive ? "bg-[#0B0D16] text-white animate-pulse-ring" : "bg-line text-muted"}`}>
                      {isDone ? "✓" : i + 1}</span>
                    <span className={`text-xs leading-snug ${isActive ? "text-white" : "text-body"}`}>{s}</span>
                  </div>);
              })}
            </div>
            {!["registered", "refunded"].includes(tracked.state) && (
              <div className="mt-6 h-2 rounded-full bg-raised overflow-hidden"><div className="h-full w-2/3 rounded-full progress-shimmer animate-bar" /></div>)}
            <div className="mt-7 pt-6 border-t border-line text-center">
              <p className={`text-lg font-semibold ${tracked.state === "registered" ? "text-mint" : tracked.state === "refunded" ? "text-ergo-500" : "text-ink"}`}>
                {tracked.state === "registered" ? `~${c} is yours 🎉` : tracked.state === "refunded" ? "Couldn't complete — your funds were refunded." : "Transaction sent — registering your name…"}</p>
              <div className="mt-3 flex flex-col items-center gap-1">
                {tracked.registerTxId && <a className="text-ergo-500 underline text-sm" target="_blank" rel="noreferrer" href={txLink(tracked.registerTxId)}>View on explorer ↗</a>}
                {tracked.refundTxId && <a className="text-ergo-500 underline text-sm" target="_blank" rel="noreferrer" href={txLink(tracked.refundTxId)}>View refund tx ↗</a>}
                {tracked.state === "registered" && <Link href="/records" className="text-muted text-sm hover:text-ink transition">See it in My Names →</Link>}
                {!["registered", "refunded"].includes(tracked.state) && <span className="text-muted text-xs">You can close this page — it continues on-chain.</span>}
              </div>
            </div>
          </div>)}

        <div className="w-full mt-6 p-4 rounded-2xl bg-ergo-500/[0.08] border border-ergo-500/25 text-body text-sm animate-fade-in">
          <span className="font-semibold text-ergo-500">Testing phase.</span> Names registered now are for testing and{" "}
          <span className="font-semibold">may be purged before the public launch</span> — please don&apos;t rely on them yet. Only 8+ character names for now.</div>

        <Link href="/records" className="mt-4 text-sm text-muted hover:text-ink transition">Manage your names & recover stuck registrations →</Link>
      </main>
    </div>
  );
}
