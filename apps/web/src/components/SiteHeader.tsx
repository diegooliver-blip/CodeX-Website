"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ServiceIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { Magnetic } from "@/components/motion/primitives";

type Group = { group: string; items: { slug: string; title: string; short: string; icon: string }[] };

const nav = [
  { href: "/proyectos", label: "Proyectos" },
  { href: "/academia", label: "Academia" },
  { href: "/experiencia", label: "Experiencia" },
  { href: "/contacto", label: "Contacto" },
  { href: "/clientes/entrar", label: "Clientes" },
];

/**
 * Every public page opens on a dark photographic hero, so the header starts transparent with light text
 * and turns into a solid white bar once the page scrolls. It tucks away while reading down and comes back on the way up.
 */
export function SiteHeader({ groups, calendly }: { groups: Group[]; calendly: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 480 && y > last + 4);
      if (y < last - 4 || y <= 480) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click-to-pin mega menu: outside click or Escape closes it.
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
    if (!mobile) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobile(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobile]);

  const close = () => {
    setMega(false);
    setMobile(false);
  };

  const solid = scrolled || mega;
  const light = !solid && !mobile; // light text over the hero photo or the mobile panel

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color,box-shadow] duration-500 ease-[var(--ease-codex)] ${
        hidden && !mega && !mobile ? "-translate-y-full" : ""
      } ${solid && !mobile ? "bg-paper/90 text-ink shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl" : "text-paper"}`}
    >
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 md:px-10">
        <Link href="/" onClick={close} className="relative block" aria-label="CODEX AI Consulting, inicio">
          {/* Both variants stay mounted and cross-fade, so the swap over the hero never flashes. */}
          <Logo variant="light" priority className={`h-9 w-auto transition-opacity duration-500 md:h-10 ${light ? "opacity-100" : "opacity-0"}`} />
          <Logo
            variant="color"
            priority
            className={`absolute inset-0 h-9 w-auto transition-opacity duration-500 md:h-10 ${light ? "opacity-0" : "opacity-100"}`}
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          <div ref={megaRef} className="relative">
            <button
              type="button"
              aria-expanded={mega}
              aria-controls="mega-servicios"
              onClick={() => setMega((v) => !v)}
              className="rounded-full px-4 py-2 text-[0.95rem] opacity-90 transition-opacity hover:opacity-100"
            >
              Servicios
            </button>
            <div
              id="mega-servicios"
              hidden={!mega}
              className="fixed inset-x-0 top-20 border-t border-line bg-paper text-ink shadow-[0_30px_60px_-30px_rgba(0,2,9,0.35)]"
            >
              <div className="mx-auto grid max-w-[1440px] grid-cols-3 gap-x-10 gap-y-8 px-10 py-10 xl:grid-cols-6">
                {groups.map((g) => (
                  <div key={g.group}>
                    <p className="eyebrow mb-4 text-sm">{g.group}</p>
                    <ul className="space-y-4">
                      {g.items.map((s) => (
                        <li key={s.slug}>
                          <Link href={`/servicios/${s.slug}`} onClick={close} className="group block">
                            <span className="flex items-center gap-2 text-[0.95rem] font-semibold group-hover:text-navy">
                              <ServiceIcon name={s.icon} className="size-4 text-signal" />
                              {s.title}
                            </span>
                            <span className="mt-1 block text-[0.82rem] leading-snug text-slate">{s.short}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="bg-mist-2">
                <div className="mx-auto flex max-w-[1440px] items-center justify-between px-10 py-4 text-sm">
                  <span className="text-slate">Doce disciplinas, un mismo equipo.</span>
                  <Link href="/servicios" onClick={close} className="link-underline font-semibold text-navy">
                    Ver todos los servicios
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={close}
              className="rounded-full px-4 py-2 text-[0.95rem] opacity-90 transition-opacity hover:opacity-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block">
            <Magnetic>
              <a href={calendly} target="_blank" rel="noopener" className="btn btn-primary min-h-11 px-5 text-[0.9rem]">
                Agendar llamada
              </a>
            </Magnetic>
          </span>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border border-current/30 lg:hidden"
            aria-label={mobile ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobile}
            aria-controls="menu-movil"
            onClick={() => setMobile((v) => !v)}
          >
            {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        id="menu-movil"
        hidden={!mobile}
        className="theme-dark fixed inset-0 top-20 -z-10 overflow-y-auto bg-ink px-5 pb-10 lg:hidden"
      >
        <ul className="border-b border-paper/15">
          {[{ href: "/servicios", label: "Servicios" }, ...nav].map((n, i) => (
            <li key={n.href} className="border-t border-paper/15">
              <Link
                href={n.href}
                onClick={close}
                className="display flex items-baseline justify-between py-5 text-4xl"
                style={{ animation: mobile ? `rise 0.8s var(--ease-codex) ${i * 60}ms both` : undefined }}
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <a href={calendly} target="_blank" rel="noopener" className="btn btn-primary mt-8 w-full">
          Agendar llamada gratuita
        </a>
      </div>
      {/* Fixed full-screen panel needs the header shell itself to paint black while open */}
      {mobile && <div aria-hidden className="absolute inset-0 -z-10 bg-ink" />}
    </header>
  );
}
