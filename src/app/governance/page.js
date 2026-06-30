"use client";
import { useState, useEffect, useCallback } from "react";
import {
  govLogin, govListProposals, govCreateProposal, govGetProposal,
} from "../lib/ergonames";
import HexLogo from "../components/HexLogo";
import ThemeToggle from "../components/ThemeToggle";
import Link from "next/link";

// Team governance dashboard. Gated behind a wallet-signature auth wall: only
// the multisig founders (the configured signer set) can sign in. Phase 1/2 —
// authenticate, browse + create proposals. Signing a proposal to threshold and
// publishing it on-chain arrive with the genesis contracts (Phase 3).

const SESSION_KEY = "ergonames_gov_session";
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const ACTION_LABEL = { "update-pricing": "Update pricing", "migrate-registry": "Migrate registry" };
const actionLabel = (a) => ACTION_LABEL[a] ?? a;
const fmtDate = (ms) => new Date(Number(ms)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function StatusPill({ status }) {
  const map = {
    open: "bg-ergo-500/10 text-ergo-400 border-ergo-500/30",
    published: "bg-mint/10 text-mint border-mint/30",
    cancelled: "bg-muted/10 text-muted border-line",
  };
  return <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wide ${map[status] ?? map.cancelled}`}>{status}</span>;
}

function Progress({ count, threshold }) {
  const pct = Math.min(100, (count / Math.max(1, threshold)) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
        <div className="h-full bg-ergo-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted tabular-nums">{count}/{threshold}</span>
    </div>
  );
}

// ── New-proposal form ───────────────────────────────────────────────────────
function NewProposal({ token, actions, onCreated, onCancel }) {
  const [action, setAction] = useState(actions[0] ?? "update-pricing");
  const [description, setDescription] = useState("");
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    let unsignedTx;
    try {
      unsignedTx = JSON.parse(raw);
    } catch {
      setErr("The unsigned transaction isn't valid JSON. Paste the bot's --unsigned output exactly.");
      return;
    }
    if (!unsignedTx || !Array.isArray(unsignedTx.inputs) || !Array.isArray(unsignedTx.outputs)) {
      setErr("That JSON doesn't look like an unsigned tx (needs inputs[] and outputs[]).");
      return;
    }
    setBusy(true);
    try {
      await govCreateProposal(token, { action, description: description.trim(), unsignedTx });
      onCreated();
    } catch (e) {
      setErr(String(e.message) === "SESSION_EXPIRED" ? "Your session expired — sign in again." : (e.message ?? String(e)));
    }
    setBusy(false);
  };

  return (
    <div className="bg-surface border border-line rounded-3xl shadow-soft p-6 sm:p-8 animate-fade-up">
      <h2 className="text-xl text-ink font-semibold">New proposal</h2>
      <p className="mt-1 text-muted text-sm">
        Generate the unsigned transaction with the bot
        (<code className="text-ergo-400">--update-pricing --unsigned --out p.json</code>) and paste it here for the signers to review.
      </p>

      <label className="block mt-6 text-sm text-body font-medium">Action</label>
      <select value={action} onChange={(e) => setAction(e.target.value)}
        className="mt-2 w-full bg-raised border border-line rounded-2xl px-4 py-3 text-ink focus:outline-none focus:border-ergo-500">
        {actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
      </select>

      <label className="block mt-5 text-sm text-body font-medium">Description <span className="text-muted font-normal">(what + why, for the other signers)</span></label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
        placeholder="e.g. Lower 4-letter names to $8 per the June pricing vote"
        className="mt-2 w-full bg-raised border border-line rounded-2xl px-4 py-3 text-ink placeholder:text-muted focus:outline-none focus:border-ergo-500" />

      <label className="block mt-5 text-sm text-body font-medium">Unsigned transaction (JSON)</label>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} spellCheck={false}
        placeholder='{"id":"…","inputs":[…],"dataInputs":[],"outputs":[…]}'
        className="mt-2 w-full bg-raised border border-line rounded-2xl px-4 py-3 text-ink font-mono text-xs placeholder:text-muted focus:outline-none focus:border-ergo-500 resize-y" />

      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}

      <div className="mt-6 flex gap-3">
        <button onClick={submit} disabled={busy || !raw.trim()}
          className="px-5 py-3 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">
          {busy ? "Creating…" : "Create proposal"}
        </button>
        <button onClick={onCancel} disabled={busy}
          className="px-5 py-3 rounded-2xl border border-line text-body hover:text-ink transition disabled:opacity-50">Cancel</button>
      </div>
    </div>
  );
}

// ── Proposal detail ─────────────────────────────────────────────────────────
function ProposalDetail({ token, id, signerAddress, onBack, onExpired }) {
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    govGetProposal(token, id)
      .then((d) => live && setP(d))
      .catch((e) => {
        if (!live) return;
        if (String(e.message) === "SESSION_EXPIRED") onExpired();
        else setErr(e.message ?? String(e));
      });
    return () => { live = false; };
  }, [token, id, onExpired]);

  if (err) return <div className="text-red-500 text-sm">{err}</div>;
  if (!p) return <div className="text-muted text-sm animate-pulse">Loading proposal…</div>;

  const signedSet = new Set((p.signatures ?? []).map((s) => s.signer));
  const inputs = p.unsignedTx?.inputs?.length ?? 0;
  const outputs = p.unsignedTx?.outputs?.length ?? 0;

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

        <div className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row k="Proposed by" v={short(p.createdBy)} mono />
          <Row k="Created" v={fmtDate(p.createdAt)} />
          <Row k="Signatures" v={`${p.signatures?.length ?? 0} of ${p.threshold} required`} />
          <Row k="Transaction" v={`${inputs} input${inputs === 1 ? "" : "s"}, ${outputs} output${outputs === 1 ? "" : "s"}`} />
        </div>

        {/* Signer roster — who has signed */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-body">Signers</h3>
          <div className="mt-2 grid sm:grid-cols-2 gap-2">
            {(p.signers ?? []).map((s) => {
              const signed = signedSet.has(s);
              const you = s === signerAddress;
              return (
                <div key={s} className="flex items-center justify-between gap-2 bg-raised border border-line rounded-2xl px-4 py-2.5">
                  <span className="font-mono text-sm text-ink truncate">{short(s)}{you && <span className="ml-1.5 text-ergo-400 text-xs">you</span>}</span>
                  <span className={`text-xs font-semibold ${signed ? "text-mint" : "text-muted"}`}>{signed ? "✓ signed" : "pending"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Raw unsigned tx, for signers to review before signing */}
        <details className="mt-6 group">
          <summary className="cursor-pointer text-sm text-ergo-400 hover:text-ergo-500 select-none">View raw unsigned transaction</summary>
          <pre className="mt-3 bg-raised border border-line rounded-2xl p-4 text-[11px] text-body overflow-auto max-h-80">{JSON.stringify(p.unsignedTx, null, 2)}</pre>
        </details>

        {/* Phase 3 — signing/publish lands with the genesis contracts */}
        {p.status === "published" ? (
          <div className="mt-6 p-4 rounded-2xl bg-mint/[0.08] border border-mint/30 text-sm text-body">
            Published on-chain{p.publishedTx ? <> — <a className="text-ergo-500 underline" target="_blank" rel="noreferrer" href={`https://explorer.ergoplatform.com/transactions/${p.publishedTx}`}>view transaction ↗</a></> : null}.
          </div>
        ) : (
          <div className="mt-6 p-4 rounded-2xl bg-raised border border-line text-sm text-muted">
            <span className="text-body font-medium">Signing &amp; publishing arrive with the genesis contracts.</span> Once the
            2-of-{p.threshold + 0} multisig is live in the registry, each signer will add their partial signature here, and the
            dashboard assembles + broadcasts the transaction when the threshold is met.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-line/60 last:border-0">
      <span className="text-muted">{k}</span>
      <span className={`text-ink text-right ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function GovernancePage() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null); // { token, address }
  const [proposals, setProposals] = useState([]);
  const [meta, setMeta] = useState({ threshold: 2, signers: [], actions: ["update-pricing", "migrate-registry"] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [view, setView] = useState("list"); // "list" | "new" | <proposalId>

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); if (s?.token) setSession(s); } catch {}
    setReady(true);
  }, []);

  const logout = useCallback((msg = "") => {
    setSession(null); setProposals([]); setView("list"); setErr(msg);
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  const loadProposals = useCallback(async (token) => {
    setBusy(true); setErr("");
    try {
      const r = await govListProposals(token);
      setProposals(r.proposals);
      setMeta((m) => ({ ...m, threshold: r.threshold, signers: r.signers }));
    } catch (e) {
      if (String(e.message) === "SESSION_EXPIRED") logout("Your session expired — sign in again.");
      else setErr(e.message ?? String(e));
    }
    setBusy(false);
  }, [logout]);

  useEffect(() => { if (session?.token) loadProposals(session.token); }, [session, loadProposals]);

  const authenticate = async () => {
    setErr(""); setAuthMsg(""); setBusy(true);
    try {
      const s = await govLogin(setAuthMsg);
      setSession(s);
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
    } catch (e) { setErr(e.message ?? String(e)); }
    setBusy(false); setAuthMsg("");
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
            {session
              ? <button onClick={() => logout()} className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/20 text-sm hover:border-white/40 transition"><span className="h-2 w-2 rounded-full bg-mint" /> {short(session.address)} · Sign out</button>
              : null}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-24">
        {!ready ? null : !session ? (
          // ── Auth gate ──
          <div className="max-w-md mx-auto text-center bg-surface border border-line rounded-3xl shadow-soft p-8 animate-fade-up">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-ergo-500/10 flex items-center justify-center"><HexLogo size={30} /></div>
            <h1 className="mt-5 text-2xl text-ink font-semibold">Team governance</h1>
            <p className="mt-2 text-muted text-sm">
              Restricted to the multisig founders. Authenticate by signing a one-time challenge
              with your founder wallet — no funds move, it only proves you hold a signer key.
            </p>
            <button onClick={authenticate} disabled={busy}
              className="mt-6 w-full py-3.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">
              {busy ? (authMsg || "Authenticating…") : "Authenticate with wallet"}
            </button>
            {err && <p className="mt-4 text-sm text-red-500">{err}</p>}
          </div>
        ) : view === "new" ? (
          <NewProposal token={session.token} actions={meta.actions}
            onCreated={() => { setView("list"); loadProposals(session.token); }}
            onCancel={() => setView("list")} />
        ) : view !== "list" ? (
          <ProposalDetail token={session.token} id={view} signerAddress={session.address}
            onBack={() => setView("list")} onExpired={() => logout("Your session expired — sign in again.")} />
        ) : (
          // ── Proposal list ──
          <>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl sm:text-4xl text-ink font-semibold tracking-tight animate-fade-up">Proposals</h1>
                <p className="mt-2 text-muted animate-fade-up" style={{ animationDelay: "60ms" }}>
                  {meta.threshold}-of-{meta.signers.length} multisig · any {meta.threshold} signers pass a proposal.
                </p>
              </div>
              <button onClick={() => setView("new")}
                className="px-5 py-2.5 rounded-full bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition">+ New proposal</button>
            </div>

            {err && <div className="mt-6 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">{err}</div>}

            <div className="mt-8 space-y-3">
              {busy && proposals.length === 0 && <div className="text-muted text-sm animate-pulse">Loading proposals…</div>}
              {!busy && proposals.length === 0 && (
                <div className="bg-surface border border-line rounded-3xl shadow-soft p-8 text-center">
                  <p className="text-ink font-medium">No proposals yet</p>
                  <p className="mt-1 text-muted text-sm">Create one from a bot <code className="text-ergo-400">--unsigned</code> transaction to get started.</p>
                </div>
              )}
              {proposals.map((p) => (
                <button key={p.id} onClick={() => setView(p.id)}
                  className="w-full text-left bg-surface border border-line rounded-3xl shadow-soft p-5 hover:border-ergo-500/40 transition flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-ink font-semibold">{actionLabel(p.action)}</span>
                      <StatusPill status={p.status} />
                    </div>
                    <p className="mt-1 text-muted text-sm truncate max-w-md">{p.description || "No description"}</p>
                    <p className="mt-1 text-muted text-xs">by {short(p.createdBy)} · {fmtDate(p.createdAt)}</p>
                  </div>
                  <Progress count={p.signatureCount} threshold={p.threshold} />
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
