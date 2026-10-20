import Image from "next/image";
import Link from "next/link";

/** Auth screens (enter, activate, recover): photograph under a navy wash with the form on a floating card. */
export function AuthScreen({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section className="theme-dark relative isolate flex min-h-[100svh] items-center overflow-hidden bg-ink">
      <Image src="/images/v4/hero.jpg" alt="" fill priority sizes="100vw" quality={70} className="-z-10 object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/95 via-navy/85 to-navy/60" />
      <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-5 pb-16 pt-32 md:px-10 lg:grid-cols-[1fr_30rem] lg:items-center">
        <div>
          <p className="eyebrow hero-line">{eyebrow}</p>
          <h1 className="display hero-line mt-6 max-w-2xl text-[clamp(2.6rem,5.5vw,5rem)] [animation-delay:100ms]">{title}</h1>
          <p className="hero-line mt-6 max-w-xl text-[length:var(--text-lede)] text-paper/85 [animation-delay:200ms]">{lede}</p>
        </div>
        <div className="hero-line rounded-[28px] bg-paper p-8 text-ink shadow-[0_40px_80px_-30px_rgba(0,2,9,0.6)] md:p-10 [animation-delay:250ms]">
          {children}
        </div>
      </div>
    </section>
  );
}

/** Logged-in panel: navy title band, light content area. */
export function PanelShell({
  eyebrow,
  title,
  lede,
  actions,
  back,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="theme-dark relative isolate overflow-hidden bg-navy">
        <div aria-hidden className="absolute -right-32 -top-40 -z-10 size-[30rem] rounded-full bg-signal/30 blur-3xl" />
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 px-5 pb-14 pt-32 md:flex-row md:items-end md:px-10 md:pt-40">
          <div>
            {back && (
              <Link href={back.href} className="link-underline mb-2 block w-fit text-sm text-spark">
                {back.label}
              </Link>
            )}
            <p className="eyebrow mt-4">{eyebrow}</p>
            <h1 className="display mt-4 max-w-3xl text-[clamp(2.2rem,4.5vw,4rem)]">{title}</h1>
            {lede && <p className="mt-4 max-w-2xl text-paper/80">{lede}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
      </section>
      <div className="mx-auto min-h-[50svh] max-w-[1440px] px-5 py-14 md:px-10 md:py-20">{children}</div>
    </>
  );
}
