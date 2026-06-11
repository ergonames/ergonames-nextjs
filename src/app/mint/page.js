"use client";
import { useState, useRef, useEffect } from "react";
import { resolveName, mintErgoName, connectWallet, getStatus, txLink, refundStuckMint } from "../lib/ergonames";

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
  const [tracked, setTracked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState(null);
  const [walletErr, setWalletErr] = useState("");
  const [detected, setDetected] = useState(null); // null=checking, true/false
  const pollRef = useRef(null);

  // Detect the Nautilus dApp connector. It can inject shortly after load, so
  // poll briefly before declaring it absent.
  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      if (typeof window !== "undefined" && window.ergoConnector?.nautilus) {
        setDetected(true);
        clearInterval(id);
      } else if (++tries > 6) {
        setDetected(false);
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  const clean = (n) => n.trim().replace(/^~/, "");
  const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  const [connectStep, setConnectStep] = useState("");
  const connect = async () => {
    setWalletErr(""); setConnectStep(""); setBusy(true);
    try {
      setAddress(await connectWallet(setConnectStep));
      setConnectStep("");
    } catch (e) {
      setWalletErr(e.message ?? String(e));
      setConnectStep("");
    }
    setBusy(false);
  };

  const check = async () => {
    setResult(null); setStatus(""); setTracked(null);
    const c = clean(name);
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(c)) {
      setResult({ error: "Names are 1-25 chars: letters, numbers, underscore." });
      return;
    }
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
        if (s.state === "registered" || s.state === "refunded") clearInterval(pollRef.current);
      } catch {}
    }, 15000);
  };

  const mint = async () => {
    const c = clean(name);
    setBusy(true); setStatus(""); setTracked(null);
    try {
      await mintErgoName(c, address, setStatus);
      setStatus("");
      setTracked({ state: "not_found" });
      startTracking(c);
    } catch (e) {
      setStatus(`⚠️ ${e.message ?? e}`);
    }
    setBusy(false);
  };

  const [recoverName, setRecoverName] = useState("");
  const [recoverMsg, setRecoverMsg] = useState("");
  const recover = async () => {
    if (!address) { setRecoverMsg("Connect your wallet first."); return; }
    setBusy(true); setRecoverMsg("");
    try {
      await refundStuckMint(clean(recoverName), setRecoverMsg);
    } catch (e) {
      setRecoverMsg(`⚠️ ${e.message ?? e}`);
    }
    setBusy(false);
  };

  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center">
      <header className="w-full flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold"><span className="text-orange-500">~</span>ErgoNames</span>
          <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500 text-orange-400 text-xs font-bold tracking-wider">BETA</span>
        </div>
        {address ? (
          <span className="text-sm px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700">{short(address)}</span>
        ) : (
          <button className="px-4 py-1.5 rounded bg-orange-500 hover:bg-orange-600 font-semibold disabled:opacity-50"
            onClick={connect} disabled={busy}>
            {busy ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </header>

      {detected === false && (
        <div className="w-full max-w-xl mt-4 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-300 text-sm text-center">
          Nautilus wallet was not detected in this browser. Install the{" "}
          <a className="underline" href="https://chromewebstore.google.com/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai" target="_blank" rel="noreferrer">Nautilus extension</a>, then reload this page.
        </div>
      )}
      {connectStep && (
        <div className="w-full max-w-xl mt-4 p-3 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm text-center">
          {connectStep}
        </div>
      )}
      {walletErr && (
        <div className="w-full max-w-xl mt-4 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-300 text-sm text-center">
          {walletErr}
        </div>
      )}

      <section className="flex flex-col items-center gap-6 px-8 py-16 w-full max-w-xl">
        <h1 className="text-5xl font-bold text-center">Claim your <span className="text-orange-500">~</span>name on Ergo</h1>

        <div className="w-full p-4 rounded bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 text-sm">
          <p className="font-semibold mb-1">⚠️ Testing phase — names are not permanent</p>
          <p className="opacity-90">
            ErgoNames is in beta. Names registered now are for testing and
            <span className="font-semibold"> may be purged before the public launch</span>.
            Do not rely on any name minted during this phase. Only names of 8+ characters can be registered for now.
          </p>
        </div>

        <div className="flex gap-2 w-full">
          <span className="self-center text-orange-500 text-2xl font-bold">~</span>
          <input
            className="flex-1 px-4 py-3 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-orange-500 text-lg"
            placeholder="yourname" value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && check()}
          />
          <button className="px-6 py-3 rounded bg-orange-500 hover:bg-orange-600 font-semibold disabled:opacity-50"
            onClick={check} disabled={busy}>Check</button>
        </div>

        {result?.error && <p className="text-red-400 text-center">{result.error}</p>}

        {result && !result.error && result.isValid && !tracked && (
          <div className="w-full p-6 rounded bg-zinc-900 border border-zinc-700 flex flex-col gap-3">
            {result.isAvailable ? (
              <>
                <p className="text-green-400 text-xl">~{clean(name)} is available</p>
                {!address ? (
                  <p className="opacity-70">Connect your wallet to register.</p>
                ) : (
                  <button className="px-4 py-3 rounded bg-orange-500 hover:bg-orange-600 font-semibold disabled:opacity-50"
                    onClick={mint} disabled={busy}>
                    {busy ? "Working…" : `Register ~${clean(name)}`}
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-zinc-300 text-xl">~{result.ergoname} is taken</p>
                {result.owner && <p className="opacity-70 break-all text-sm">Owner: {result.owner}</p>}
              </>
            )}
          </div>
        )}

        {busy && status && <p className="opacity-80 text-center">{status}</p>}
        {!busy && status && <p className="text-red-400 text-center">{status}</p>}

        <details className="w-full text-sm opacity-80">
          <summary className="cursor-pointer">Recover a stuck registration</summary>
          <div className="mt-3 flex flex-col gap-2">
            <p className="opacity-70">
              If a registration didn&apos;t complete, recover the funds back to your wallet.
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-orange-500"
                placeholder="name to recover" value={recoverName}
                onChange={(e) => setRecoverName(e.target.value)}
              />
              <button className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 font-semibold disabled:opacity-50"
                onClick={recover} disabled={busy || !recoverName}>Recover</button>
            </div>
            {recoverMsg && <p className="text-zinc-300">{recoverMsg}</p>}
          </div>
        </details>

        {tracked && (
          <div className="w-full p-6 rounded bg-zinc-900 border border-zinc-700 flex flex-col gap-2 text-center">
            <p className={tracked.state === "registered" ? "text-green-400 text-lg"
              : tracked.state === "refunded" ? "text-yellow-400 text-lg" : "text-zinc-200"}>
              {STATE_COPY[tracked.state] ?? tracked.state}
            </p>
            {tracked.registerTxId && (
              <a className="text-orange-400 underline text-sm" target="_blank" rel="noreferrer" href={txLink(tracked.registerTxId)}>view registration tx</a>
            )}
            {tracked.refundTxId && (
              <a className="text-orange-400 underline text-sm" target="_blank" rel="noreferrer" href={txLink(tracked.refundTxId)}>view refund tx</a>
            )}
            {!["registered", "refunded"].includes(tracked.state) && (
              <p className="opacity-50 text-xs">You can close this page — registration continues on-chain.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
