"use client";
import { useEffect, useRef } from "react";

// The mobile / low-power / reduced-motion / no-WebGL sibling of TildeWaveGL.
// NOT a degraded port — it's the SAME sine curve rendered as a single animated
// SVG <path> (plus a soft blurred twin for the bloom), driven by a light rAF
// updating `d`. Zero WebGL context, near-zero battery. Honours the same
// imperative controller API so the two data-bound moments — write-on-wave
// pulses and availability phase-lock — survive on phones.

const SEG = 96;
const VW = 1000, VH = 200;

export default function TildeWaveFallback({ controller }) {
  const coreRef = useRef(null);
  const glowRef = useRef(null);
  const beatRef = useRef(null);

  useEffect(() => {
    const core = coreRef.current, glow = glowRef.current, beat = beatRef.current;
    if (!core) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const pulses = [];
    let avail = "idle";
    let scrollP = 0;
    let beatT0 = -10;
    let started = 0;

    const setStroke = (c) => {
      core.setAttribute("stroke", c);
      glow?.setAttribute("stroke", c);
    };

    controller.current = {
      kind: "svg",
      pulse(xn = 0) {
        if (reduce) return;
        pulses.push({ t0: performance.now(), xn0: Math.max(-1, Math.min(1, xn)) });
        if (pulses.length > 12) pulses.shift();
      },
      setAvailability(s) {
        avail = s;
        setStroke(s === "available" ? "#1EF79C" : "#FF5638");
      },
      setScroll(p) {
        scrollP = Math.max(0, Math.min(1, p));
      },
      heartbeat() {
        if (reduce || !started) return;
        beatT0 = (performance.now() - started) / 1000;
      },
    };

    const build = (t) => {
      const flatten = 1 - 0.86 * scrollP;
      const baseA = VH * 0.30 * flatten;
      const breathe = avail === "available" ? 0.9 : 0.80 + 0.20 * Math.sin(t * 1.7);
      const harm = avail === "available" ? 0.12 : 0.28;
      let d = "";
      for (let i = 0; i < SEG; i++) {
        const xn = (i / (SEG - 1)) * 2 - 1;
        const x = (xn * 0.46 + 0.5) * VW;
        let y = VH / 2;
        y -= baseA * breathe * Math.sin(xn * Math.PI * 1.15 + t * 0.9);
        y -= baseA * harm * Math.sin(xn * Math.PI * 2.4 - t * 1.3);
        for (let k = 0; k < pulses.length; k++) {
          const p = pulses[k];
          const age = (t * 1000 - p.t0) / 1000;
          if (age < 0 || age > 0.6) continue;
          const dir = p.xn0 >= 0 ? 1 : -1;
          const pos = p.xn0 + dir * (age / 0.6) * 1.2;
          const dd = xn - pos;
          y -= VH * 0.26 * (1 - age / 0.6) * Math.exp(-(dd * dd) / (2 * 0.006));
        }
        d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
      }
      core.setAttribute("d", d);
      glow?.setAttribute("d", d);

      // green heartbeat dot riding the wave (one real registration)
      if (beat) {
        const bp = (t - beatT0) / 1.5;
        if (bp >= 0 && bp < 1) {
          const bxn = -0.94 + bp * 1.88;
          const bx = (bxn * 0.46 + 0.5) * VW;
          let by = VH / 2;
          by -= baseA * breathe * Math.sin(bxn * Math.PI * 1.15 + t * 0.9);
          by -= baseA * harm * Math.sin(bxn * Math.PI * 2.4 - t * 1.3);
          beat.setAttribute("cx", bx.toFixed(1));
          beat.setAttribute("cy", by.toFixed(1));
          beat.setAttribute("opacity", (Math.sin(bp * Math.PI)).toFixed(2));
        } else {
          beat.setAttribute("opacity", "0");
        }
      }
    };

    if (reduce) {
      build(0);
      return;
    }

    let raf = 0, onScreen = true, visible = true;
    const start = performance.now();
    started = start;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!onScreen || !visible) return;
      for (let k = pulses.length - 1; k >= 0; k--)
        if ((performance.now() - pulses[k].t0) / 1000 > 0.6) pulses.splice(k, 1);
      build((performance.now() - start) / 1000);
    };
    const host = core.ownerSVGElement || core;
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0 });
    io.observe(host);
    const onVis = () => { visible = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (controller.current?.kind === "svg")
        controller.current = { kind: "none", pulse() {}, setAvailability() {}, setScroll() {} };
    };
  }, [controller]);

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
    >
      <path ref={glowRef} fill="none" stroke="#FF7E64" strokeWidth="16" strokeLinecap="round"
        opacity="0.22" style={{ filter: "blur(7px)" }} />
      <path ref={coreRef} fill="none" stroke="#FF5638" strokeWidth="6" strokeLinecap="round" />
      <circle ref={beatRef} r="9" fill="#1EF79C" opacity="0" style={{ filter: "drop-shadow(0 0 7px #1EF79C)" }} />
    </svg>
  );
}
