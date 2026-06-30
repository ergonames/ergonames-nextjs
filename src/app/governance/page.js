"use client";
import { useState, useEffect, useCallback } from "react";
import {
  govAuth, govListProposals, govCreateProposal, govGetProposal, govMarkPublished, ergoPayUrl, getStats,
} from "../lib/ergonames";
import { QRCodeSVG } from "qrcode.react";
import HexLogo from "../components/HexLogo";
import ThemeToggle from "../components/ThemeToggle";
import Link from "next/link";

// Team governance dashboard. Access is gated by a shared team passphrase (the
// founder keys live in Minotaur, which can't sign a web login). The actual
// 2-of-4 signing happens in Minotaur: each proposal shows an ErgoPay QR the
// founders scan to load + sign + broadcast the governance transaction.

const SESSION_KEY = "ergonames_gov_session";
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const ACTION_LABEL = { "update-pricing": "Update pricing", "migrate-registry": "Migrate registry" };
const actionLabel = (a) => ACTION_LABEL[a] ?? a;
const fmtDate = (ms) => new Date(Number(ms)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const txLinkOf = (id) => `https://explorer.ergoplatform.com/transactions/${id}`;

function StatusPill({ status }) {
  const map = {
    open: "bg-ergo-500/10 text-ergo-400 border-ergo-500/30",
    published: "bg-mint/10 text-mint border-mint/30",
    cancelled: "bg-muted/10 text-muted border-line",
  };
  return <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wide ${map[status] ?? map.cancelled}`}>{status}</span>;
}

// ── New-proposal form (structured inputs — no CLI) ──────────────────────────
const lenLabel = (i, n) => (i === n - 1 ? `${i}+ chars` : `${i} chars`);

function NewProposal({ token, actions, onCreated, onCancel }) {
  const [action, setAction] = useState(actions[0] ?? "update-pricing");
  const [description, setDescription] = useState("");
  const [proposer, setProposer] = useState("");
  const [prices, setPrices] = useState(null); // USD strings per length-index
  const [reducedTx, setReducedTx] = useState(""); // advanced / operator
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Pre-fill the current price map when proposing a pricing change.
  useEffect(() => {
    if (action === "update-pricing" && prices === null) {
      getStats().then((s) => setPrices((s?.priceMapCents ?? []).map((c) => (c / 100).toString())))
        .catch(() => setPrices([]));
    }
  }, [action, prices]);

  const setPrice = (i, v) => setPrices((arr) => arr.map((p, j) => (j === i ? v : p)));

  const submit = async () => {
    setErr("");
    let params;
    if (action === "update-pricing") {
      if (!prices || prices.length === 0) { setErr("Couldn't load the current prices — reopen the form and try again."); return; }
      const cents = prices.map((p) => Math.round(parseFloat(p) * 100));
      if (cents.some((c) => !Number.isFinite(c) || c <= 0)) { setErr("Every price must be a positive dollar amount."); return; }
      params = { priceMapCents: cents };
    }
    setBusy(true);
    try {
      await govCreateProposal(token, {
        action, description: description.trim(), proposer: proposer.trim(),
        params, reducedTx: reducedTx.trim() || undefined,
      });
      onCreated();
    } catch (e) {
      setErr(String(e.message) === "SESSION_EXPIRED" ? "Your session expired — sign in again." : (e.message ?? String(e)));
    }
    setBusy(false);
  };

  const field = "mt-2 w-full bg-raised border border-line rounded-2xl px-4 py-3 text-ink placeholder:text-muted focus:outline-none focus:border-ergo-500";

  return (
    <div className="bg-surface border border-line rounded-3xl shadow-soft p-6 sm:p-8 animate-fade-up">
      <h2 className="text-xl text-ink font-semibold">New proposal</h2>
      <p className="mt-1 text-muted text-sm">Enter the change below — no command line. The signable transaction is generated from this for the founders to scan + sign in Minotaur (the on-chain 2-of-4 signing activates with the genesis contracts).</p>

      <label className="block mt-6 text-sm text-body font-medium">Action</label>
      <select value={action} onChange={(e) => setAction(e.target.value)} className={field}>
        {actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
      </select>

      {action === "update-pricing" ? (
        <div className="mt-5">
          <label className="block text-sm text-body font-medium">New price by name length <span className="text-muted font-normal">(USD)</span></label>
          {prices === null ? (
            <p className="mt-2 text-sm text-muted animate-pulse">Loading current prices…</p>
          ) : prices.length === 0 ? (
            <p className="mt-2 text-sm text-red-500">Couldn&apos;t load current prices. Close and reopen the form.</p>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {prices.map((p, i) => (
                  <label key={i} className="bg-raised border border-line rounded-2xl px-3 py-2 flex items-center gap-1.5">
                    <span className="text-xs text-muted w-14 shrink-0">{lenLabel(i, prices.length)}</span>
                    <span className="text-muted text-sm">$</span>
                    <input value={p} onChange={(e) => setPrice(i, e.target.value)} inputMode="decimal"
                      className="w-full bg-transparent text-ink text-sm focus:outline-none min-w-0" />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Pre-filled with the current prices — edit only what you want to change. The last row covers that length and longer.</p>
            </>
          )}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted bg-raised border border-line rounded-2xl px-4 py-3">Recreates the registry box identically — no parameters. (Escape-hatch / acceptance action.)</p>
      )}

      <label className="block mt-5 text-sm text-body font-medium">Description <span className="text-muted font-normal">(what + why)</span></label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
        placeholder="e.g. Lower 4-letter names to $8 per the June pricing vote" className={field} />

      <label className="block mt-5 text-sm text-body font-medium">Your name <span className="text-muted font-normal">(optional, for the board)</span></label>
      <input value={proposer} onChange={(e) => setProposer(e.target.value)} maxLength={60} placeholder="e.g. Adoo" className={field} />

      <details className="mt-5">
        <summary className="cursor-pointer text-sm text-muted hover:text-ink select-none">Advanced: paste a pre-built reduced transaction</summary>
        <textarea value={reducedTx} onChange={(e) => setReducedTx(e.target.value)} rows={4} spellCheck={false}
          placeholder="base64 reduced tx (operator path, or once the bot auto-build is wired)…" className={`${field} font-mono text-xs resize-y`} />
      </details>

      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}

      <div className="mt-6 flex gap-3">
        <button onClick={submit} disabled={busy} className="px-5 py-3 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">
          {busy ? "Creating…" : "Create proposal"}
        </button>
        <button onClick={onCancel} disabled={busy} className="px-5 py-3 rounded-2xl border border-line text-body hover:text-ink transition disabled:opacity-50">Cancel</button>
      </div>
    </div>
  );
}

// ── Proposal detail ─────────────────────────────────────────────────────────
function ProposalDetail({ token, id, onBack, onChanged, onExpired }) {
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const [txId, setTxId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    govGetProposal(token, id)
      .then(setP)
      .catch((e) => { if (String(e.message) === "SESSION_EXPIRED") onExpired(); else setErr(e.message ?? String(e)); });
  }, [token, id, onExpired]);
  useEffect(() => { load(); }, [load]);

  const markPublished = async () => {
    setErr(""); setBusy(true);
    try { await govMarkPublished(token, id, txId.trim()); setTxId(""); load(); onChanged?.(); }
    catch (e) { setErr(String(e.message) === "SESSION_EXPIRED" ? "Your session expired — sign in again." : (e.message ?? String(e))); }
    setBusy(false);
  };

  if (err) return <div className="text-red-500 text-sm">{err}</div>;
  if (!p) return <div className="text-muted text-sm animate-pulse">Loading proposal…</div>;

  const inputs = p.unsignedTx?.inputs?.length ?? 0;
  const outputs = p.unsignedTx?.outputs?.length ?? 0;
  const payUrl = ergoPayUrl(p.id);

  return (
    <div className="animate-fade-up">
      <button onClick={onBack} className="text-muted hover:text-ink transition text-sm mb-6">← Back to proposals</button>
      <div className="bg-surface border border-line rounded-3xl shadow-soft p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl text-ink font-semibold">{actionLabel(p.action)}</h2>
            <p className="mt-1 text-muted text-sm font-mono">{p.id}</p>
          </div>
          <StatusPill status={p.status} />
        </div>
        {p.description && <p className="mt-4 text-body">{p.description}</p>}

        {p.params?.priceMapCents && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-body">Proposed prices <span className="text-muted font-normal">(USD by name length)</span></h3>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {p.params.priceMapCents.map((c, i) => (
                <div key={i} className="bg-raised border border-line rounded-xl px-3 py-1.5 text-sm flex items-center justify-between gap-2">
                  <span className="text-muted text-xs">{lenLabel(i, p.params.priceMapCents.length)}</span>
                  <span className="text-ink">${(c / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row k="Proposed by" v={p.createdBy || "team"} />
          <Row k="Created" v={fmtDate(p.createdAt)} />
          <Row k="Approval" v={`${p.threshold}-of-${p.signers?.length ?? 0} multisig`} />
          {(inputs || outputs) ? <Row k="Transaction" v={`${inputs} in, ${outputs} out`} /> : null}
        </div>

        {/* Sign-in-Minotaur QR (the real 2-of-4 signing) */}
        {p.status !== "published" && (
          <div className="mt-6 bg-raised border border-line rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-body">Sign in Minotaur</h3>
            {p.hasReduced ? (
              <div className="mt-3 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                <div className="bg-white p-3 rounded-xl shrink-0">
                  <QRCodeSVG value={payUrl} size={180} bgColor="#ffffff" fgColor="#0B0D16" level="M" />
                </div>
                <div className="text-sm text-muted">
                  <p>Open <b className="text-ink">Minotaur → scan</b> and point it at this code. It loads the governance transaction; any <b className="text-ink">{p.threshold} of {p.signers?.length}</b> founders sign + broadcast it.</p>
                  <p className="mt-3 text-xs break-all">
                    <span className="text-body">Or paste this into Minotaur&apos;s scanner:</span><br />
                    <code className="text-ergo-400">{payUrl}</code>
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No signable transaction is attached yet. Add the bot&apos;s <code className="text-ergo-400">--reduced</code> output to this proposal to generate the QR.</p>
            )}
          </div>
        )}

        {/* Mark published once broadcast from Minotaur */}
        {p.status === "published" ? (
          <div className="mt-6 p-4 rounded-2xl bg-mint/[0.08] border border-mint/30 text-sm text-body">
            Published on-chain{p.publishedTx ? <> — <a className="text-ergo-500 underline" target="_blank" rel="noreferrer" href={txLinkOf(p.publishedTx)}>view transaction ↗</a></> : null}.
          </div>
        ) : (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-body">Already broadcast it?</h3>
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <input value={txId} onChange={(e) => setTxId(e.target.value)} placeholder="paste the transaction id from Minotaur"
                className="flex-1 bg-raised border border-line rounded-2xl px-4 py-2.5 text-ink font-mono text-xs placeholder:text-muted focus:outline-none focus:border-ergo-500" />
              <button onClick={markPublished} disabled={busy || !/^[0-9a-fA-F]{64}$/.test(txId.trim())}
                className="px-4 py-2.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition disabled:opacity-50 shrink-0">
                {busy ? "Saving…" : "Mark published"}
              </button>
            </div>
          </div>
        )}

        {p.unsignedTx && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-ergo-400 hover:text-ergo-500 select-none">View raw transaction</summary>
            <pre className="mt-3 bg-raised border border-line rounded-2xl p-4 text-[11px] text-body overflow-auto max-h-80">{JSON.stringify(p.unsignedTx, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-line/60 last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-ink text-right">{v}</span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function GovernancePage() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [proposals, setProposals] = useState([]);
  const [meta, setMeta] = useState({ threshold: 2, signers: [], actions: ["update-pricing", "migrate-registry"] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [view, setView] = useState("list"); // "list" | "new" | <proposalId>

  useEffect(() => {
    try { const t = localStorage.getItem(SESSION_KEY); if (t) setToken(t); } catch {}
    setReady(true);
  }, []);

  const logout = useCallback((msg = "") => {
    setToken(null); setProposals([]); setView("list"); setErr(msg); setPassphrase("");
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  const loadProposals = useCallback(async (t) => {
    setBusy(true); setErr("");
    try {
      const r = await govListProposals(t);
      setProposals(r.proposals);
      setMeta((m) => ({ ...m, threshold: r.threshold, signers: r.signers }));
    } catch (e) {
      if (String(e.message) === "SESSION_EXPIRED") logout("Your session expired — sign in again.");
      else setErr(e.message ?? String(e));
    }
    setBusy(false);
  }, [logout]);

  useEffect(() => { if (token) loadProposals(token); }, [token, loadProposals]);

  const authenticate = async (e) => {
    e?.preventDefault?.();
    setErr(""); setBusy(true);
    try {
      const { token: t } = await govAuth(passphrase);
      setToken(t);
      try { localStorage.setItem(SESSION_KEY, t); } catch {}
    } catch (e) {
      setErr(String(e.message).includes("incorrect") ? "Incorrect passphrase." : (e.message ?? String(e)));
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#0B0D16] text-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-[76px] flex items-center justify-between">
          <Link href="/mint" className="flex items-center gap-2">
            <HexLogo size={32} />
            <span className="text-lg tracking-wide"><b className="font-bold">ERGO</b><span className="font-light">NAMES</span></span>
            <span className="ml-1 px-2 py-0.5 rounded-full border border-white/25 text-white/70 text-[10px] font-bold tracking-widest">GOVERNANCE</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/mint" className="text-sm text-white/70 hover:text-white transition hidden sm:block">Register</Link>
            <Link href="/stats" className="text-sm text-white/70 hover:text-white transition hidden sm:block">Stats</Link>
            <ThemeToggle />
            {token ? <button onClick={() => logout()} className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/20 text-sm hover:border-white/40 transition"><span className="h-2 w-2 rounded-full bg-mint" /> Team · Sign out</button> : null}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-24">
        {!ready ? null : !token ? (
          // ── Passphrase gate ──
          <form onSubmit={authenticate} className="max-w-md mx-auto text-center bg-surface border border-line rounded-3xl shadow-soft p-8 animate-fade-up">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-ergo-500/10 flex items-center justify-center"><HexLogo size={30} /></div>
            <h1 className="mt-5 text-2xl text-ink font-semibold">Team governance</h1>
            <p className="mt-2 text-muted text-sm">Enter the shared team passphrase to access the governance board.</p>
            <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} autoFocus
              placeholder="Team passphrase"
              className="mt-6 w-full bg-raised border border-line rounded-2xl px-4 py-3 text-ink text-center placeholder:text-muted focus:outline-none focus:border-ergo-500" />
            <button type="submit" disabled={busy || !passphrase}
              className="mt-4 w-full py-3.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">
              {busy ? "Checking…" : "Enter"}
            </button>
            {err && <p className="mt-4 text-sm text-red-500">{err}</p>}
          </form>
        ) : view === "new" ? (
          <NewProposal token={token} actions={meta.actions}
            onCreated={() => { setView("list"); loadProposals(token); }}
            onCancel={() => setView("list")} />
        ) : view !== "list" ? (
          <ProposalDetail token={token} id={view}
            onBack={() => setView("list")} onChanged={() => loadProposals(token)}
            onExpired={() => logout("Your session expired — sign in again.")} />
        ) : (
          // ── Proposal list ──
          <>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl sm:text-4xl text-ink font-semibold tracking-tight animate-fade-up">Proposals</h1>
                <p className="mt-2 text-muted animate-fade-up" style={{ animationDelay: "60ms" }}>
                  {meta.threshold}-of-{meta.signers.length} multisig · sign in Minotaur, the board tracks it.
                </p>
              </div>
              <button onClick={() => setView("new")} className="px-5 py-2.5 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition">+ New proposal</button>
            </div>

            {err && <div className="mt-6 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">{err}</div>}

            <div className="mt-8 space-y-3">
              {busy && proposals.length === 0 && <div className="text-muted text-sm animate-pulse">Loading proposals…</div>}
              {!busy && proposals.length === 0 && (
                <div className="bg-surface border border-line rounded-3xl shadow-soft p-8 text-center">
                  <p className="text-ink font-medium">No proposals yet</p>
                  <p className="mt-1 text-muted text-sm">Create one from a bot transaction to get started.</p>
                </div>
              )}
              {proposals.map((p) => (
                <button key={p.id} onClick={() => setView(p.id)}
                  className="w-full text-left bg-surface border border-line rounded-3xl shadow-soft p-5 hover:border-ergo-500/40 transition flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-ink font-semibold">{actionLabel(p.action)}</span>
                      <StatusPill status={p.status} />
                      {p.hasReduced && p.status !== "published" && <span className="text-[11px] text-mint" title="Ready to sign in Minotaur">● signable</span>}
                    </div>
                    <p className="mt-1 text-muted text-sm truncate max-w-md">{p.description || "No description"}</p>
                    <p className="mt-1 text-muted text-xs">by {p.createdBy || "team"} · {fmtDate(p.createdAt)}</p>
                  </div>
                  <span className="text-muted text-sm">→</span>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
