"use client";

import { useCallback, useState } from "react";
import { APP } from "@/lib/app";

// Le logo est un fichier déposé dans public/ (APP.logo), jamais redessiné.
// Tant qu'il n'est pas là, le sigle s'affiche à la place — plutôt qu'une
// image cassée.
export function Logo({ taille = 40, className = "", clair = false }: { taille?: number; className?: string; clair?: boolean }) {
  const [absent, setAbsent] = useState(false);

  // L'image est demandée dès le rendu du serveur, souvent avant que React
  // n'ait attaché ses gestionnaires : on vérifie aussi l'état de l'image au
  // moment où on la reçoit.
  const verifier = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth === 0) setAbsent(true);
  }, []);

  if (absent) {
    const sigle = APP.nom
      .split(/\s+/)
      .map((m) => m[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
    return (
      <span
        className={`inline-flex items-center justify-center rounded-xl font-bold ${clair ? "bg-white/15 text-white" : "bg-marque-claire text-marque-sombre"} ${className}`}
        style={{ width: taille, height: taille, fontSize: taille * 0.34 }}
        aria-label={APP.nom}
      >
        {sigle}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={verifier}
      src={APP.logo}
      alt={APP.nom}
      width={taille}
      height={taille}
      onError={() => setAbsent(true)}
      className={`object-contain ${className}`}
      style={{ width: taille, height: taille }}
    />
  );
}
