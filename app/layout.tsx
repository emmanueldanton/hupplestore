import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rentabilité · HUPPLE STORE",
  description:
    "Tableau de bord de rentabilité : dépenses Facebook Ads confrontées au net réellement encaissé sur la boutique.",
  robots: { index: false, follow: false },
  applicationName: "HUPPLE",
  appleWebApp: {
    capable: true,
    title: "HUPPLE",
    // La barre d'état iOS se fond dans le dégradé du bandeau.
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // Doit correspondre au haut du bandeau, sinon la barre d'état du téléphone
  // tranche avec l'application et l'heure semble posée sur un bandeau étranger.
  themeColor: "#1e3c74",
  // Une application installée doit occuper l'encoche et les bords arrondis.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <AutoRefresh />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
