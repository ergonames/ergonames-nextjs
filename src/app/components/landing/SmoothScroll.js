"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// One rAF for the whole page: Lenis smooth scroll bridged into the GSAP ticker,
// so smoothing + every ScrollTrigger share a single clock. Yields to native
// momentum on touch; disabled entirely under prefers-reduced-motion (native
// scroll, ScrollTriggers still resolve to final state via the page's reveal CSS).
export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // ?nosmooth — opt out of Lenis (native scroll). Used for QA tooling that
    // can't capture a Lenis-scrolled viewport; harmless for everyone else.
    const noSmooth = typeof window !== "undefined" && window.location.search.includes("nosmooth");
    if (reduce || noSmooth) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false, // let iOS/Android use native momentum
    });

    lenis.on("scroll", ScrollTrigger.update);
    const onRaf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onRaf);
      lenis.destroy();
    };
  }, []);

  return null;
}
