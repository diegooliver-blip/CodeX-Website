"use client";

import { Compass, CreditCard, FileText, LayoutGrid, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const ITEMS = [
  { href: "/clientes/panel", label: "Inicio", icon: LayoutGrid, exact: true },
  { href: "/clientes/panel/pagos", label: "Pagos", icon: CreditCard },
  { href: "/clientes/panel/codex-plus", label: "CODEX+", icon: Sparkles },
  { href: "/clientes/panel/descubrir", label: "Descubrir", icon: Compass },
  { href: "/clientes/panel/reportes", label: "Reportes", icon: FileText },
  { href: "/clientes/panel/cuenta", label: "Cuenta", icon: UserRound },
];

/** Panel sections as a scrollable tab row under the title band; services open from Inicio. */
export function PanelNav() {
  // The active tab depends on the URL, which dynamic routes only know at request time.
  return (
    <Suspense fallback={<Tabs path="" />}>
      <ActiveTabs />
    </Suspense>
  );
}

function ActiveTabs() {
  return <Tabs path={usePathname()} />;
}

function Tabs({ path }: { path: string }) {
  return (
    <nav aria-label="Secciones del portal" className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1 rounded-full bg-paper/10 p-1">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href || path.startsWith("/clientes/panel/servicios") : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                  active ? "bg-paper text-ink" : "text-paper/80 hover:bg-paper/15 hover:text-paper"
                }`}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
