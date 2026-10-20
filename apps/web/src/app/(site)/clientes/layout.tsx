import type { Metadata } from "next";

// The client portal is private: keep every page out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ClientesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
