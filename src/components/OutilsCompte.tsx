"use client";

import { useState, useTransition } from "react";
import { reinitialiserMotDePasse } from "@/lib/actions";

// Génère un mot de passe provisoire et l'affiche une seule fois, à dicter de
// vive voix. Il n'est stocké nulle part en clair : la seule façon de le revoir
// est d'en générer un nouveau.
export function BoutonMotDePasse({ userId, nom }: { userId: string; nom: string }) {
  const [resultat, setResultat] = useState<{ provisoire: string; nom: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [pending, demarrer] = useTransition();

  return (
    <>
      <button
        disabled={pending}
        onClick={() =>
          demarrer(async () => {
            setErreur(null);
            try {
              const r = await reinitialiserMotDePasse(userId);
              setResultat({ provisoire: r.provisoire, nom: r.nom });
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Erreur");
            }
          })
        }
        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-3 py-1 whitespace-nowrap disabled:opacity-50"
        title={`Générer un mot de passe provisoire pour ${nom}`}
      >
        {pending ? "…" : "Mot de passe oublié"}
      </button>

      {erreur && <span className="text-xs text-red-600 ml-2">{erreur}</span>}

      {resultat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fsy-dark/70"
          onClick={() => setResultat(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl">🔑</div>
            <h2 className="font-bold text-lg mt-2">Mot de passe provisoire</h2>
            <p className="text-sm text-slate-600 mt-1">
              Pour <strong>{resultat.nom}</strong>. Dictez-le maintenant : il ne sera plus
              affiché.
            </p>
            <div className="mt-4 bg-slate-100 rounded-xl py-4 font-mono text-2xl tracking-widest select-all">
              {resultat.provisoire}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              À la connexion, l'application lui demandera d'en choisir un nouveau.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resultat.provisoire);
                    setCopie(true);
                    setTimeout(() => setCopie(false), 2000);
                  } catch {
                    /* le presse-papier peut être refusé : le mot de passe reste lisible */
                  }
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-lg py-2.5 text-sm font-medium"
              >
                {copie ? "✓ Copié" : "Copier"}
              </button>
              <button
                onClick={() => setResultat(null)}
                className="flex-1 bg-fsy hover:bg-fsy-dark text-white rounded-lg py-2.5 text-sm font-semibold"
              >
                J'ai noté
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
