import Image from "next/image";
import Link from "next/link";

export function NotFoundView() {
  return (
    <main className="theme-dark relative isolate flex min-h-dvh items-center overflow-hidden bg-ink">
      <Image src="/images/v4/statement.jpg" alt="" fill sizes="100vw" quality={70} className="-z-10 object-cover opacity-40" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/85 to-navy/40" />
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10">
        <p className="display text-[clamp(7rem,22vw,16rem)] leading-none text-spark">404</p>
        <h1 className="display mt-6 text-[clamp(2.2rem,5vw,4rem)]">Esta página no existe.</h1>
        <p className="prose-codex mt-4 text-lg">Puede que el enlace haya cambiado. Empieza desde el inicio o revisa nuestros proyectos.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">Ir al inicio</Link>
          <Link href="/proyectos" className="btn btn-ghost">Ver proyectos</Link>
        </div>
      </div>
    </main>
  );
}
