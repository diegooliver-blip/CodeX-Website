import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SimulatedPayment } from "@/components/academia/StudentForms";
import { getStudentOrder } from "@/lib/student-api";

export const metadata: Metadata = { title: "Pago del curso", robots: { index: false } };

/** Return page of the mock provider's checkout. Real gateways send the student to their own page instead. */
export default function PaymentPage({ searchParams }: PageProps<"/academia/pago">) {
  return (
    <section className="mx-auto max-w-2xl px-5 pb-28 pt-36 md:pt-44">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-[22px] bg-mist/50" />}>
        <Payment searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Payment({ searchParams }: { searchParams: PageProps<"/academia/pago">["searchParams"] }) {
  const { orden } = await searchParams;
  if (typeof orden !== "string") redirect("/academia");
  const order = await getStudentOrder(orden);
  if (!order) redirect(`/academia/entrar?siguiente=${encodeURIComponent(`/academia/pago?orden=${orden}`)}`);

  const amount = `$${(order.monto_centavos / 100).toLocaleString("es-MX")} ${order.moneda}`;
  return (
    <div className="rounded-[22px] border border-line p-8 md:p-10">
      <Link href={`/academia/${order.curso}`} className="link-underline text-[0.92rem] text-navy">Volver al curso</Link>
      <h1 className="display mt-5 text-[clamp(2rem,4vw,3rem)]">
        {order.estado === "pagada" ? "Pago confirmado." : order.estado === "fallida" ? "El pago no pasó." : "Confirma tu compra."}
      </h1>
      <dl className="mt-8 grid grid-cols-2 gap-4 border-y border-line py-5 text-[0.95rem]">
        <div><dt className="text-slate">Total</dt><dd className="display mt-1 text-2xl text-navy">{amount}</dd></div>
        <div><dt className="text-slate">Orden</dt><dd className="mt-1 break-all text-[0.85rem]">{order.id}</dd></div>
      </dl>
      {order.estado === "pagada" ? (
        <Link href={`/academia/${order.curso}`} className="btn btn-primary mt-8 w-full">Ir a mis lecciones</Link>
      ) : order.proveedor === "mock" ? (
        <div className="mt-8">
          <p className="mb-6 rounded-xl bg-spark/40 px-4 py-3 text-[0.95rem]">
            Pago de prueba: no se cobra nada. Las inscripciones reales se activan cuando se conecte la pasarela de pago.
          </p>
          <SimulatedPayment orderId={order.id} slug={order.curso} />
        </div>
      ) : (
        <p className="mt-8 text-slate">Estamos esperando la confirmación de la pasarela. Recarga en unos segundos.</p>
      )}
    </div>
  );
}
