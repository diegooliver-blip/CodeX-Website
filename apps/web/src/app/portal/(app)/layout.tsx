import type { Metadata } from "next";
import Link from "next/link";
import { PortalNav } from "@/components/portal/PortalNav";

export const metadata: Metadata = { title: { default: "Portal", template: "%s | Portal CODEX" }, robots: { index: false } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line p-5 md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r">
        <Link href="/" className="display text-2xl tracking-[0.06em]">CODEX</Link>
        <p className="text-[0.8rem] text-slate">Portal</p>
        <PortalNav />
      </aside>
      <div className="min-w-0 px-5 py-8 md:px-10 md:py-12">{children}</div>
    </div>
  );
}
