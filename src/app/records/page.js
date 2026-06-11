"use client";
import { useState, useEffect, useCallback } from "react";
import { connectWallet, getOwnedNames, getStuckMints, refundStuckMint, resolveName, txLink } from "../lib/ergonames";
import HexLogo from "../components/HexLogo";
import ThemeToggle from "../components/ThemeToggle";
import Link from "next/link";

function Avatar({ seed, size = 40 }) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return <span style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${h} 90% 62%), hsl(${(h + 50) % 360} 90% 55%))` }} className="rounded-full shrink-0" />;
}

export default function RecordsPage() {
  const [address, setAddress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [names, setNames] = useState(null);   // null = not loaded
  const [stuck, setStuck] = useState([]);
  const [recovering, setRecovering] = useState({});
  const short = (a) => `${a.slice(0, 5)}…${a.slice(-4)}`;

  const load = useCallback(async (addr) => {
    setBusy(true); setErr("");
    try {
      const [n, s] = await Promise.all([getOwnedNames(), getStuckMints(addr)]);
      // hide stuck entries that are actually already resolved/registered
      const filtered = [];
      for (const m of s) { try { const r = await resolveName(m.name); if (r.isAvailable !== false) filtered.push(m); } catch { filtered.push(m); } }
      setNames(n); setStuck(filtered);
    } catch (e) { setErr(e.message ?? String(e)); }
    setBusy(false);
  }, []);

  const connect = async () => {
    setErr(""); setBusy(true);
    try { const a = await connectWallet(); setAddress(a); await load(a); }
    catch (e) { setErr(e.message ?? String(e)); }
    setBusy(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.ergoConnector?.nautilus) {
      window.ergoConnector.nautilus.isConnected?.().then((c) => { if (c) connect(); }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recover = async (name) => {
    setRecovering((r) => ({ ...r, [name]: "Recovering…" }));
    try {
      const tx = await refundStuckMint(name, (s) => setRecovering((r) => ({ ...r, [name]: s })));
      setRecovering((r) => ({ ...r, [name]: `Recovered ✓` }));
      setTimeout(() => { setStuck((s) => s.filter((m) => m.name !== name)); }, 4000);
    } catch (e) { setRecovering((r) => ({ ...r, [name]: `⚠️ ${e.message ?? e}` })); }
  };

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
            <Link href="/mint" className="text-sm text-white/70 hover:text-white transition hidden sm:block">Register</Link>
            <ThemeToggle />
            {address ? (
              <span className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/20 text-sm"><span className="h-2 w-2 rounded-full bg-ergo-500" /> {short(address)}</span>
            ) : (
              <button onClick={connect} disabled={busy} className="px-5 py-2 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition disabled:opacity-50">{busy ? "Connecting…" : "Connect Wallet"}</button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-24">
        <h1 className="text-3xl sm:text-4xl text-ink font-semibold tracking-tight animate-fade-up">My Names</h1>
        <p className="mt-2 text-muted animate-fade-up" style={{ animationDelay: "60ms" }}>The ErgoNames held by your connected wallet.</p>

        {err && <div className="mt-6 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">{err}</div>}

        {!address ? (
          <div className="mt-10 bg-surface border border-line rounded-3xl shadow-soft p-10 text-center animate-scale-in">
            <div className="flex justify-center animate-floaty"><HexLogo size={56} dark={false} /></div>
            <p className="mt-5 text-body">Connect your wallet to see the names you own.</p>
            <button onClick={connect} disabled={busy} className="mt-5 px-6 py-3 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">{busy ? "Connecting…" : "Connect Wallet"}</button>
          </div>
        ) : (
          <>
            {/* Stuck registrations — surfaced automatically */}
            {stuck.length > 0 && (
              <section className="mt-8 animate-fade-up">
                <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-ergo-500 animate-pulse" /> Stuck registrations
                </h2>
                <p className="text-muted text-sm mt-1">These didn&apos;t complete. Recover the funds back to your wallet.</p>
                <div className="mt-3 flex flex-col gap-3">
                  {stuck.map((m) => (
                    <div key={m.name} className="bg-surface border border-ergo-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar seed={m.name} size={36} />
                        <div className="min-w-0">
                          <div className="text-ink truncate"><span className="text-ergo-500">~</span>{m.name}</div>
                          <div className="text-muted text-xs">{(m.revealValue / 1e9).toFixed(4)} ERG recoverable</div>
                        </div>
                      </div>
                      {recovering[m.name]
                        ? <span className="text-sm text-muted shrink-0">{recovering[m.name]}</span>
                        : <button onClick={() => recover(m.name)} className="px-4 py-2 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white text-sm font-semibold transition shrink-0">Recover</button>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Owned names */}
            <section className="mt-8">
              {busy && names === null && <div className="text-muted text-sm animate-fade-in">Loading your names…</div>}
              {names !== null && names.length === 0 && (
                <div className="bg-surface border border-line rounded-3xl shadow-soft p-10 text-center animate-scale-in">
                  <p className="text-body">You don&apos;t own any ErgoNames yet.</p>
                  <Link href="/mint" className="inline-block mt-4 px-6 py-3 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition">Register your first name</Link>
                </div>
              )}
              {names && names.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {names.map((n, i) => (
                    <a key={n.tokenId} href={txLink("")} onClick={(e) => e.preventDefault()}
                      className="bg-surface border border-line rounded-2xl p-4 flex items-center gap-3 hover:border-ergo-500/40 transition animate-fade-up"
                      style={{ animationDelay: `${i * 40}ms` }}>
                      <Avatar seed={n.name} />
                      <div className="min-w-0">
                        <div className="text-ink text-lg truncate"><span className="text-ergo-500">~</span>{n.name}</div>
                        <div className="text-muted text-xs truncate">{n.tokenId.slice(0, 16)}…</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
