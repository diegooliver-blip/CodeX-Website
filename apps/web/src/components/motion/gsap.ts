"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import type { RefObject } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
gsap.defaults({ ease: "expo.out", duration: 1.2 });

export { gsap, ScrollTrigger, SplitText };

/** Motion only runs when the user hasn't asked for reduced motion; otherwise every element keeps its final, visible state. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const FINE_POINTER = "(pointer: fine) and (prefers-reduced-motion: no-preference)";

/** Runs `start` when the main thread is idle after first paint (at most `timeout` ms later); returns a canceller. */
function whenIdle(start: () => void, timeout = 600): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(start, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(start, 1); // Safari has no requestIdleCallback
  return () => window.clearTimeout(id);
}

/**
 * Scoped GSAP setup that is skipped entirely for reduced-motion users.
 * Everything created inside is reverted on unmount (and when the media query stops matching).
 * By default the setup waits for idle time so SplitText/ScrollTrigger layout reads don't hold up the
 * first paint; pass `timing: "now"` for above-the-fold motion that must start with the page.
 */
export function useMotion(
  scope: RefObject<HTMLElement | null>,
  setup: (root: HTMLElement) => void | (() => void),
  deps: unknown[] = [],
  query: string = MOTION_OK,
  timing: "idle" | "now" = "idle",
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const run = () =>
        mm.add(query, () => {
          if (scope.current) return setup(scope.current);
        });
      if (timing === "now") {
        run();
        return () => mm.revert();
      }
      const cancel = whenIdle(run);
      return () => {
        cancel();
        mm.revert();
      };
    },
    { scope, dependencies: deps },
  );
}
