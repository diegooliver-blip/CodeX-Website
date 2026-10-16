"use client";

import Link from "next/link";
import { BookOpen, Database, Gauge, LogOut, Users } from "lucide-react";

const items = [
  { href: "/portal", label: "Resumen", icon: Gauge },
  { href: "/portal/cursos", label: "Cursos", icon: BookOpen },
  { href: "/portal/leads", label: "Leads", icon: Users },
  { href: "/portal/conocimiento", label: "Conocimiento", icon: Database },
];

export function PortalNav() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Full reload on purpose: drops every cached portal view along with the session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/portal/login";
  }
  return (
    <nav aria-label="Portal" className="mt-6 flex gap-1 overflow-x-auto md:mt-10 md:flex-col">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] text-ivory/80 hover:bg-graphite hover:text-ivory">
          <Icon className="size-4 text-gold" aria-hidden />
          {label}
        </Link>
      ))}
      <button type="button" onClick={logout} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] text-ash hover:text-ivory md:mt-6">
        <LogOut className="size-4" aria-hidden />
        Cerrar sesión
      </button>
    </nav>
  );
}
