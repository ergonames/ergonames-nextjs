"use client";
import { useState, useRef, useEffect } from "react";
import { resolveName, mintErgoName, connectWallet, getStatus, txLink, refundStuckMint } from "../lib/ergonames";
import HexLogo from "../components/HexLogo";

const STATE_COPY = {
  queued: "Queued — waiting for the registration bot…",
  revealing: "Revealing your registration on-chain…",
  registering: "Registering your name… (a few blocks)",
  registered: "Registered 🎉",
  refunded: "Couldn't complete — your funds were refunded.",
  not_found: "Submitted — the bot is picking it up…",
};

export default function MintPage() {
  const [name, setName] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [tracked, setTracked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState(null);
  const [walletErr, setWalletErr] = useState("");
  const [detected, setDetected] = useState(null);
  const [connectStep, setConnectStep] = useState("");
  const [recoverName, setRecoverName] = useState("");
  const [recoverMsg, setRecoverMsg] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      if (typeof window !== "undefined" && window.ergoConnector?.nautilus) { setDetected(true); clearInterval(id); }
      else if (++tries > 6) { setDetected(false); clearInterval(id); }
    }, 500);
    return () => clearInterval(id);
  }, []);

  const clean = (n) => n.trim().replace(/^~/, "");
  const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  const connect = async () => {
    setWalletErr(""); setConnectStep(""); setBusy(true);
    try { setAddress(await connectWallet(setConnectStep)); setConnectStep(""); }
    catch (e) { setWalletErr(e.message ?? String(e)); setConnectStep(""); }
    setBusy(false);
  };

  const check = async () => {
    setResult(null); setStatus(""); setTracked(null);
    const c = clean(name);
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(c)) { setResult({ error: "Names are 1–25 chars: letters, numbers, underscore." }); return; }
    if (c.length < 8) { setResult({ error: "During the testing phase, only names with 8 or more characters can be registered." }); return; }
    setBusy(true);
    try { setResult(await resolveName(c)); }
    catch { setResult({ error: "Couldn't reach the name service. Try again." }); }
    setBusy(false);
  };

  const startTracking = (c) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try { const s = await getStatus(c); setTracked(s);
        if (s.state === "registered" || s.state === "refunded") clearInterval(pollRef.current);
      } catch {}
    }, 15000);
  };

  const mint = async () => {
    const c = clean(name);
    setBusy(true); setStatus(""); setTracked(null);
    try { await mintErgoName(c, address, setStatus); setStatus(""); setTracked({ state: "not_found" }); startTracking(c); }
    catch (e) { setStatus(`⚠️ ${e.message ?? e}`); }
    setBusy(false);
  };

  const recover = async () => {
    if (!address) { setRecoverMsg("Connect your wallet first."); return; }
    setBusy(true); setRecoverMsg("");
    try { await refundStuckMint(clean(recoverName), setRecoverMsg); }
    catch (e) { setRecoverMsg(`⚠️ ${e.message ?? e}`); }
    setBusy(false);
  };

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-2.5">
          <HexLogo size={34} />
          <span className="font-display text-xl font-bold tracking-tight">ErgoNames</span>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-ergo-500/15 border border-ergo-500/40 text-ergo-400 text-[10px] font-bold tracking-widest">BETA</span>
        </div>
        {address ? (
          <span className="glass text-sm px-3.5 py-2 rounded-full border border-ink-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-mint" /> {short(address)}
          </span>
        ) : (
          <button onClick={connect} disabled={busy}
            className="px-5 py-2 rounded-full bg-ergo-gradient text-white font-semibold text-sm shadow-glow hover:brightness-110 transition disabled:opacity-50">
            {busy ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center px-6 pt-10 sm:pt-16 pb-24 w-full">
        <div className="w-full max-w-2xl flex flex-col items-center gap-7">
          <div className="animate-floaty"><HexLogo size={64} /></div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-center tracking-tight leading-[1.05]">
            Your name,<br />
            <span className="bg-ergo-gradient bg-clip-text text-transparent">on Ergo.</span>
          </h1>
          <p className="text-center text-white/55 max-w-md">
            Claim a human-readable <span className="text-white/80">~name</span> on the Ergo blockchain — yours, in your wallet.
          </p>

          {/* Search */}
          <div className="w-full mt-2">
            <div className="glass flex items-center gap-2 p-2 rounded-2xl border border-ink-700 focus-within:border-ergo-500/60 transition shadow-card">
              <span className="pl-3 text-ergo-500 text-2xl font-display font-bold">~</span>
              <input
                className="flex-1 bg-transparent px-1 py-3 text-lg placeholder:text-white/30 focus:outline-none"
                placeholder="yourname" value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && check()} />
              <button onClick={check} disabled={busy}
                className="px-6 py-3 rounded-xl bg-ergo-gradient text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-50">
                {busy ? "…" : "Search"}
              </button>
            </div>
          </div>

          {/* Wallet diagnostics */}
          {detected === false && (
            <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm text-center">
              Nautilus wallet not detected. Install the{" "}
              <a className="underline" href="https://chromewebstore.google.com/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai" target="_blank" rel="noreferrer">Nautilus extension</a> and reload.
            </div>
          )}
          {connectStep && <div className="w-full glass p-3 rounded-xl border border-ink-700 text-white/70 text-sm text-center">{connectStep}</div>}
          {walletErr && <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-sm text-center">{walletErr}</div>}

          {/* Result */}
          {result?.error && <p className="text-red-400 text-center text-sm">{result.error}</p>}
          {result && !result.error && result.isValid && !tracked && (
            <div className="w-full glass rounded-2xl border border-ink-700 p-6 flex flex-col gap-4 shadow-card">
              {result.isAvailable ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl"><span className="text-ergo-500">~</span>{clean(name)}</span>
                    <span className="flex items-center gap-1.5 text-mint text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-mint" />available</span>
                  </div>
                  <p className="text-white/50 text-sm">Price: <span className="text-white/80">${result.mintCost}</span> in ERG (at the live oracle rate).</p>
                  {!address ? (
                    <button onClick={connect} disabled={busy}
                      className="py-3.5 rounded-xl bg-ergo-gradient text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-50">
                      Connect wallet to register
                    </button>
                  ) : (
                    <button onClick={mint} disabled={busy}
                      className="py-3.5 rounded-xl bg-ergo-gradient text-white font-semibold shadow-glow hover:brightness-110 transition disabled:opacity-50">
                      {busy ? "Working…" : `Register ~${clean(name)}`}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl"><span className="text-ergo-500">~</span>{result.ergoname}</span>
                    <span className="text-white/40 text-sm font-semibold">taken</span>
                  </div>
                  {result.owner && <p className="text-white/45 text-xs break-all">Owner: {result.owner}</p>}
                </>
              )}
            </div>
          )}

          {busy && status && <p className="text-white/70 text-center text-sm">{status}</p>}
          {!busy && status && <p className="text-red-400 text-center text-sm max-w-md">{status}</p>}

          {/* Mint progress */}
          {tracked && (
            <div className="w-full glass rounded-2xl border border-ink-700 p-6 flex flex-col gap-3 text-center shadow-card">
              <p className={`font-display text-lg ${tracked.state === "registered" ? "text-mint" : tracked.state === "refunded" ? "text-amber-400" : "text-white/85"}`}>
                {STATE_COPY[tracked.state] ?? tracked.state}
              </p>
              {tracked.state === "registered" && <p className="text-white/55 text-sm">~{clean(name)} is now yours.</p>}
              {tracked.registerTxId && <a className="text-ergo-400 underline text-sm" target="_blank" rel="noreferrer" href={txLink(tracked.registerTxId)}>view registration tx ↗</a>}
              {tracked.refundTxId && <a className="text-ergo-400 underline text-sm" target="_blank" rel="noreferrer" href={txLink(tracked.refundTxId)}>view refund tx ↗</a>}
              {!["registered", "refunded"].includes(tracked.state) && <p className="text-white/35 text-xs">You can close this page — registration continues on-chain.</p>}
            </div>
          )}

          {/* Beta notice */}
          <div className="w-full mt-2 p-4 rounded-2xl bg-amber-400/[0.07] border border-amber-400/25 text-amber-200/90 text-sm">
            <span className="font-semibold">Testing phase.</span> ErgoNames is in beta — names registered now may be{" "}
            <span className="font-semibold">purged before the public launch</span>, so don't rely on them yet. Only 8+ character names for now.
          </div>

          {/* Recovery */}
          <details className="w-full text-sm text-white/60">
            <summary className="cursor-pointer hover:text-white/80 transition">Recover a stuck registration</summary>
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-white/45">If a registration didn&apos;t complete, recover the funds back to your wallet.</p>
              <div className="flex gap-2">
                <input className="flex-1 glass px-3 py-2 rounded-xl border border-ink-700 focus:outline-none focus:border-ergo-500/60"
                  placeholder="name to recover" value={recoverName} onChange={(e) => setRecoverName(e.target.value)} />
                <button onClick={recover} disabled={busy || !recoverName}
                  className="px-4 py-2 rounded-xl border border-ink-700 hover:bg-ink-800 font-semibold transition disabled:opacity-50">Recover</button>
              </div>
              {recoverMsg && <p className="text-white/70">{recoverMsg}</p>}
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
