"use client";
import dynamic from "next/dynamic";
import useWebGLEligible from "./useWebGLEligible";
import TildeWaveFallback from "./TildeWaveFallback";

// three.js stays out of the critical bundle — it loads only after the page
// paints, and only on eligible desktop GPUs. Until then (and on mobile / low
// power / reduced-motion / no-WebGL) the SVG sibling renders the same curve.
const TildeWaveGL = dynamic(() => import("./TildeWaveGL"), { ssr: false });

export default function LivingTilde({ controller }) {
  const eligible = useWebGLEligible(); // null (undecided) | true | false

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {eligible === true ? (
        <TildeWaveGL controller={controller} />
      ) : (
        // null + false both render the lightweight sibling immediately, so the
        // wave is alive from first paint with no blank flash and no layout shift.
        <TildeWaveFallback controller={controller} />
      )}
    </div>
  );
}
