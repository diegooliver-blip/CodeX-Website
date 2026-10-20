import type { Metadata, Viewport } from "next";
import { Wix_Madefor_Display, Wix_Madefor_Text } from "next/font/google";
import { serviceGroups, site, siteUrl } from "@/lib/content";
import "./globals.css";

const display = Wix_Madefor_Display({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-madefor-display", display: "swap" });
const text = Wix_Madefor_Text({ subsets: ["latin"], variable: "--font-madefor-text", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CODEX AI Consulting | Agencia de inteligencia artificial en México",
    template: "%s | CODEX AI Consulting",
  },
  description: site.description,
  keywords: [
    "agencia de inteligencia artificial", "agentes de IA", "agentes de WhatsApp", "automatización de procesos",
    "desarrollo web con IA", "tiendas en línea", "apps iOS Android", "dashboards", "simulación energética", "México",
  ],
  openGraph: { type: "website", locale: "es_MX", siteName: site.name, url: siteUrl },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: site.name,
  url: siteUrl,
  description: site.description,
  email: site.contact.email,
  telephone: site.contact.phone,
  areaServed: "MX",
  knowsAbout: serviceGroups.flatMap((g) => g.items.map((s) => s.title)),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={`${display.variable} ${text.variable}`}>
      <body className="min-h-dvh">
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </body>
    </html>
  );
}
