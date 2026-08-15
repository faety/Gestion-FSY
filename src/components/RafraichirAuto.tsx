"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Suivi en direct sans rien exiger de plus de l'hébergement : la page se
// redemande elle-même à intervalle régulier — une requête légère, identique à
// un rechargement, que le serveur sait déjà servir. Pas de connexion
// permanente à maintenir, rien à installer.
//
// L'onglet caché ne rafraîchit pas : sur un téléphone en poche, on n'use ni la
// batterie ni le réseau pour une page que personne ne regarde.
export function RafraichirAuto({ secondes = 12 }: { secondes?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tic = () => {
      if (!document.hidden) router.refresh();
    };
    const id = setInterval(tic, secondes * 1000);
    return () => clearInterval(id);
  }, [router, secondes]);
  return null;
}
