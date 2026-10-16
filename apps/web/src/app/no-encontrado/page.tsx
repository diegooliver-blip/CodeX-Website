import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

// Target of the 404 rewrite in proxy.ts for unknown content slugs.
export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false } };

export default function NotFoundPage() {
  return <NotFoundView />;
}
