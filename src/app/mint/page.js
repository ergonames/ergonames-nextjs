"use client";
import { useState } from "react";
import { resolveName, mintErgoName } from "../lib/ergonames";

export default function MintPage() {
  const [name, setName] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const check = async () => {
    setResult(null);
    setStatus("");
    const clean = name.trim().replace(/^~/, "");
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(clean)) {
      setResult({ error: "Names are 1-25 chars: letters, numbers, underscore." });
      return;
    }
    setBusy(true);
    try {
      setResult(await resolveName(clean));
    } catch (e) {
      setResult({ error: String(e) });
    }
    setBusy(false);
  };

  const mint = async () => {
    setBusy(true);
    try {
      const { commitTxId } = await mintErgoName(name.trim().replace(/^~/, ""), setStatus);
      setStatus(`Registration submitted (commit ${commitTxId.slice(0, 10)}...). ` +
        `Your ErgoName will appear once the bot completes it.`);
    } catch (e) {
      setStatus(`Error: ${e.message ?? e}`);
    }
    setBusy(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-black text-white">
      <h1 className="text-4xl font-bold">
        <span className="text-orange-500">~</span>ErgoNames
      </h1>
      <p className="opacity-70">Register your name on Ergo.</p>

      <div className="flex gap-2 w-full max-w-md">
        <span className="self-center text-orange-500 text-2xl font-bold">~</span>
        <input
          className="flex-1 px-4 py-2 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-orange-500"
          placeholder="yourname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
        />
        <button
          className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 font-semibold disabled:opacity-50"
          onClick={check}
          disabled={busy}
        >
          Check
        </button>
      </div>

      {result?.error && <p className="text-red-400">{result.error}</p>}

      {result && !result.error && result.isValid && (
        <div className="w-full max-w-md p-6 rounded bg-zinc-900 border border-zinc-700 flex flex-col gap-3">
          {result.isAvailable ? (
            <>
              <p className="text-green-400 text-lg">
                ~{name.trim().replace(/^~/, "")} is available
              </p>
              <p className="opacity-70">Price: ${result.mintCost} in ERG</p>
              <button
                className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 font-semibold disabled:opacity-50"
                onClick={mint}
                disabled={busy}
              >
                Register with Nautilus
              </button>
            </>
          ) : (
            <>
              <p className="text-zinc-300 text-lg">~{result.ergoname} is taken</p>
              {result.owner && (
                <p className="opacity-70 break-all text-sm">Owner: {result.owner}</p>
              )}
            </>
          )}
        </div>
      )}

      {status && <p className="opacity-80 max-w-md text-center">{status}</p>}
    </main>
  );
}
