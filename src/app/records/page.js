"use client";
import { useState, useEffect, useCallback } from "react";
import { connectWallet, getOwnedNames, getMints, refundStuckMint, getNameStats, getStatus, txLink, getOnChainArt, getRefundableCommits, refundCommit, getBadgeBalance } from "../lib/ergonames";
import HexLogo from "../components/HexLogo";
import HexArt from "../components/HexArt";
import NftCard from "../components/NftCard";
import ThemeToggle from "../components/ThemeToggle";
import Link from "next/link";

function Avatar({ seed, size = 40 }) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return <span style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${h} 90% 62%), hsl(${(h + 50) % 360} 90% 55%))` }} className="rounded-full shrink-0" />;
}

const STEPS = ["Enter the minting queue", "Wait for the commit to confirm", "Reveal & register", "Receive your ErgoName"];
const stepsDone = (s) => ({ not_found: 1, queued: 1, revealing: 2, registering: 3, registered: 4, refunded: 0 }[s] ?? 1);

// ── Detail: a registered name (art + stats) ────────────────────────────────
function MintedDetail({ name }) {
  const [s, setS] = useState(null);
  const [art, setArt] = useState(null);
  useEffect(() => {
    getNameStats(name).then((r) => {
      setS(r);
      if (r?.tokenId) getOnChainArt(r.tokenId).then(setArt);
    }).catch(() => setS({}));
  }, [name]);
  const date = s?.timestampRegistered ? new Date(Number(s.timestampRegistered)).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
  const Stat = ({ k, v, mono, href }) => (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-line last:border-0">
      <span className="text-muted text-sm">{k}</span>
      {href ? <a href={href} target="_blank" rel="noreferrer" className={`text-ergo-500 underline text-sm ${mono ? "font-mono" : ""} truncate`}>{v}</a>
        : <span className={`text-ink text-sm ${mono ? "font-mono" : ""} truncate max-w-[60%] text-right`}>{v}</span>}
    </div>
  );
  return (
    <div className="grid md:grid-cols-2 gap-6 animate-fade-up">
      <div className="rounded-3xl overflow-hidden border border-line shadow-soft aspect-square relative">
        {art
          ? <img src={art} alt={`~${name} on-chain artwork`} className="w-full h-full" />
          : <NftCard name={name} className="w-full h-full" />}
        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
          <div className="text-white text-2xl font-semibold"><span className="text-ergo-400">~</span>{name}</div>
        </div>
      </div>
      <div className="bg-surface border border-line rounded-3xl shadow-soft p-6">
        <h3 className="text-ink font-semibold text-lg">Statistics</h3>
        <div className="mt-2">
          <Stat k="Status" v={<span className="text-mint font-semibold">Registered</span>} />
          {s?.registrationNumber && <Stat k="Registration #" v={`#${s.registrationNumber}`} />}
          <Stat k="Length" v={`${name.length} characters`} />
          <Stat k="Registered" v={date} />
          {s?.blockRegistered && <Stat k="Block" v={s.blockRegistered.toLocaleString()} />}
          {s?.tokenId && <Stat k="Token" v={`${s.tokenId.slice(0, 10)}…`} mono href={`https://ergexplorer.com/token/${s.tokenId}`} />}
          {s?.mintTransactionId && <Stat k="Mint tx" v="view ↗" href={txLink(s.mintTransactionId)} />}
          {s?.owner && <Stat k="Owner" v={`${s.owner.slice(0, 8)}…${s.owner.slice(-6)}`} mono />}
          <Stat k="Public page" v={`ergonames.io/name/${name} ↗`} href={`/name/${name}`} />
        </div>
      </div>
    </div>
  );
}

