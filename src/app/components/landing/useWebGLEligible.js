"use client";
import { useState, useEffect } from "react";

// Decides whether to mount the WebGL wave or the lightweight SVG sibling.
// Eligible = real desktop-ish width + enough cores/memory + WebGL present + not
// reduced-motion + not save-data. The fallback is the SAME visual language
// (the logo's sine curve), so an ineligible device gets a sibling, not a
// downgrade.
//
// Decided shortly after mount (once layout settles) so innerWidth is reliable
// on real devices — a phone correctly reports ~375 and gets the SVG path. Some
// embedded/headless contexts transiently report width 0; we treat an
// UNMEASURABLE width as "not narrow" (a measurement glitch, not a small screen)
// rather than forcing the fallback.
export default function useWebGLEligible() {
  const [eligible, setEligible] = useState(null); // null undecided | true | false
  useEffect(() => {
    let done = false;
    const decide = () => {
      try {
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
        if (navigator.connection?.saveData) return false;
        if ((navigator.hardwareConcurrency || 4) < 4) return false;
        if ((navigator.deviceMemory || 4) < 4) return false;
        const w = window.innerWidth || document.documentElement.clientWidth || 0;
        if (w > 0 && w < 768) return false; // real small screen → SVG sibling
        const c = document.createElement("canvas");
        const gl = c.getContext("webgl2") || c.getContext("webgl");
        if (!gl) return false;
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        return true;
      } catch {
        return false;
      }
    };
    // Let layout settle so innerWidth is trustworthy on real devices.
    const id = setTimeout(() => { if (!done) setEligible(decide()); }, 120);
    return () => { done = true; clearTimeout(id); };
  }, []);
  return eligible;
}
