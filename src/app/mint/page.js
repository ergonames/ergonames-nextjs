"use client";
import { useState, useRef } from "react";
import { resolveName, mintErgoName, getStatus, txLink } from "../lib/ergonames";

const STATE_COPY = {
  queued: "Queued — waiting for the registration bot…",
  revealing: "Revealing your registration on-chain…",
  registering: "Registering your name… (a few blocks)",
  registered: "Registered! 🎉",
  refunded: "Registration could not complete — your funds were refunded.",
  not_found: "Submitted — waiting for the bot to pick it up…",
};

export default function MintPage() {
  const [name, setName] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [tracked, setTracked] = useState(null); // {state, ...txids}
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  const clean = (n) => n.trim().replace(/^~/, "");

  const check = async () => {
    setResult(null); setStatus(""); setTracked(null);
    const c = clean(name);
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(c)) {
      setResult({ error: "Names are 1-25 chars: letters, numbers, underscore." });
      return;
    }
    // Testing phase: only 8+ character names can be registered.
    if (c.length < 8) {
      setResult({ error: "During the testing phase, only names with 8 or more characters can be registered." });
      return;
    }
    setBusy(true);
    try { setResult(await resolveName(c)); }
    catch (e) { setResult({ error: "Couldn't reach the name service. Try again." }); }
    setBusy(false);
  };

  const startTracking = (c) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = await getStatus(c);
        setTracked(s);
        if (s.state === "registered" || s.state === "refunded") {
          clearInterval(pollRef.current);
        }
      } catch {}
    }, 15000);
  };

  const mint = async () => {
    const c = clean(name);
    setBusy(true); setStatus(""); setTracked(null);
    try {
      await mintErgoName(c, setStatus);
      setStatus("");
      setTracked({ state: "not_found" });
      startTracking(c);
    } catch (e) {
      setStatus(`⚠️ ${e.message ?? e}`);
    }
    setBusy(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-black text-white">
      <div className="flex items-center gap-3">
        <h1 className="text-4xl font-bold"><span className="text-orange-500">~</span>ErgoNames</h1>
        <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500 text-orange-400 text-xs font-bold tracking-wider self-start mt-1">BETA</span>
      </div>
      <p className="opacity-70">Register your name on Ergo.</p>

      <div className="w-full max-w-md p-4 rounded bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 text-sm">
        <p className="font-semibold mb-1">⚠️ Testing phase — names are not permanent</p>
        <p className="opacity-90">
          ErgoNames is in beta. Names registered now are for testing and
          <span className="font-semibold"> may be purged before the public launch</span>.
          Do not rely on any name minted during this phase. Only names of 8+
          characters can be registered for now.
        </p>
      </div>

      <div className="flex gap-2 w-full max-w-md">
        <span className="self-center text-orange-500 text-2xl font-bold">~</span>
        <input
          className="flex-1 px-4 py-2 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-orange-500"
          placeholder="yourname" value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
        />
        <button className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 font-semibold disabled:opacity-50"
          onClick={check} disabled={busy}>Check</button>
      </div>

      {result?.error && <p className="text-red-400">{result.error}</p>}

      {result && !result.error && result.isValid && !tracked && (
        <div className="w-full max-w-md p-6 rounded bg-zinc-900 border border-zinc-700 flex flex-col gap-3">
          {result.isAvailable ? (
            <>
              <p className="text-green-400 text-lg">~{clean(name)} is available</p>
              <p className="opacity-70">Price: ${result.mintCost} in ERG</p>
              <button className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 font-semibold disabled:opacity-50"
                onClick={mint} disabled={busy}>
                {busy ? "Working…" : "Register with Nautilus"}
              </button>
            </>
          ) : (
            <>
              <p className="text-zinc-300 text-lg">~{result.ergoname} is taken</p>
              {result.owner && <p className="opacity-70 break-all text-sm">Owner: {result.owner}</p>}
            </>
          )}
        </div>
      )}

      {busy && status && <p className="opacity-80 max-w-md text-center">{status}</p>}
      {!busy && status && <p className="text-red-400 max-w-md text-center">{status}</p>}

      {tracked && (
        <div className="w-full max-w-md p-6 rounded bg-zinc-900 border border-zinc-700 flex flex-col gap-2 text-center">
          <p className={tracked.state === "registered" ? "text-green-400 text-lg"
            : tracked.state === "refunded" ? "text-yellow-400 text-lg" : "text-zinc-200"}>
            {STATE_COPY[tracked.state] ?? tracked.state}
          </p>
          {tracked.state === "registered" && (
            <p className="opacity-70 text-sm">~{clean(name)} is now yours.</p>
          )}
          {tracked.registerTxId && (
            <a className="text-orange-400 underline text-sm" target="_blank" rel="noreferrer"
              href={txLink(tracked.registerTxId)}>view registration tx</a>
          )}
          {tracked.refundTxId && (
            <a className="text-orange-400 underline text-sm" target="_blank" rel="noreferrer"
              href={txLink(tracked.refundTxId)}>view refund tx</a>
          )}
          {!["registered", "refunded"].includes(tracked.state) && (
            <p className="opacity-50 text-xs">You can close this page — registration continues on-chain.</p>
          )}
        </div>
      )}
    </main>
  );
}
