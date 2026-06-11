"use client";
import { useState, useRef, useEffect } from "react";
import { resolveName, mintErgoName, connectWallet, getStatus, txLink, refundStuckMint } from "../lib/ergonames";
import HexLogo from "../components/HexLogo";

// Deterministic gradient avatar per name (like the Figma orb).
function Avatar({ seed, size = 40 }) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  const bg = `linear-gradient(135deg, hsl(${h} 90% 62%), hsl(${(h + 50) % 360} 90% 55%))`;
  return <span style={{ width: size, height: size, background: bg }} className="rounded-full shrink-0" />;
}

const STEPS = [
  "Enter the ErgoNames minting queue",
  "Wait ~2 blocks for the commit to confirm",
  "Reveal & register your name",
  "Receive your ErgoName",
];
// Map bot status -> how many of the 4 steps are complete.
const stepsDone = (state) =>
  ({ not_found: 1, queued: 1, revealing: 2, registering: 3, registered: 4, refunded: 0 }[state] ?? 0);

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
  const [showRecover, setShowRecover] = useState(false);
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
  const short = (a) => `${a.slice(0, 5)}…${a.slice(-4)}`;

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
    try { setResult(await resolveName(c)); } catch { setResult({ error: "Couldn't reach the name service. Try again." }); }
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
    catch (e) { setStatus(`${e.message ?? e}`); }
    setBusy(false);
  };
  const recover = async () => {
    if (!address) { setRecoverMsg("Connect your wallet first."); return; }
    setBusy(true); setRecoverMsg("");
    try { await refundStuckMint(clean(recoverName), setRecoverMsg); } catch (e) { setRecoverMsg(`${e.message ?? e}`); }
    setBusy(false);
  };

  const c = clean(name);
  const done = tracked ? stepsDone(tracked.state) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-page">
      {/* Black header */}
      <header className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-[76px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HexLogo size={32} />
            <span className="text-lg tracking-wide"><b className="font-bold">ERGO</b><span className="font-light">NAMES</span></span>
            <span className="ml-1 px-2 py-0.5 rounded-full border border-ergo-500/60 text-ergo-400 text-[10px] font-bold tracking-widest">BETA</span>
          </div>
          {address ? (
            <span className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/20 text-sm">
              <span className="h-2 w-2 rounded-full bg-ergo-500" /> {short(address)}
            </span>
          ) : (
            <button onClick={connect} disabled={busy}
              className="px-5 py-2 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition disabled:opacity-50">
              {busy ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-24 flex flex-col items-center">
        {/* Hero */}
        <h1 className="text-4xl sm:text-5xl text-center text-ink font-light tracking-tight">
          Your <span className="font-bold">web3</span> username
        </h1>
        <p className="mt-4 text-center text-muted max-w-md leading-relaxed">
          Your identity across web3. One name for all your crypto addresses, on the Ergo blockchain.
        </p>

        {/* Search */}
        <div className="w-full mt-9 flex items-stretch rounded-full bg-white border border-line shadow-soft overflow-hidden focus-within:border-ergo-500/50 transition">
          <span className="pl-5 self-center text-ergo-500 text-xl font-bold">~</span>
          <input
            className="flex-1 px-3 py-4 bg-transparent text-lg text-ink placeholder:text-muted/70 focus:outline-none"
            placeholder="Search for a name" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && check()} />
          <button onClick={check} disabled={busy}
            className="px-7 bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50 flex items-center">
            {busy ? "…" : "Search"}
          </button>
        </div>

        {/* Wallet diagnostics */}
        {detected === false && (
          <div className="w-full mt-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
            Nautilus wallet not detected. Install the{" "}
            <a className="underline" href="https://chromewebstore.google.com/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai" target="_blank" rel="noreferrer">Nautilus extension</a> and reload.
          </div>
        )}
        {connectStep && <div className="w-full mt-5 p-3 rounded-2xl bg-white border border-line text-muted text-sm text-center">{connectStep}</div>}
        {walletErr && <div className="w-full mt-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">{walletErr}</div>}
        {result?.error && <p className="w-full mt-5 text-center text-red-500 text-sm">{result.error}</p>}

        {/* Result card */}
        {result && !result.error && result.isValid && !tracked && (
          <div className="w-full mt-6 bg-white border border-line rounded-3xl shadow-soft p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar seed={c || "x"} />
                <span className="text-xl text-ink truncate"><span className="text-ergo-500">~</span>{result.isAvailable ? c : result.ergoname}</span>
              </div>
              {result.isAvailable
                ? <span className="px-3.5 py-1.5 rounded-full bg-availbg text-availfg text-sm font-semibold shrink-0">Available</span>
                : <span className="px-3.5 py-1.5 rounded-full bg-page text-muted text-sm font-semibold shrink-0">Taken</span>}
            </div>
            {result.isAvailable ? (
              <div className="mt-5 flex flex-col gap-3">
                <p className="text-muted text-sm">Price: <span className="text-ink font-medium">${result.mintCost}</span> in ERG, at the live oracle rate.</p>
                {!address ? (
                  <button onClick={connect} disabled={busy}
                    className="py-3.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">
                    Connect wallet to register
                  </button>
                ) : (
                  <button onClick={mint} disabled={busy}
                    className="py-3.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">
                    {busy ? "Working…" : `Register ~${c}`}
                  </button>
                )}
              </div>
            ) : (
              result.owner && <p className="mt-3 text-muted text-xs break-all">Owner: {result.owner}</p>
            )}
          </div>
        )}

        {busy && status && <p className="w-full mt-5 text-center text-muted text-sm">{status}</p>}
        {!busy && status && <p className="w-full mt-5 text-center text-red-500 text-sm">{status}</p>}

        {/* Minting process stepper */}
        {tracked && (
          <div className="w-full mt-6 bg-white border border-line rounded-3xl shadow-soft p-6 sm:p-8">
            <h2 className="text-center text-2xl text-ink font-semibold">Minting Process</h2>
            <p className="text-center text-muted text-sm mt-1">Registering your name takes four steps</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              {STEPS.map((s, i) => {
                const isDone = i < done, isActive = i === done && tracked.state !== "registered";
                return (
                  <div key={i} className={`rounded-2xl p-4 border text-center flex flex-col items-center gap-2.5
                    ${isActive ? "bg-ergo-500 border-ergo-500 text-white" : "bg-white border-line"}`}>
                    <span className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold
                      ${isDone ? "bg-ink text-white" : isActive ? "bg-ink text-white" : "bg-ergo-500 text-white"}`}>
                      {isDone ? "✓" : i + 1}
                    </span>
                    <span className={`text-xs leading-snug ${isActive ? "text-white" : "text-body"}`}>{s}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 pt-6 border-t border-line text-center">
              <p className={`text-lg font-semibold ${tracked.state === "registered" ? "text-availfg" : tracked.state === "refunded" ? "text-ergo-600" : "text-ink"}`}>
                {tracked.state === "registered" ? `~${c} is yours 🎉`
                  : tracked.state === "refunded" ? "Couldn't complete — your funds were refunded."
                  : "Transaction sent — your name is being registered…"}
              </p>
              <div className="mt-3 flex flex-col items-center gap-1">
                {tracked.registerTxId && <a className="text-ergo-500 underline text-sm" target="_blank" rel="noreferrer" href={txLink(tracked.registerTxId)}>View on explorer ↗</a>}
                {tracked.refundTxId && <a className="text-ergo-500 underline text-sm" target="_blank" rel="noreferrer" href={txLink(tracked.refundTxId)}>View refund tx ↗</a>}
                {!["registered", "refunded"].includes(tracked.state) && <span className="text-muted text-xs">You can close this page — it continues on-chain.</span>}
              </div>
            </div>
          </div>
        )}

        {/* Beta notice */}
        <div className="w-full mt-6 p-4 rounded-2xl bg-ergo-500/[0.06] border border-ergo-500/25 text-body text-sm">
          <span className="font-semibold text-ergo-600">Testing phase.</span> Names registered now are for testing and{" "}
          <span className="font-semibold">may be purged before the public launch</span> — please don&apos;t rely on them yet. Only 8+ character names for now.
        </div>

        {/* Recovery */}
        <div className="w-full mt-4 text-sm">
          <button onClick={() => setShowRecover(!showRecover)} className="text-muted hover:text-ink transition">
            {showRecover ? "▾" : "▸"} Recover a stuck registration
          </button>
          {showRecover && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-muted">If a registration didn&apos;t complete, recover the funds back to your wallet.</p>
              <div className="flex gap-2">
                <input className="flex-1 px-4 py-2.5 rounded-full bg-white border border-line focus:outline-none focus:border-ergo-500/50"
                  placeholder="name to recover" value={recoverName} onChange={(e) => setRecoverName(e.target.value)} />
                <button onClick={recover} disabled={busy || !recoverName}
                  className="px-5 py-2.5 rounded-full border border-line bg-white hover:bg-page font-semibold transition disabled:opacity-50">Recover</button>
              </div>
              {recoverMsg && <p className="text-body">{recoverMsg}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
