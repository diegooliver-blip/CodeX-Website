"use client";

import { useEffect } from "react";
import { gsap, MOTION_OK, ScrollTrigger } from "./gsap";

/**
 * Boots the motion layer once per page tree: Lenis smooth scrolling (fine pointer only) driven by the
 * GSAP ticker so ScrollTrigger pins and scrubs stay in sync, plus a scroll-progress bar.
 */
export function MotionRoot() {
  useEffect(() => {
    const motionOk = window.matchMedia(MOTION_OK).matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!motionOk) return;

    let destroy = () => {};
    if (fine) {
      import("lenis").then(({ default: Lenis }) => {
        const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) });
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        destroy = () => {
          gsap.ticker.remove(tick);
          lenis.destroy();
        };
      });
    }

    // Fonts and lazy images shift layout after first paint; re-measure triggers once they settle.
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      destroy();
    };
  }, []);

  return <ScrollProgress />;
}

function ScrollProgress() {
  useEffect(() => {
    if (!window.matchMedia(MOTION_OK).matches) return;
    const tween = gsap.to("#scroll-progress", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);
  return (
    <div
      id="scroll-progress"
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] origin-left scale-x-0 bg-ember"
    />
  );
}
