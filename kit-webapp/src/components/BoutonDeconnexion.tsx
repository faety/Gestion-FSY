"use client";

import { useEffect, useRef, useState } from "react";
import { seDeconnecter } from "@/lib/actions";

// Déconnexion précédée d'une confirmation : le bouton est en haut à droite,
// on l'atteint du pouce sans le vouloir.
export function BoutonDeconnexion({ prenom }: { prenom: string }) {
  const [ouvert, setOuvert] = useState(false);
  const annuler = useRef<HTMLButtonElement>(null);

  // Échap ferme, et le focus part sur « Rester connecté » : la confirmation
  // ne doit pas être le choix par défaut d'une tape sur Entrée.
  useEffect(() => {
    if (!ouvert) return;
    annuler.current?.focus();
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [ouvert]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition whitespace-nowrap"
      >
        Déconnexion
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-marque-sombre/70"
          onClick={() => setOuvert(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-deconnexion"
        >
          <div
            className="bg-white text-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl">👋</div>
            <h2 id="titre-deconnexion" className="font-bold text-lg mt-2">
              Vous déconnecter, {prenom} ?
            </h2>
            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5">
              <button
                ref={annuler}
                type="button"
                onClick={() => setOuvert(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-lg py-2.5 text-sm font-semibold"
              >
                Rester connecté
              </button>
              <form action={seDeconnecter} className="flex-1">
                <button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm font-semibold">
                  Me déconnecter
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
