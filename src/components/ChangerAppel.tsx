"use client";

import { useState, useTransition } from "react";
import { changerAppel } from "@/lib/actions";

// Changer l'appel d'un encadrant.
//
// Le passage d'un appel à l'autre emporte des conséquences — un conseiller
// devenu adjoint rend ses groupes, un adjoint redevenu conseiller rend sa
// compagnie — donc on les annonce avant, et l'on rend compte de ce qui a
// réellement été fait après. Un changement d'appel qui déferait silencieusement
// une affectation serait découvert trop tard, le jour du départ.
export function ChangerAppel({
  userId,
  nom,
  role,
  aDesGroupes,
  aUneCompagnie,
}: {
  userId: string;
  nom: string;
  role: string;
  aDesGroupes: boolean;
  aUneCompagnie: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string[] | null>(null);
  const [pending, demarrer] = useTransition();

  const versAdjoint = role === "CONSEILLER";
  const cible = versAdjoint ? "ADJOINT" : "CONSEILLER";
  const libelle = versAdjoint ? "coordinateur adjoint" : "conseiller";

  if (fait) {
    return (
      <span className="text-xs text-green-700">
        ✓ Devenu {libelle}
        {fait.length > 0 && ` — ${fait.join(" ; ")}`}
      </span>
    );
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="text-xs text-slate-400 hover:text-fsy underline whitespace-nowrap"
      >
        Changer d'appel
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1.5 min-w-[190px]">
      <p className="text-xs text-slate-600">
        Faire de <strong>{nom}</strong> un {libelle} ?
      </p>
      {versAdjoint && aDesGroupes && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5">
          Ses groupes seront rendus : un adjoint dirige une compagnie.
        </p>
      )}
      {!versAdjoint && aUneCompagnie && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5">
          Sa compagnie et ses droits nominatifs seront retirés.
        </p>
      )}
      {erreur && <p className="text-xs text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              try {
                const r = await changerAppel(userId, cible);
                setFait(r.consequences ?? []);
              } catch (e) {
                setErreur(e instanceof Error ? e.message : "Erreur");
              }
            })
          }
          className="text-xs bg-fsy hover:bg-fsy-dark text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-40"
        >
          {pending ? "…" : "Confirmer"}
        </button>
        <button
          onClick={() => setOuvert(false)}
          className="text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
