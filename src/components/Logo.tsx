"use client";

import { useState } from "react";

// Le logo officiel est utilisé tel qu'il a été fourni, jamais redessiné : il
// suffit de déposer le fichier dans public/logo-fsy-2026.png.
//
// Tant qu'il n'est pas là, le sigle s'affiche à la place — plutôt qu'une image
// cassée. C'est aussi le filet de sécurité si le fichier venait à manquer après
// un déploiement.
const CHEMIN = "/logo-fsy-2026.png";

export function Logo({
  taille = 40,
  className = "",
  clair = false,
}: {
  taille?: number;
  className?: string;
  /** Sur fond bleu foncé, le sigle de repli doit être clair. */
  clair?: boolean;
}) {
  const [absent, setAbsent] = useState(false);

  if (absent) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-xl font-bold shrink-0 ${
          clair ? "bg-white/15 text-white" : "bg-fsy-light text-fsy-dark"
        } ${className}`}
        style={{ width: taille, height: taille, fontSize: Math.max(10, taille * 0.28) }}
        aria-label="FSY 2026"
      >
        FSY
      </span>
    );
  }

  return (
    // Image locale servie telle quelle : next/image n'apporterait rien et
    // imposerait de connaître ses dimensions à l'avance.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={CHEMIN}
      alt="FSY 2026 — Abidjan Ouest"
      width={taille}
      height={taille}
      onError={() => setAbsent(true)}
      className={`object-contain shrink-0 ${className}`}
      style={{ width: taille, height: taille }}
    />
  );
}
