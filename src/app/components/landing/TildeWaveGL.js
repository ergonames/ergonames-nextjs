"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

// THE LIVING TILDE — the ErgoNames logo is a sine wave, so the hero's one
// moving protagonist is a real, physically-felt orange sine line you write your
// name onto. Built as a three.js fat line whose ~200 points are recomputed on
// the CPU each frame (full control, no LineMaterial shader surgery): idle
// standing-wave breathing + a cursor displacement spring + per-keystroke
// travelling pulses + an availability tint + a scroll-driven flatten. Three
// stacked lines (wide faint → crisp core) give an earned additive bloom.
//
// Exposes an imperative API through `controller` (a useRef object the hero
// owns) so search/scroll never depend on React re-renders:
//   controller.current.pulse(xn)         inject a keystroke pulse at x∈[-1,1]
//   controller.current.setAvailability() "idle" | "available" | "taken"
//   controller.current.setScroll(p)      hero-exit progress 0→1 (flattens)

const SEG = 200;
const ORANGE = new THREE.Color("#FF5638");
const ORANGE_HI = new THREE.Color("#FF7E64");
const MINT = new THREE.Color("#1EF79C");

export default function TildeWaveGL({ controller }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let W = Math.max(1, mount.clientWidth);
    let H = Math.max(1, mount.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // context creation can still fail post-eligibility; fallback stays.
    }
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -100, 100);

    // One geometry, shared by the three stacked lines → a single per-frame update.
    const positions = new Float32Array(SEG * 3);
    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    const layerDefs = [
      { w: 30, o: 0.10, additive: true, base: ORANGE_HI }, // outer halo
      { w: 16, o: 0.24, additive: true, base: ORANGE_HI }, // inner glow
      { w: 9, o: 1.0, additive: false, base: ORANGE }, // crisp core
    ];
    const materials = layerDefs.map((d) => {
      const mat = new LineMaterial({
        color: d.base.clone(),
        linewidth: d.w,
        transparent: true,
        opacity: d.o,
        depthTest: false,
        blending: d.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      mat.resolution.set(W, H);
      const line = new Line2(geometry, mat);
      line.renderOrder = 1;
      scene.add(line);
      mat._baseColor = d.base;
      return mat;
    });

    // Green heartbeat dots — each one is a real mainnet registration riding the
    // wave left→right. Green ALWAYS means real/verified, never decoration.
    const DOT_LIFE = 1.5;
    const dotCoreGeo = new THREE.CircleGeometry(6, 18);
    const dotGlowGeo = new THREE.CircleGeometry(19, 24);
    const dots = [];
    for (let i = 0; i < 6; i++) {
      const grp = new THREE.Group();
      const glowMat = new THREE.MeshBasicMaterial({ color: MINT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, side: THREE.DoubleSide });
      const coreMat = new THREE.MeshBasicMaterial({ color: MINT, transparent: true, opacity: 0, depthTest: false, side: THREE.DoubleSide });
      grp.add(new THREE.Mesh(dotGlowGeo, glowMat));
      grp.add(new THREE.Mesh(dotCoreGeo, coreMat));
      grp.visible = false;
      grp.renderOrder = 3;
      scene.add(grp);
      dots.push({ grp, coreMat, glowMat, active: false, t0: 0 });
    }
    // Base (sine-only) wave height, shared by the line and the riding dots so
    // they track the same crest. Updated each frame by computeWave().
    let curBaseA = 0, curLock = 1, curHarm = 0.3;
    const baseWaveY = (xn, t) =>
      curBaseA * curLock * Math.sin(xn * Math.PI * 1.15 + t * 0.9) +
      curBaseA * curHarm * Math.sin(xn * Math.PI * 2.4 - t * 1.3);

    // ---- live state ---------------------------------------------------------
    let mouseX = 0, mouseTargetX = 0; // wave-space x of the cursor, springed
    let mouseAmp = 0, mouseTargetAmp = 0; // bump strength, springed
    let lastMove = -10;
    const pulses = []; // { t0, xn0, str }
    let scrollP = 0; // hero-exit flatten 0→1
    let availState = "idle"; // idle | available | taken
    let availMix = 0; // 0 idle → 1 fully available/taken, eased
    let noiseSeed = 0;

    // ---- imperative API the hero drives ------------------------------------
    controller.current = {
      kind: "gl",
      pulse(xn = 0, str = 1) {
        pulses.push({ t0: clock.getElapsedTime(), xn0: Math.max(-1, Math.min(1, xn)), str });
        if (pulses.length > 24) pulses.shift();
      },
      setAvailability(s) {
        availState = s;
        if (s === "taken") noiseSeed = Math.floor(clock.getElapsedTime() * 1000) % 997;
      },
      setScroll(p) {
        scrollP = Math.max(0, Math.min(1, p));
      },
      heartbeat() {
        const d = dots.find((x) => !x.active);
        if (d) { d.active = true; d.t0 = clock.getElapsedTime(); }
      },
    };

    // ---- input --------------------------------------------------------------
    const onPointer = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      if (r.width === 0) return;
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1; // -1..1
      mouseTargetX = nx;
      mouseTargetAmp = H * 0.16;
      lastMove = clock.getElapsedTime();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const onResize = () => {
      W = Math.max(1, mount.clientWidth);
      H = Math.max(1, mount.clientHeight);
      renderer.setSize(W, H);
      camera.left = -W / 2; camera.right = W / 2; camera.top = H / 2; camera.bottom = -H / 2;
      camera.updateProjectionMatrix();
      materials.forEach((m) => m.resolution.set(W, H));
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);
    window.addEventListener("resize", onResize);

    // ---- the wave -----------------------------------------------------------
    const clock = new THREE.Clock();
    const tmpColor = new THREE.Color();

    function frande(n) { const s = Math.sin(n * 127.1 + noiseSeed) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; }

    function computeWave(t) {
      // springs
      mouseX += (mouseTargetX - mouseX) * 0.15;
      if (t - lastMove > 0.18) mouseTargetAmp *= 0.86; // decay when cursor still
      mouseAmp += (mouseTargetAmp - mouseAmp) * 0.12;

      // availability ease toward target
      const targetMix = availState === "idle" ? 0 : 1;
      availMix += (targetMix - availMix) * 0.08;

      const flatten = 1 - 0.86 * scrollP; // wave collapses to the spine on exit
      const baseA = H * 0.22 * flatten;
      const breathe = 0.80 + 0.20 * Math.sin(t * 1.7);
      // available → crisp phase-lock (steady, less secondary chatter);
      // taken → decorrelated low-amplitude noise.
      const harmonics = availState === "available" ? 0.12 : 0.30;
      const lockSteady = availState === "available" ? (0.88 + 0.12 * Math.sin(t * 3.2)) : breathe;
      curBaseA = baseA; curLock = lockSteady; curHarm = harmonics;

      for (let i = 0; i < SEG; i++) {
        const xn = (i / (SEG - 1)) * 2 - 1; // -1..1
        const x = xn * (W * 0.46);
        let y = 0;
        y += baseA * lockSteady * Math.sin(xn * Math.PI * 1.15 + t * 0.9);
        y += baseA * harmonics * Math.sin(xn * Math.PI * 2.4 - t * 1.3);
        // taken: inject decorrelated noise that fades back as it resettles
        if (availState === "taken") y += availMix * baseA * 0.5 * frande(i * 3.3) * (0.4 + 0.6 * Math.sin(t * 5 + i));
        // cursor bump
        const dmx = xn - mouseX;
        y += mouseAmp * Math.exp(-(dmx * dmx) / (2 * 0.03));
        // keystroke pulses travel outward and decay
        for (let k = 0; k < pulses.length; k++) {
          const p = pulses[k];
          const age = t - p.t0;
          const life = 0.6;
          if (age > life) continue;
          const dir = p.xn0 >= 0 ? 1 : -1;
          const pos = p.xn0 + dir * (age / life) * 1.2;
          const d = xn - pos;
          y += p.str * H * 0.17 * (1 - age / life) * Math.exp(-(d * d) / (2 * 0.006));
        }
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = 0;
      }
      // prune dead pulses
      for (let k = pulses.length - 1; k >= 0; k--) if (t - pulses[k].t0 > 0.6) pulses.splice(k, 1);

      geometry.setPositions(positions);

      // tint the core toward mint on availability (green ALWAYS = real/verified)
      const wantGreen = availState === "available" ? availMix : 0;
      materials.forEach((m) => {
        tmpColor.copy(m._baseColor).lerp(MINT, wantGreen * 0.9);
        m.color.copy(tmpColor);
      });
    }

    function updateDots(t) {
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        if (!d.active) continue;
        const p = (t - d.t0) / DOT_LIFE;
        if (p >= 1) { d.active = false; d.grp.visible = false; continue; }
        const xn = -0.94 + p * 1.88;
        d.grp.position.set(xn * (W * 0.46), baseWaveY(xn, t), 0);
        const fade = Math.sin(p * Math.PI);
        d.coreMat.opacity = fade;
        d.glowMat.opacity = fade * 0.5;
        d.grp.visible = true;
      }
    }

    // ---- loop (paused offscreen + on tab blur) ------------------------------
    let raf = 0;
    let visible = true;
    let onScreen = true;
    let frame = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible || !onScreen) return;
      // Self-heal sizing: if the container's measured size ever disagrees with
      // the renderer (e.g. an unreliable width at mount), correct within a few
      // frames. Throttled to avoid per-frame layout reads.
      if ((++frame & 31) === 0) {
        const cw = mount.clientWidth, ch = mount.clientHeight;
        if (cw > 1 && ch > 1 && (cw !== W || ch !== H)) onResize();
      }
      const tt = clock.getElapsedTime();
      computeWave(tt);
      updateDots(tt);
      renderer.render(scene, camera);
    };
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0 });
    io.observe(mount);
    const onVis = () => { visible = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(tick);

    // ---- teardown -----------------------------------------------------------
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      io.disconnect();
      materials.forEach((m) => m.dispose());
      geometry.dispose();
      dotCoreGeo.dispose();
      dotGlowGeo.dispose();
      dots.forEach((d) => { d.coreMat.dispose(); d.glowMat.dispose(); });
      renderer.dispose();
      renderer.forceContextLoss?.();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      if (controller.current?.kind === "gl") controller.current = { kind: "none", pulse() {}, setAvailability() {}, setScroll() {} };
    };
  }, [controller]);

  return <div ref={mountRef} aria-hidden="true" style={{ position: "absolute", inset: 0 }} />;
}
