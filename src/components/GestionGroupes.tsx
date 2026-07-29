"use client";

import { useState, useTransition } from "react";
import { reassignerConseiller, fusionnerGroupes } from "@/lib/actions";

type Groupe = {
  id: string;
  nom: string;
  sexe: string;
  compagnie: string | null;
  nbJeunes: number;
  capaciteMax: number;
  conseillerId: string | null;
  conseiller: string | null;
  conseillerActif: boolean;
};

export function GestionGroupes({
  groupes,
  conseillers,
  peutModifier,
}: {
  groupes: Groupe[];
  conseillers: { id: string; nom: string; sexe: string; actif: boolean }[];
  peutModifier: boolean;
}) {
  const [, startTransition] = useTransition();
  const [fusionSource, setFusionSource] = useState<Groupe | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const lancer = (fn: () => Promise<void>) => {
    setErreur(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur inattendue");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Groupes</h1>
        <p className="text-slate-500 text-sm">
          {peutModifier
            ? "Réassignation dynamique : changez le conseiller d'un groupe ou fusionnez deux groupes en cas d'absence."
            : "Vue en lecture seule des groupes et de leurs conseillers."}
        </p>
      </div>

      {erreur && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{erreur}</p>}

      {fusionSource && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm">
          <p className="font-medium text-amber-800 mb-2">
            Fusion : les jeunes de « {fusionSource.nom} » seront déplacés vers le groupe
            choisi, puis « {fusionSource.nom} » sera supprimé.
          </p>
          <div className="flex gap-2 flex-wrap">
            {groupes
              .filter((g) => g.id !== fusionSource.id && g.sexe === fusionSource.sexe)
              .map((g) => (
                <button
                  key={g.id}
                  onClick={() =>
                    lancer(async () => {
                      await fusionnerGroupes(fusionSource.id, g.id);
                      setFusionSource(null);
                    })
                  }
                  className="bg-white border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100"
                >
                  → {g.nom} ({g.nbJeunes})
                </button>
              ))}
            <button
              onClick={() => setFusionSource(null)}
              className="text-slate-500 underline px-2"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupes.map((g) => (
          <div key={g.id} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold">
                {g.nom}{" "}
                <span className="text-xs font-normal text-slate-400">
                  ({g.sexe === "M" ? "Garçons" : "Filles"})
                </span>
              </div>
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${
                  g.nbJeunes > g.capaciteMax
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {g.nbJeunes}/{g.capaciteMax}
              </span>
            </div>
            <div className="text-sm text-slate-500">{g.compagnie ?? "Sans compagnie"}</div>
            <div className="text-sm">
              Conseiller :{" "}
              {peutModifier ? (
                <select
                  value={g.conseillerId ?? ""}
                  onChange={(e) =>
                    lancer(() => reassignerConseiller(g.id, e.target.value || null))
                  }
                  className="rounded-lg border border-slate-300 px-2 py-1 bg-white mt-1 w-full"
                >
                  <option value="">— Aucun —</option>
                  {conseillers
                    .filter((c) => c.sexe === g.sexe)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                        {!c.actif ? " (absent)" : ""}
                      </option>
                    ))}
                </select>
              ) : (
                <span className="font-medium">
                  {g.conseiller ?? "—"}
                  {g.conseiller && !g.conseillerActif && (
                    <span className="text-red-600 text-xs ml-1">(absent)</span>
                  )}
                </span>
              )}
            </div>
            {peutModifier && (
              <button
                onClick={() => setFusionSource(g)}
                className="text-xs text-fsy hover:underline"
              >
                Fusionner ce groupe…
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
