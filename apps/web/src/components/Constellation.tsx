"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type ConstellationNode = { slug: string; title: string };
export type ConstellationEdge = [number, number, number]; // a, b, weight (shared projects)

type Point = { x: number; y: number };

/**
 * The hero's signature piece: every CODEX capability is a node; edges are drawn
 * where real projects combined those capabilities, and signals travel along them.
 * Labels are real links (DOM), the canvas only paints lines and signals.
 */
export function Constellation({ nodes, edges }: { nodes: ConstellationNode[]; edges: ConstellationEdge[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [narrow, setNarrow] = useState(false);
  const activeRef = useRef<number | null>(null);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Deterministic orbital layout in a unit square (0..1); the core sits at the centre.
  // The horizontal radius leaves room for the labels that hang outward from each node.
  const layout = useMemo<Point[]>(() => {
    const n = nodes.length;
    const rx = narrow ? 0.2 : 0.3;
    return nodes.map((_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.18;
      const r = i % 2 ? 0.8 : 1;
      return { x: 0.5 + Math.cos(a) * rx * r, y: 0.5 + Math.sin(a) * 0.42 * r };
    });
  }, [nodes, narrow]);

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    let start = performance.now();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const core: Point = { x: 0.5, y: 0.5 };
    const links: { a: Point; b: Point; ia: number; ib: number; weight: number }[] = [
      ...edges.map(([a, b, weight]) => ({ a: layout[a], b: layout[b], ia: a, ib: b, weight })),
      ...layout.map((p, i) => ({ a: core, b: p, ia: -1, ib: i, weight: 0 })),
    ];
    const signals = Array.from({ length: reduce ? 0 : box.clientWidth < 640 ? 12 : 24 }, (_, i) => ({
      link: i % links.length,
      t: Math.random(),
      speed: 0.0016 + Math.random() * 0.0022,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = box.clientWidth;
      h = box.clientHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    // Edges bow toward the core, which reads as orbits instead of a tangle of chords.
    const bend = (a: Point, b: Point) => {
      const c = toPx(core, 0.3);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      return { x: mx + (c.x - mx) * 0.35, y: my + (c.y - my) * 0.35 };
    };
    const at = (a: Point, q: Point, b: Point, t: number) => ({
      x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * q.x + t ** 2 * b.x,
      y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * q.y + t ** 2 * b.y,
    });
    const toPx = (p: Point, depth = 1) => ({
      x: p.x * w + pointer.x * 14 * depth,
      y: p.y * h + pointer.y * 14 * depth,
    });

    const draw = (now: number) => {
      // ease the opening: lines draw in over the first 1.6s
      const intro = reduce ? 1 : Math.min(1, (now - start) / 1600);
      const easeIntro = 1 - Math.pow(1 - intro, 3);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      ctx.clearRect(0, 0, w, h);
      const hot = activeRef.current;

      for (const l of links) {
        const lit = hot !== null && (l.ia === hot || l.ib === hot);
        const a = toPx(l.a, l.ia === -1 ? 0.3 : 1);
        const b = toPx(l.b);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        if (l.ia === -1) {
          ctx.lineTo(a.x + (b.x - a.x) * easeIntro, a.y + (b.y - a.y) * easeIntro);
        } else {
          const q = bend(a, b);
          const steps = Math.max(2, Math.round(24 * easeIntro));
          for (let k = 1; k <= steps; k++) {
            const p = at(a, q, b, (k / steps) * easeIntro);
            ctx.lineTo(p.x, p.y);
          }
        }
        const base = l.ia === -1 ? 0.13 : 0.16 + Math.min(l.weight, 4) * 0.06;
        ctx.strokeStyle = `rgba(122,152,255,${lit ? 0.75 : hot !== null ? base * 0.45 : base})`;
        ctx.lineWidth = lit ? 1.2 : 0.8;
        ctx.stroke();
      }

      // core
      const c = toPx(core, 0.3);
      const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 90);
      glow.addColorStop(0, "rgba(255,229,80,0.28)");
      glow.addColorStop(1, "rgba(255,229,80,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(c.x - 90, c.y - 90, 180, 180);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe550";
      ctx.fill();

      if (intro >= 1) {
        for (const s of signals) {
          s.t += s.speed;
          if (s.t > 1) {
            s.t = 0;
            s.link = Math.floor(Math.random() * links.length);
          }
          const l = links[s.link];
          const a = toPx(l.a, l.ia === -1 ? 0.3 : 1);
          const b = toPx(l.b);
          const { x, y } = l.ia === -1 ? { x: a.x + (b.x - a.x) * s.t, y: a.y + (b.y - a.y) * s.t } : at(a, bend(a, b), b, s.t);
          const fade = Math.sin(s.t * Math.PI);
          ctx.beginPath();
          ctx.arc(x, y, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,229,80,${0.9 * fade})`;
          ctx.fill();
        }
      }

      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      pointer.tx = (e.clientX - r.left) / r.width - 0.5;
      pointer.ty = (e.clientY - r.top) / r.height - 0.5;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduce) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    });

    const ro = new ResizeObserver(() => {
      resize();
      setNarrow(w < 640);
      if (reduce && started) draw(performance.now());
    });
    ro.observe(box); // sizing (and the narrow layout) must be right on first paint
    // Begin once the page is idle so the canvas never competes with first paint and hydration.
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      io.observe(box);
      start = performance.now();
      raf = requestAnimationFrame(draw);
    };
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = hasIdle ? window.requestIdleCallback(begin, { timeout: 1200 }) : 0;
    const fallback = hasIdle ? undefined : setTimeout(begin, 400);
    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible && started && !reduce) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      if (hasIdle) window.cancelIdleCallback(idle);
      clearTimeout(fallback);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [edges, layout]);

  return (
    <div ref={wrap} className="relative size-full">
      <canvas ref={canvas} aria-hidden className="absolute inset-0" />
      <ul aria-label="Servicios de CODEX" className="absolute inset-0">
        {nodes.map((n, i) => {
          const p = layout[i];
          const right = p.x >= 0.5;
          return (
            <li
              key={n.slug}
              className="absolute"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, animationDelay: `${600 + i * 70}ms` }}
            >
              <Link
                href={`/servicios/${n.slug}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={`group absolute flex min-h-6 -translate-y-1/2 items-center gap-2.5 py-1 ${
                  right ? "flex-row text-left" : "-translate-x-full flex-row-reverse text-right"
                }`}
                style={{ left: right ? -5 : 5 }}
              >
                <span
                  className={`block size-2.5 shrink-0 rounded-full border transition-all duration-300 ${
                    active === i ? "scale-150 border-spark bg-spark" : "border-spark bg-navy"
                  }`}
                />
                <span
                  className={`w-max max-w-[7rem] text-[0.78rem] leading-tight transition-colors duration-300 sm:max-w-[9.5rem] md:text-[0.88rem] ${
                    active === i ? "text-spark" : active === null ? "text-paper/80" : "text-paper/40"
                  }`}
                >
                  {n.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
