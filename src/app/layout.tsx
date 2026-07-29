import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FSY 2026 — Abidjan Ouest",
  description: "Application de gestion de l'événement FSY 2026 Abidjan Ouest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
