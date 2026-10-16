"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ServiceIcon } from "@/components/icons";

type Group = { group: string; items: { slug: string; title: string; short: string; icon: string }[] };

const nav = [
  { href: "/proyectos", label: "Proyectos" },
  { href: "/academia", label: "Academia" },
  { href: "/experiencia", label: "Experiencia" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader({ groups, calendly }: { groups: Group[]; calendly: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click-to-pin mega menu (ported from the legacy site): outside click or Escape closes it.
  useEffect(() => {
    if (!mega) return;
    const onDown = (e: PointerEvent) => {
      if (!megaRef.current?.contains(e.target as Node)) setMega(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMega(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [mega]);

  useEffect(() => {
    document.documentElement.style.overflow = mobile ? "hidden" : "";
  }, [mobile]);

  const close = () => {
    setMega(false);
    setMobile(false);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled || mega || mobile
          ? "border-b border-line bg-obsidian/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between px-5 md:px-10">
        <Link href="/" onClick={close} className="group flex items-baseline gap-2" aria-label="CODEX, inicio">
          <span className="display text-[1.7rem] leading-none tracking-[0.06em] text-ivory">CODEX</span>
          <span className="hidden text-[0.8rem] text-ash sm:inline">AI Consulting</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          <div ref={megaRef} className="relative">
            <button
              type="button"
              aria-expanded={mega}
              aria-controls="mega-servicios"
              onClick={() => setMega((v) => !v)}
              className={`rounded-full px-4 py-2 text-[0.95rem] transition-colors ${mega ? "text-champagne" : "text-ivory/85 hover:text-ivory"}`}
            >
              Servicios
            </button>
            <div
              id="mega-servicios"
              hidden={!mega}
              className="fixed inset-x-0 top-18 border-b border-line bg-obsidian/95 backdrop-blur-xl"
            >
              <div className="mx-auto grid max-w-[1440px] grid-cols-3 gap-x-10 gap-y-8 px-10 py-10 xl:grid-cols-6">
                {groups.map((g) => (
                  <div key={g.group}>
                    <p className="mb-4 text-sm text-gold">{g.group}</p>
                    <ul className="space-y-4">
                      {g.items.map((s) => (
                        <li key={s.slug}>
                          <Link href={`/servicios/${s.slug}`} onClick={close} className="group block">
                            <span className="flex items-center gap-2 text-[0.95rem] text-ivory group-hover:text-champagne">
                              <ServiceIcon name={s.icon} className="size-4 text-gold" />
                              {s.title}
                            </span>
                            <span className="mt-1 block text-[0.82rem] leading-snug text-ash">{s.short}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mx-auto flex max-w-[1440px] items-center justify-between border-t border-line px-10 py-4 text-sm">
                <span className="text-ash">Doce disciplinas, un mismo equipo.</span>
                <Link href="/servicios" onClick={close} className="link-underline text-champagne">
                  Ver todos los servicios
                </Link>
              </div>
            </div>
          </div>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} onClick={close} className="rounded-full px-4 py-2 text-[0.95rem] text-ivory/85 transition-colors hover:text-ivory">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a href={calendly} target="_blank" rel="noopener" className="btn btn-gold hidden min-h-11 px-5 text-[0.9rem] sm:inline-flex">
            Agendar llamada
          </a>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border border-line lg:hidden"
            aria-label={mobile ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobile}
            onClick={() => setMobile((v) => !v)}
          >
            {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="h-[calc(100dvh-4.5rem)] overflow-y-auto px-5 pb-10 lg:hidden">
          <ul className="divide-y divide-line border-y border-line">
            {[{ href: "/servicios", label: "Servicios" }, ...nav].map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={close} className="display block py-5 text-4xl">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <a href={calendly} target="_blank" rel="noopener" className="btn btn-gold mt-8 w-full">
            Agendar llamada gratuita
          </a>
        </div>
      )}
    </header>
  );
}
