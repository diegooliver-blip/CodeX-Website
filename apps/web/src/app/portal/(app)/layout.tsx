import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PortalNav } from "@/components/portal/PortalNav";

export const metadata: Metadata = { title: { default: "Portal", template: "%s | Portal CODEX" }, robots: { index: false } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line p-5 md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r">
        <Link href="/" className="inline-block" aria-label="CODEX AI Consulting, inicio"><Logo className="h-8 w-auto" /></Link>
        <p className="mt-2 text-[0.8rem] text-slate">Portal</p>
        <PortalNav />
      </aside>
      <div className="min-w-0 px-5 py-8 md:px-10 md:py-12">{children}</div>
    </div>
  );
}
