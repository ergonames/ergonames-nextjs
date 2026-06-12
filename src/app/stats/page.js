"use client";
import { useState, useEffect } from "react";
import { getStats, getQuote, txLink } from "../lib/ergonames";
import HexLogo from "../components/HexLogo";
import ThemeToggle from "../components/ThemeToggle";
import Link from "next/link";

function Avatar({ seed, size = 40 }) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return <span style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${h} 90% 62%), hsl(${(h + 50) % 360} 90% 55%))` }} className="rounded-full shrink-0" />;
}

const fmtDay = (ms) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtDate = (ms) => ms ? new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

function StatCard({ label, value, hint }) {
  return (
    <div className="bg-surface border border-line rounded-3xl shadow-soft p-6">
      <div className="text-muted text-sm">{label}</div>
      <div className="text-ink text-3xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-muted text-xs mt-1">{hint}</div>}
    </div>
  );
}

// Last-30-days activity as simple CSS bars (no chart dependency).
function ActivityChart({ perDay }) {
  const DAYS = 30;
  const day = 86400000;
  const today = Math.floor(Date.now() / day) * day;
  const byDay = new Map(perDay.map((d) => [d.dayStartMs, d.count]));
  const series = Array.from({ length: DAYS }, (_, i) => {
    const start = today - (DAYS - 1 - i) * day;
    return { start, count: byDay.get(start) ?? 0 };
  });
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <div>
      <div className="flex items-end gap-[3px] h-36">
        {series.map((s) => (
          <div key={s.start} className="flex-1 h-full flex flex-col justify-end group relative">
            <div
              className={`rounded-t ${s.count > 0 ? "bg-ergo-500" : "bg-raised"}`}
              style={{ height: `${Math.max(s.count > 0 ? 8 : 3, (s.count / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-ink text-surface text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
              {fmtDay(s.start)}: {s.count}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-muted text-xs mt-2">
        <span>{fmtDay(series[0].start)}</span>
        <span>{fmtDay(series[DAYS - 1].start)}</span>
      </div>
    </div>
  );
}

function LengthBars({ dist }) {
  const max = Math.max(1, ...dist.map((d) => d.count));
  return (
    <div className="flex flex-col gap-2">
      {dist.map((d) => (
        <div key={d.length} className="flex items-center gap-3">
          <span className="text-muted text-sm w-16 shrink-0">{d.length} chars</span>
          <div className="flex-1 h-5 bg-raised rounded-full overflow-hidden">
            <div className="h-full bg-ergo-500 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
          <span className="text-ink text-sm w-8 text-right shrink-0">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// Collapse the cents price map into tiers (consecutive lengths with the same
// price), e.g. 1 / 2 / 3 / 4–7 / 8+.
function priceTiers(cents) {
  const tiers = [];
  // Index 0 is unused (a 0-char name); the last entry covers all longer names.
  for (let len = 1; len < cents.length; len++) {
    const price = cents[Math.min(len, cents.length - 1)];
    const last = tiers[tiers.length - 1];
    if (last && last.price === price) last.to = len;
    else tiers.push({ from: len, to: len, price });
  }
  if (tiers.length > 0) tiers[tiers.length - 1].open = true;
  return tiers;
}

export default function StatsPage() {
  const [stats, setStats] = useState(undefined); // undefined = loading, null = failed
  const [rate, setRate] = useState(null); // nanoErg per USD

  useEffect(() => {
    getStats().then(setStats);
    getQuote("ergonames").then((q) => q && setRate(q.nanoErgPerUsd));
  }, []);

  const ergUsd = rate ? 1e9 / rate : null;
  const usdToErg = (usd) => (rate ? `${((usd * rate) / 1e9).toFixed(3)} ERG` : null);

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
            <Link href="/records" className="text-sm text-white/70 hover:text-white transition hidden sm:block">My Names</Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-24">
        <h1 className="text-ink text-3xl font-semibold">Statistics</h1>
        <p className="text-muted mt-1">Live numbers from the on-chain ErgoNames registry.</p>

        {stats === undefined && <p className="text-muted mt-10">Loading…</p>}
        {stats === null && <p className="text-muted mt-10">Statistics are temporarily unavailable. Try again in a moment.</p>}

        {stats && (
          <div className="mt-8 flex flex-col gap-6 animate-fade-up">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Names registered" value={stats.totalNames} />
              <StatCard label="Unique minters" value={stats.uniqueMinters} />
              <StatCard label="Last 7 days" value={stats.last7Days} hint={`${stats.last24Hours} in the last 24h`} />
              <StatCard label="ERG / USD" value={ergUsd ? `$${ergUsd.toFixed(2)}` : "—"} hint="live oracle rate" />
            </div>

            <div className="bg-surface border border-line rounded-3xl shadow-soft p-6">
              <h2 className="text-ink font-semibold text-lg">Registrations — last 30 days</h2>
              <div className="mt-4"><ActivityChart perDay={stats.perDay} /></div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-surface border border-line rounded-3xl shadow-soft p-6">
                <h2 className="text-ink font-semibold text-lg">Name lengths</h2>
                <div className="mt-4"><LengthBars dist={stats.lengthDistribution} /></div>
              </div>

              <div className="bg-surface border border-line rounded-3xl shadow-soft p-6">
                <h2 className="text-ink font-semibold text-lg">Current pricing</h2>
                <p className="text-muted text-xs mt-1">Set on-chain; converted with the live ERG/USD oracle at mint time.</p>
                <div className="mt-3">
                  {priceTiers(stats.priceMapCents).map((t) => (
                    <div key={t.from} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                      <span className="text-body text-sm">
                        {t.from === t.to && !t.open ? `${t.from} characters` : t.open ? `${t.from}+ characters` : `${t.from}–${t.to} characters`}
                      </span>
                      <span className="text-right">
                        <span className="text-ink text-sm font-medium">${(t.price / 100).toFixed(2)}</span>
                        {usdToErg(t.price / 100) && <span className="text-muted text-xs ml-2">≈ {usdToErg(t.price / 100)}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-3xl shadow-soft p-6">
              <h2 className="text-ink font-semibold text-lg">Latest registrations</h2>
              <div className="mt-2">
                {stats.latest.map((r) => (
                  <div key={r.tokenId} className="flex items-center gap-4 py-3 border-b border-line last:border-0">
                    <Avatar seed={r.name} />
                    <div className="flex-1 min-w-0">
                      <div className="text-ink font-medium truncate"><span className="text-ergo-500">~</span>{r.name}</div>
                      <div className="text-muted text-xs">#{r.registrationNumber} · {fmtDate(r.timestampRegistered)}</div>
                    </div>
                    <a href={txLink(r.mintTransactionId)} target="_blank" rel="noreferrer" className="text-ergo-500 underline text-sm shrink-0">tx ↗</a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