// ── Detail: an in-progress mint (stepper + ring) ───────────────────────────
function MintingDetail({ name }) {
  const [t, setT] = useState(null);
  useEffect(() => {
    let live = true; const tick = () => getStatus(name).then((s) => live && setT(s)).catch(() => {});
    tick(); const id = setInterval(tick, 12000); return () => { live = false; clearInterval(id); };
  }, [name]);
  const done = t ? stepsDone(t.state) : 1;
  const reg = t?.state === "registered";
  return (
    <div className="bg-surface border border-line rounded-3xl shadow-soft p-6 sm:p-8 animate-fade-up">
      <h2 className="text-center text-2xl text-ink font-semibold">Minting Process</h2>
      <p className="text-center text-muted text-sm mt-1">Registering <span className="text-ink">~{name}</span> takes four steps</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {STEPS.map((step, i) => {
          const isDone = i < done, isActive = i === done && !reg;
          return (
            <div key={i} className={`rounded-2xl p-4 border text-center flex flex-col items-center gap-2.5 transition-colors duration-500 ${isActive ? "bg-ergo-500 border-ergo-500 text-white" : "bg-surface border-line"}`}>
              <span className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold ${isDone ? "bg-mint text-[#06301d]" : isActive ? "bg-[#0B0D16] text-white animate-pulse-ring" : "bg-line text-muted"}`}>{isDone ? "✓" : i + 1}</span>
              <span className={`text-xs leading-snug ${isActive ? "text-white" : "text-body"}`}>{step}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex flex-col items-center">
        <div className="relative h-32 w-32">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(var(--line))" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="#FF5537" strokeWidth="10" strokeLinecap="round"
              strokeDasharray="327" strokeDashoffset={reg ? 0 : 327 - (327 * done) / 4} className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-ergo-500">{reg ? "✓" : `${done}/4`}</div>
        </div>
        <p className={`mt-5 text-lg font-semibold ${reg ? "text-mint" : "text-ink"}`}>{reg ? `~${name} is yours 🎉` : "Almost there…"}</p>
        <p className="mt-1 text-center text-muted text-sm max-w-sm">Your name is reserved while this completes — it isn&apos;t registered until the final step. You can close this page; it continues on-chain.</p>
        {t?.registerTxId && <a className="mt-3 text-ergo-500 underline text-sm" target="_blank" rel="noreferrer" href={txLink(t.registerTxId)}>View on explorer ↗</a>}
      </div>
    </div>
  );
}

// ── Detail: a failed/stuck mint (refund flow) ──────────────────────────────
function FailedDetail({ name, revealValue, onRecovered }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneTx, setDoneTx] = useState(null);
  const recover = async () => {
    setBusy(true); setMsg("");
    try { const tx = await refundStuckMint(name, setMsg); setDoneTx(tx); setMsg(""); setTimeout(() => onRecovered?.(name), 5000); }
    catch (e) { setMsg(`${e.message ?? e}`); }
    setBusy(false);
  };
  return (
    <div className="bg-surface border border-line rounded-3xl shadow-soft p-6 sm:p-8 max-w-lg mx-auto text-center animate-fade-up">
      <div className="flex justify-center"><HexArt name={name} className="h-20 w-20 rounded-2xl opacity-70" /></div>
      <h2 className="mt-5 text-xl text-ink font-semibold">Recover <span className="text-ergo-500">~</span>{name}</h2>
      <p className="mt-2 text-muted text-sm">This registration didn&apos;t complete. Your funds are safe on-chain — only your wallet can release them, so you sign the refund.</p>
      <div className="mt-5 bg-raised rounded-2xl p-4 flex items-center justify-between">
        <span className="text-muted text-sm">Recoverable</span>
        <span className="text-ink font-semibold">{(revealValue / 1e9).toFixed(4)} ERG</span>
      </div>
      {doneTx ? (
        <div className="mt-5">
          <p className="text-mint font-semibold">Refund sent 🎉</p>
          <a className="text-ergo-500 underline text-sm" target="_blank" rel="noreferrer" href={txLink(doneTx)}>View transaction ↗</a>
        </div>
      ) : (
        <button onClick={recover} disabled={busy}
          className="mt-5 w-full py-3.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">
          {busy ? (msg || "Working…") : "Recover my funds"}
        </button>
      )}
      {msg && !busy && <p className="mt-3 text-sm text-red-500">{msg}</p>}
    </div>
  );
}

export default function RecordsPage() {
  const [address, setAddress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [owned, setOwned] = useState(null);
  const [minting, setMinting] = useState([]);
  const [stuck, setStuck] = useState([]);
  const [dust, setDust] = useState([]);
  const [badges, setBadges] = useState(0);
  const [dustBusy, setDustBusy] = useState(""); // boxId being refunded
  const [dustMsg, setDustMsg] = useState("");
  const [sel, setSel] = useState(null); // { name, kind }
  const short = (a) => `${a.slice(0, 5)}…${a.slice(-4)}`;

  const load = useCallback(async (addr) => {
    setBusy(true); setErr("");
    try {
      // Render the core (owned names + in-flight/stuck) as soon as it's ready —
      // these are fast. Don't block the whole page on the slow explorer scans.
      const [names, mints] = await Promise.all([getOwnedNames(), getMints(addr)]);
      const ownedSet = new Set(names.map((n) => n.name));
      setOwned(names);
      setMinting(mints.minting.filter((n) => !ownedSet.has(n)));
      // Never hide stuck entries behind owned names: a duplicate-mint can leave
      // a recoverable reveal box for a name the wallet also owns.
      setStuck(mints.stuck);
      setBusy(false);
      // Recoverable dust (~2s explorer scan) + badge count load in the
      // background and fill in when ready, so they never delay the names list.
      getRefundableCommits(addr).then(setDust).catch(() => {});
      getBadgeBalance(addr).then(setBadges).catch(() => {});
    } catch (e) { setErr(e.message ?? String(e)); setBusy(false); }
  }, []);

  const connect = async () => {
    setErr(""); setBusy(true);
    try { const a = await connectWallet(); setAddress(a); await load(a); } catch (e) { setErr(e.message ?? String(e)); }
    setBusy(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.ergoConnector?.nautilus)
      window.ergoConnector.nautilus.isConnected?.().then((c) => { if (c) connect(); }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRecovered = (name) => { setStuck((s) => s.filter((m) => m.name !== name)); setSel(null); };
  const stuckOf = (n) => stuck.find((m) => m.name === n);

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
            <Link href="/stats" className="text-sm text-white/70 hover:text-white transition hidden sm:block">Stats</Link>
            <ThemeToggle />
            {address ? <span className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/20 text-sm"><span className="h-2 w-2 rounded-full bg-ergo-500" /> {short(address)}</span>
              : <button onClick={connect} disabled={busy} className="px-5 py-2 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition disabled:opacity-50">{busy ? "Connecting…" : "Connect Wallet"}</button>}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-24">
        {sel ? (
          <>
            <button onClick={() => setSel(null)} className="text-muted hover:text-ink transition text-sm mb-6">← Back to My Names</button>
            {sel.kind === "minted" && <MintedDetail name={sel.name} />}
            {sel.kind === "minting" && <MintingDetail name={sel.name} />}
            {sel.kind === "failed" && <FailedDetail name={sel.name} revealValue={stuckOf(sel.name)?.revealValue ?? 0} onRecovered={onRecovered} />}
          </>
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl text-ink font-semibold tracking-tight animate-fade-up">My Names</h1>
            <p className="mt-2 text-muted animate-fade-up" style={{ animationDelay: "60ms" }}>Everything tied to your wallet — owned, minting, and anything that needs recovering.</p>
            {badges > 0 && (
              <div className="mt-4 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-mint/[0.1] border border-mint/30 text-sm animate-fade-up" title="Earned by minting during the beta. Burn at launch for a Founder art flair.">
                <span className="text-base leading-none">🏅</span>
                <span className="text-ink font-medium">{badges} Beta Tester {badges === 1 ? "badge" : "badges"}</span>
                <span className="text-muted hidden sm:inline">· burn for a Founder flair at launch</span>
              </div>
            )}
            {err && <div className="mt-6 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">{err}</div>}

            {!address ? (
              <div className="mt-10 bg-surface border border-line rounded-3xl shadow-soft p-10 text-center animate-scale-in">
                <div className="flex justify-center animate-floaty"><HexLogo size={56} /></div>
                <p className="mt-5 text-body">Connect your wallet to see the names you own.</p>
                <button onClick={connect} disabled={busy} className="mt-5 px-6 py-3 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">{busy ? "Connecting…" : "Connect Wallet"}</button>
              </div>
            ) : busy && owned === null ? (
              <div className="mt-8 text-muted text-sm animate-fade-in">Loading your names…</div>
            ) : (
              <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stuck.map((m) => (
                  <button key={`f-${m.name}`} onClick={() => setSel({ name: m.name, kind: "failed" })}
                    className="text-left bg-surface border border-ergo-500/40 rounded-3xl shadow-soft overflow-hidden hover:-translate-y-0.5 transition animate-fade-up">
                    <div className="aspect-[16/10] relative"><HexArt name={m.name} className="w-full h-full opacity-60" />
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-ergo-500 text-white text-[11px] font-semibold">Needs recovery</span></div>
                    <div className="p-4"><div className="text-ink text-lg truncate"><span className="text-ergo-500">~</span>{m.name}</div>
                      <div className="text-muted text-xs">{(m.revealValue / 1e9).toFixed(4)} ERG recoverable →</div></div>
                  </button>
                ))}
                {minting.map((n) => (
                  <button key={`m-${n}`} onClick={() => setSel({ name: n, kind: "minting" })}
                    className="text-left bg-surface border border-line rounded-3xl shadow-soft overflow-hidden hover:-translate-y-0.5 transition animate-fade-up">
                    <div className="aspect-[16/10] relative"><HexArt name={n} className="w-full h-full opacity-70" />
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#0B0D16] text-white text-[11px] font-semibold flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ergo-500 animate-pulse" />Minting</span></div>
                    <div className="p-4"><div className="text-ink text-lg truncate"><span className="text-ergo-500">~</span>{n}</div>
                      <div className="text-muted text-xs">In progress · tap for status →</div></div>
                  </button>
                ))}
                {(owned || []).map((n, i) => (
                  <button key={n.tokenId} onClick={() => setSel({ name: n.name, kind: "minted" })}
                    className="text-left bg-surface border border-line rounded-3xl shadow-soft overflow-hidden hover:-translate-y-0.5 transition animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="aspect-[16/10] relative"><HexArt name={n.name} className="w-full h-full" />
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-mint/90 text-[#06301d] text-[11px] font-semibold">Owned</span></div>
                    <div className="p-4"><div className="text-ink text-lg truncate"><span className="text-ergo-500">~</span>{n.name}</div>
                      <div className="text-muted text-xs truncate">tap for details →</div></div>
                  </button>
                ))}
                {owned !== null && owned.length === 0 && minting.length === 0 && stuck.length === 0 && (
                  <div className="col-span-full bg-surface border border-line rounded-3xl shadow-soft p-10 text-center animate-scale-in">
                    <p className="text-body">You don&apos;t own any ErgoNames yet.</p>
                    <Link href="/mint" className="inline-block mt-4 px-6 py-3 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition">Register your first name</Link>
                  </div>
                )}
              </div>
            )}
            {/* Dust recovery: orphaned commit boxes from failed/duplicate
                attempts. One signed tx per box — the contract demands exactly
                [your payout, miner fee] per refund. */}
            {!sel && dust.length > 0 && (
              <div className="mt-8 bg-surface border border-line rounded-3xl shadow-soft p-6 animate-fade-up">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-ink font-semibold">Recoverable dust</h3>
                    <p className="text-muted text-sm mt-1.5">
                      Leftover deposits from registration attempts that never completed — they become refundable
                      ~24 hours after the attempt. The contract requires one signed transaction per box, so
                      &quot;Recover all&quot; will ask your wallet to approve each in sequence.
                    </p>
                  </div>
                  {dust.length > 1 && (
                    <button
                      disabled={dustBusy !== ""}
                      onClick={async () => {
                        setDustMsg("");
                        let ok = 0, fail = 0;
                        for (const d of [...dust]) {
                          setDustBusy(d.boxId);
                          try {
                            await refundCommit(d.boxId, address);
                            setDust((ds) => ds.filter((x) => x.boxId !== d.boxId));
                            ok++;
                          } catch { fail++; }
                        }
                        setDustBusy("");
                        setDustMsg(fail === 0 ? `All ${ok} refunds sent 🎉` : `${ok} sent, ${fail} failed or declined — the rest stay listed.`);
                      }}
                      className="shrink-0 px-4 py-2 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white text-sm font-semibold transition disabled:opacity-50">
                      {dustBusy ? "Signing…" : `Recover all (${(dust.reduce((s, d) => s + d.refundNanoErg, 0) / 1e9).toFixed(4)} ERG)`}
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-col gap-2.5">
                  {dust.map((d) => (
                    <div key={d.boxId} className="flex items-center justify-between gap-3 bg-raised rounded-2xl px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-ink text-sm font-mono truncate">{d.boxId.slice(0, 10)}…{d.boxId.slice(-6)}</div>
                        <div className="text-muted text-xs">recovers {(d.refundNanoErg / 1e9).toFixed(4)} ERG · {d.ageBlocks.toLocaleString()} blocks old</div>
                      </div>
                      <button
                        disabled={dustBusy !== ""}
                        onClick={async () => {
                          setDustBusy(d.boxId); setDustMsg("");
                          try {
                            const tx = await refundCommit(d.boxId, address);
                            setDust((ds) => ds.filter((x) => x.boxId !== d.boxId));
                            setDustMsg(`Refund sent — tx ${tx.slice(0, 12)}…`);
                          } catch (e) { setDustMsg(e.message ?? String(e)); }
                          setDustBusy("");
                        }}
                        className="shrink-0 px-4 py-2 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white text-sm font-semibold transition disabled:opacity-50">
                        {dustBusy === d.boxId ? "Signing…" : "Recover"}
                      </button>
                    </div>
                  ))}
                </div>
                {dustMsg && <p className={`mt-3 text-sm ${dustMsg.startsWith("Refund sent") ? "text-mint" : "text-red-500"}`}>{dustMsg}</p>}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
