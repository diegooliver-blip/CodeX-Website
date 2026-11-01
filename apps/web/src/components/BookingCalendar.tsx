"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect, useRef, useState } from "react";

const NAMESPACE = "consultoria";

/** Site palette handed to Cal.com so the booker reads as part of the page (ink surface, ember actions). */
const vars = {
  "cal-brand": "#FF6B15",
  "cal-brand-emphasis": "#FF8A45",
  "cal-brand-text": "#000209",
  "cal-bg": "#000209",
  "cal-bg-muted": "#0A0D18",
  "cal-bg-subtle": "#11152A",
  "cal-bg-emphasis": "#1B2040",
  "cal-border": "#262B45",
  "cal-border-subtle": "#1B2040",
  "cal-text": "#FFFFFF",
  "cal-text-emphasis": "#FFFFFF",
  "cal-text-subtle": "#C9CBD3",
  "cal-text-muted": "#9A9CA6",
};

/**
 * Inline Cal.com booker for the free 30-minute call. The embed script (app.cal.com) only loads when the
 * section comes near the viewport, so it never competes with the hero for bandwidth.
 */
export function BookingCalendar({ calLink, fallbackHref }: { calLink: string; fallbackHref: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    getCalApi({ namespace: NAMESPACE }).then((cal) => {
      if (cancelled) return;
      cal("ui", {
        theme: "dark",
        layout: "month_view",
        hideEventTypeDetails: false,
        cssVarsPerTheme: { dark: vars, light: vars },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [near]);

  return (
    <div
      ref={box}
      className="glow-card relative min-h-[620px] overflow-hidden rounded-[28px] border border-paper/10 bg-ink/80 backdrop-blur-md"
    >
      {near ? (
        <Cal
          namespace={NAMESPACE}
          calLink={calLink}
          style={{ width: "100%", height: "100%", minHeight: 620, overflow: "auto" }}
          config={{ layout: "month_view", theme: "dark" }}
        />
      ) : (
        <div className="grid h-[620px] place-items-center p-8 text-center text-paper/70">
          <p>
            Cargando calendario.{" "}
            <a href={fallbackHref} target="_blank" rel="noopener" className="link-underline text-paper">
              Abrirlo en otra pestaña
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
