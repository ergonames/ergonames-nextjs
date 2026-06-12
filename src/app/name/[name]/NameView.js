"use client";
import { useState, useEffect } from "react";
import { getNameStats, txLink, getOnChainArt, getRoyaltyPerMille } from "../../lib/ergonames";
import HexLogo from "../../components/HexLogo";
import NftCard from "../../components/NftCard";
import ThemeToggle from "../../components/ThemeToggle";
import Link from "next/link";

const EXPLORER = "https://explorer.ergoplatform.com";
const short = (a) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : "—");

function Stat({ k, v, mono, href }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-line last:border-0">
      <span className="text-muted text-sm shrink-0">{k}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={`text-ergo-500 underline text-sm ${mono ? "font-mono" : ""} truncate`}>{v}</a>
      ) : (
        <span className={`text-ink text-sm ${mono ? "font-mono" : ""} truncate max-w-[60%] text-right`}>{v}</span>
      )}
    </div>
  );
}

export default function NameView({ name }) {
  const [s, setS] = useState(null);
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [art, setArt] = useState(null);
  const [royalty, setRoyalty] = useState(null);

  useEffect(() => {
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(name)) { setErr(true); return; }
    getNameStats(name).then((r) => {
      setS(r);
      // For minted names show the REAL artwork from the chain (issuance box
      // R9) and the EIP-24 royalty from the issuer box.
      if (r?.tokenId) {
        getOnChainArt(r.tokenId).then(setArt);
        getRoyaltyPerMille(r.tokenId).then(setRoyalty);
      }
    }).catch(() => setErr(true));
  }, [name]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const registered = s && s.isAvailable === false;
  const reserved = s && s.isAvailable && s.isReserved;
  const available = s && s.isAvailable && !s.isReserved;
  const date = s?.timestampRegistered && Number(s.timestampRegistered) > 0
    ? new Date(Number(s.timestampRegistered)).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#0B0D16] text-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-[76px] flex items-center justify-between">
          <Link href="/mint" className="flex items-center gap-2">
            <HexLogo size={32} />
            <span className="text-lg tracking-wide"><b className="font-bold">ERGO</b><span className="font-light">NAMES</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/records" className="text-sm text-white/70 hover:text-white transition hidden sm:block">My Names</Link>
            <Link href="/stats" className="text-sm text-white/70 hover:text-white transition hidden sm:block">Stats</Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-24">
        {err && (
          <p className="text-center text-muted mt-12">That doesn&apos;t look like an ErgoName. <Link href="/mint" className="text-ergo-500 underline">Search for one →</Link></p>
        )}

        {!err && !s && <p className="text-center text-muted mt-12 animate-pulse">Loading ~{name}…</p>}

        {s && (
          <div className="animate-fade-up">
            <div className="bg-surface border border-line rounded-3xl shadow-soft overflow-hidden">
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-32 h-32 shrink-0 rounded-2xl overflow-hidden border border-line">
                  {art
                    ? <img src={art} alt={`~${name} on-chain artwork`} className="w-full h-full" />
                    : <NftCard name={name} className="w-full h-full" />}
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <h1 className="text-3xl sm:text-4xl text-ink font-semibold truncate"><span className="text-ergo-500">~</span>{name}</h1>
                  <div className="mt-2">
                    {registered && <span className="px-3 py-1 rounded-full bg-mint/15 text-mint text-sm font-semibold border border-mint/30">Registered{s.registrationNumber != null ? ` · #${s.registrationNumber}` : ""}</span>}
                    {reserved && <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-500 text-sm font-semibold border border-amber-500/30">Reserved</span>}
                    {available && <span className="px-3 py-1 rounded-full bg-mint/15 text-mint text-sm font-semibold border border-mint/30">Available</span>}
                  </div>
                  {registered && s.owner && <p className="mt-3 text-muted text-sm font-mono break-all">held by {short(s.owner)}</p>}
                </div>
                <button onClick={copyLink} className="sm:ml-auto shrink-0 px-4 py-2 rounded-full border border-line text-sm text-body hover:text-ink hover:border-ergo-500/50 transition">
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
              </div>

              {registered && (
                <div className="px-6 sm:px-8 pb-6">
                  <Stat k="Owner" v={s.owner ? short(s.owner) : "—"} mono href={s.owner ? `${EXPLORER}/addresses/${s.owner}` : undefined} />
                  <Stat k="Token" v={short(s.tokenId)} mono href={`${EXPLORER}/token/${s.tokenId}`} />
                  <Stat k="Mint transaction" v={short(s.mintTransactionId)} mono href={s.mintTransactionId ? txLink(s.mintTransactionId) : undefined} />
                  {date && <Stat k="Registered" v={date} />}
                  {s.registrationNumber != null && <Stat k="Registration #" v={String(s.registrationNumber)} />}
                  {royalty != null && <Stat k="Secondary royalty" v={`${(royalty / 10).toFixed(1)}%`} />}
                </div>
              )}

              {available && (
                <div className="px-6 sm:px-8 pb-8 text-center">
                  <p className="text-body text-sm mb-4">This name hasn&apos;t been claimed. It could be yours — forever.</p>
                  <Link href={`/mint?name=${name}`} className="inline-block px-8 py-3.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition">
                    Register ~{name}
                  </Link>
                </div>
              )}

              {reserved && (
                <div className="px-6 sm:px-8 pb-8 text-center">
                  <p className="text-body text-sm mb-4">Reserved for its rightful owner. If that&apos;s you, verification takes a minute.</p>
                  <Link href={`/mint?name=${name}`} className="inline-block px-8 py-3.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition">
                    Apply for verification
                  </Link>
                </div>
              )}
            </div>

            <p className="mt-6 text-center text-muted text-sm">
              One name for all your crypto addresses, on Ergo. <Link href="/mint" className="text-ergo-500 underline">Get yours →</Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
