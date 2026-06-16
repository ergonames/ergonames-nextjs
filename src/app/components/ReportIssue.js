"use client";
import { useState, useEffect, useCallback } from "react";
import { reportIssue } from "../lib/ergonames";

// App-wide "Report an issue" affordance: a floating pill that opens a themed
// modal form. The form POSTs to the bot's /report endpoint, which forwards it
// to the team's Discord channel — the webhook URL never reaches the browser.
//
// Mounted once in the root layout, so it appears on every page. Any element
// can also open it by dispatching window.dispatchEvent(new Event(OPEN_EVENT))
// (e.g. the landing-page footer link), without sharing React state.

export const OPEN_EVENT = "ergonames:open-report";

const CATEGORIES = [
  ["bug", "Something's broken"],
  ["mint", "Minting / registration"],
  ["wallet", "Wallet connection"],
  ["resolution", "Name resolution"],
  ["art", "NFT artwork"],
  ["ui", "Website / design"],
  ["suggestion", "Feature suggestion"],
  ["other", "Something else"],
];

export default function ReportIssue() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [trap, setTrap] = useState(""); // honeypot — humans never fill this
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const close = useCallback(() => setOpen(false), []);

  // Open via the global event (footer link, anywhere) + close on Escape.
  useEffect(() => {
    const onOpen = () => { setSent(false); setErr(""); setOpen(true); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener(OPEN_EVENT, onOpen); window.removeEventListener("keydown", onKey); };
  }, []);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const submit = async () => {
    if (!message.trim()) { setErr("Please describe the issue."); return; }
    if (trap.trim()) { setSent(true); return; } // silently swallow bots
    setBusy(true); setErr("");
    const page = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
    try {
      await reportIssue({ category, message: message.trim(), contact: contact.trim(), page, website: trap });
      setSent(true);
      setMessage(""); setContact(""); setCategory("bug");
    } catch (e) {
      setErr(e?.message ?? "Couldn't send the report. Please try again.");
    }
    setBusy(false);
  };

  return (
    <>
      <button
        onClick={() => { setSent(false); setErr(""); setOpen(true); }}
        aria-label="Report an issue"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full
                   bg-surface border border-line shadow-soft text-body
                   hover:text-ink hover:border-ergo-500/50 hover:-translate-y-0.5 transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ergo-500">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="text-sm font-medium hidden sm:block">Report an issue</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
          role="dialog" aria-modal="true" aria-label="Report an issue"
        >
          <div className="w-full sm:max-w-lg bg-surface border border-line sm:rounded-3xl rounded-t-3xl shadow-soft p-6 sm:p-7 animate-scale-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl text-ink font-semibold">Report an issue</h2>
                <p className="text-muted text-sm mt-1">Found a bug or have a suggestion? It goes straight to the team.</p>
              </div>
              <button onClick={close} aria-label="Close"
                className="shrink-0 h-9 w-9 rounded-full border border-line text-muted hover:text-ink hover:border-muted transition flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {sent ? (
              <div className="mt-6 p-5 rounded-2xl bg-mint/10 border border-mint/30 text-center">
                <div className="text-mint text-3xl">✓</div>
                <p className="text-ink font-medium mt-2">Thanks — report sent!</p>
                <p className="text-muted text-sm mt-1">We read every report. If you left a contact, we may follow up.</p>
                <button onClick={close} className="mt-4 px-5 py-2.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold text-sm transition">Done</button>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-3.5">
                <div>
                  <label className="text-muted text-xs">What's it about?</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="mt-1.5 w-full px-4 py-3 rounded-2xl bg-raised border border-line text-ink text-sm focus:outline-none focus:border-ergo-500/50 appearance-none">
                    {CATEGORIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-muted text-xs">Describe it</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1500} rows={5}
                    placeholder="What happened? What did you expect? Steps to reproduce help a lot."
                    className="mt-1.5 w-full px-4 py-3 rounded-2xl bg-raised border border-line text-ink text-sm placeholder:text-muted/70 focus:outline-none focus:border-ergo-500/50 resize-y" />
                  <div className="text-right text-muted text-[11px] mt-1">{message.length}/1500</div>
                </div>

                <div>
                  <label className="text-muted text-xs">Contact <span className="opacity-70">(optional)</span></label>
                  <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200}
                    placeholder="Discord / X handle or email — so we can follow up"
                    className="mt-1.5 w-full px-4 py-3 rounded-2xl bg-raised border border-line text-ink text-sm placeholder:text-muted/70 focus:outline-none focus:border-ergo-500/50" />
                </div>

                {/* Honeypot: visually hidden, off the tab order. Bots fill it; humans don't. */}
                <input type="text" value={trap} onChange={(e) => setTrap(e.target.value)}
                  name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />

                {err && <p className="text-red-500 text-sm">{err}</p>}

                <button onClick={submit} disabled={busy || !message.trim()}
                  className="mt-1 py-3.5 rounded-2xl bg-ergo-500 hover:bg-ergo-600 text-white font-semibold transition disabled:opacity-50">
                  {busy ? "Sending…" : "Send report"}</button>
                <p className="text-muted text-[11px] text-center">Don't include passwords, seed phrases, or private keys.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
