"use client";

import { useState, useTransition } from "react";
import { choisirModeleAttestation } from "@/lib/actions";
import { MODELES } from "@/lib/attestations";

// Choix du design de l'attestation, par la personne elle-même. Le contenu, le
// code et le QR sont identiques dans les trois : on choisit un habillage, pas
// une valeur. C'est ce choix qui sort quand le couple imprime le lot.
export function ChoixModeleAttestation({ modeleActuel }: { modeleActuel: string }) {
  const [choisi, setChoisi] = useState(modeleActuel);
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function choisir(cle: string) {
    if (cle === choisi || pending) return;
    const precedent = choisi;
    setChoisi(cle);
    setErreur(null);
    startTransition(async () => {
      try {
        await choisirModeleAttestation(cle);
      } catch {
        setChoisi(precedent);
        setErreur("Le choix n'a pas pu être enregistré. Réessayez.");
      }
    });
  }

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 print:hidden">
      <h2 className="font-bold">Le design de votre attestation</h2>
      <p className="text-sm text-slate-500 mt-0.5">
        Trois présentations, même contenu : le code et le QR authentifient le document quel
        que soit l&apos;habillage. Votre choix sera celui imprimé et remis à la clôture.
      </p>
      <div className="grid gap-2 sm:grid-cols-3 mt-3">
        {MODELES.map((m) => {
          const actif = m.cle === choisi;
          return (
            <div
              key={m.cle}
              role="radio"
              aria-checked={actif}
              tabIndex={0}
              onClick={() => choisir(m.cle)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") choisir(m.cle);
              }}
              className={`text-left rounded-xl border-2 p-3 transition cursor-pointer ${
                actif
                  ? "border-fsy bg-blue-50/60"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              } ${pending ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{m.label}</span>
                <span
                  className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] text-white ${
                    actif ? "bg-fsy border-fsy" : "border-slate-300"
                  }`}
                >
                  {actif ? "✓" : ""}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-snug">{m.description}</p>
              <a
                href={`/attestations/specimen?modele=${m.cle}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-block text-xs text-fsy underline mt-1.5"
              >
                Voir un spécimen →
              </a>
            </div>
          );
        })}
      </div>
      {erreur && <p className="text-sm text-red-700 mt-2">{erreur}</p>}
      {pending && <p className="text-xs text-slate-400 mt-2">Enregistrement…</p>}
    </section>
  );
}
