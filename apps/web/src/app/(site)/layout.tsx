import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Cursor } from "@/components/motion/Cursor";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { serviceGroups, site } from "@/lib/content";

const groups = serviceGroups.map((g) => ({
  group: g.group,
  items: g.items.map(({ slug, title, short, icon }) => ({ slug, title, short, icon })),
}));

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-signal focus:px-4 focus:py-2 focus:text-ink"
      >
        Saltar al contenido
      </a>
      <SiteHeader groups={groups} calendly={site.contact.calendly} />
      <main id="contenido">{children}</main>
      <SiteFooter />
      <MotionRoot />
      <Cursor />
    </>
  );
}
