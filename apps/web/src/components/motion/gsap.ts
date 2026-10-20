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

/**
 * Scoped GSAP setup that is skipped entirely for reduced-motion users.
 * Everything created inside is reverted on unmount (and when the media query stops matching).
 */
export function useMotion(
  scope: RefObject<HTMLElement | null>,
  setup: (root: HTMLElement) => void | (() => void),
  deps: unknown[] = [],
  query: string = MOTION_OK,
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(query, () => {
        if (scope.current) return setup(scope.current);
      });
      return () => mm.revert();
    },
    { scope, dependencies: deps },
  );
}
