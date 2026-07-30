import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://2026.fsy.ci"),
  title: {
    default: "FSY 2026 — Abidjan Ouest · Marche avec moi",
    template: "%s · FSY 2026 Abidjan Ouest",
  },
  description:
    "Conférence pour la jeunesse FSY 2026 Abidjan Ouest, du 3 au 8 août 2026. « Marche avec moi » — Moïse 6:34.",
  applicationName: "FSY 2026",
  // Ajoutée à l'écran d'accueil du téléphone, l'application s'ouvre sans la
  // barre du navigateur : un écran de plus pour les listes de pointage.
  appleWebApp: { capable: true, title: "FSY 2026", statusBarStyle: "black-translucent" },
  icons: { icon: "/logo-fsy-2026.png", apple: "/logo-fsy-2026.png" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "FSY 2026 — Abidjan Ouest",
    description: "« Marche avec moi » — Moïse 6:34. Du 3 au 8 août 2026.",
    url: "https://2026.fsy.ci",
    siteName: "FSY 2026 Abidjan Ouest",
    locale: "fr_CI",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e3a8a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
