import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5">
      <p className="display text-[8rem] leading-none text-gold">404</p>
      <h1 className="display mt-6 text-4xl">Esta página no existe.</h1>
      <p className="mt-4 text-ash">Puede que el enlace haya cambiado. Empieza desde el inicio o revisa nuestros proyectos.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn btn-gold">Ir al inicio</Link>
        <Link href="/proyectos" className="btn btn-ghost">Ver proyectos</Link>
      </div>
    </main>
  );
}
