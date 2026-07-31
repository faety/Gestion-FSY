"use client";

import { useState, useTransition } from "react";
import { rattacherInscription } from "@/lib/actions";

export type Suggestion = {
  id: string;
  nom: string;
  email: string;
  role: string;
  detail: string;
  fiabilite: "certain" | "probable" | "à vérifier";
};

const COULEURS: Record<Suggestion["fiabilite"], string> = {
  certain: "bg-green-100 text-green-900",
  probable: "bg-blue-100 text-blue-900",
  "à vérifier": "bg-amber-100 text-amber-900",
};

// Une inscription qui ressemble à un compte déjà en base : c'est presque
// toujours la même personne, qui s'inscrit avec sa vraie adresse. On propose le
// rattachement, on ne le fait jamais tout seul — deux homonymes existent dans
// cette liste, et fusionner deux personnes différentes serait pire que le mal.
export function RapprochementInscription({
  inscriptionId,
  nomInscrit,
  suggestions,
}: {
  inscriptionId: string;
  nomInscrit: string;
  suggestions: Suggestion[];
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [tout, setTout] = useState(false);
  const [pending, demarrer] = useTransition();

  if (fait) {
    return (
      <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
        ✅ Rattaché au compte de {fait}. La personne se connecte désormais avec sa vraie adresse
        et retrouve son groupe.
      </p>
    );
  }

  if (suggestions.length === 0) return null;
  const visibles = tout ? suggestions : suggestions.slice(0, 1);

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <p className="text-xs text-slate-500 mb-1.5">
        Déjà en base sous un autre identifiant ? Rattacher conserve le rôle, la compagnie et le
        groupe, et remplace l'identifiant d'attente par la vraie adresse.
      </p>
      <ul className="space-y-1.5">
        {visibles.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm min-w-0">
              <span className="font-medium">{s.nom}</span>{" "}
              <span className={`text-[11px] rounded-full px-2 py-0.5 ${COULEURS[s.fiabilite]}`}>
                {s.fiabilite}
              </span>
              <div className="text-xs text-slate-500">
                {s.role} · {s.detail} · <span className="font-mono">{s.email}</span>
              </div>
            </div>
            <button
              disabled={pending}
              onClick={() =>
                demarrer(async () => {
                  setErreur(null);
                  try {
                    const r = await rattacherInscription(inscriptionId, s.id);
                    if (r.ok) setFait(r.nom);
                    else setErreur(r.motif);
                  } catch {
                    setErreur("Le rattachement n'a pas abouti. Rechargez la page et réessayez.");
                  }
                })
              }
              className="text-xs bg-fsy hover:bg-fsy-dark text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-40 shrink-0"
            >
              {pending ? "…" : "Rattacher"}
            </button>
          </li>
        ))}
      </ul>

      {suggestions.length > 1 && !tout && (
        <button
          onClick={() => setTout(true)}
          className="text-xs text-fsy hover:underline mt-1.5"
        >
          Voir {suggestions.length - 1} autre{suggestions.length > 2 ? "s" : ""} correspondance
          {suggestions.length > 2 ? "s" : ""}
        </button>
      )}

      {erreur && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
          {erreur}
        </p>
      )}

      <p className="text-xs text-slate-400 mt-1.5">
        Aucune de ces personnes n'est {nomInscrit} ? Utilisez « Valider », qui crée un compte
        neuf.
      </p>
    </div>
  );
}
