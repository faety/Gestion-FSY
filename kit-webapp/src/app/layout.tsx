import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP } from "@/lib/app";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: APP.nom, template: `%s · ${APP.nom}` },
  description: APP.description,
  applicationName: APP.nom,
  // Ajoutée à l'écran d'accueil du téléphone, l'application s'ouvre sans la
  // barre du navigateur.
  appleWebApp: { capable: true, title: APP.nom, statusBarStyle: "black-translucent" },
  icons: { icon: APP.logo, apple: APP.logo },
  openGraph: { title: APP.nom, description: APP.description, url: SITE_URL, siteName: APP.nom, locale: "fr_FR", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: APP.couleurSombre,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
