"use client";

import { useMemo, useState, useTransition } from "react";
import { deplacerJeune } from "@/lib/actions";
import { anniversairePendantConference } from "@/lib/anniversaires-client";

type Jeune = {
  id: string;
  nom: string;
  prenom: string;
  sexe: string;
  pieu: string;
  paroisse: string | null;
  groupeId: string | null;
  groupe: string | null;
  dateNaissance: string | null;
  dateNaissanceBrute: string | null;
  tailleTshirt: string | null;
  statutInscription: string;
  motifHorsCriteres: string | null;
  ageConference: number | null;
  medical: string | null;
  alimentaire: string | null;
  contactNom: string | null;
  contactTelephone: string | null;
};

const fmtAnniv = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export function RechercheJeunes({
  jeunes,
  groupes,
  portee,
  peutReassigner,
}: {
  jeunes: Jeune[];
  groupes: { id: string; nom: string; sexe: string }[];
  portee: string;
  peutReassigner: boolean;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<
    "TOUS" | "ANNIVERSAIRE" | "MEDICAL" | "HORS_CRITERES" | "SANS_GROUPE"
  >("TOUS");
  const [, startTransition] = useTransition();

  const compteurs = useMemo(
    () => ({
      anniversaire: jeunes.filter(
        (j) => j.dateNaissance && anniversairePendantConference(new Date(j.dateNaissance))
      ).length,
      medical: jeunes.filter((j) => j.medical || j.alimentaire).length,
      horsCriteres: jeunes.filter((j) => j.motifHorsCriteres).length,
      sansGroupe: jeunes.filter((j) => !j.groupeId).length,
    }),
    [jeunes]
  );

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return jeunes.filter((j) => {
      if (
        filtre === "ANNIVERSAIRE" &&
        !(j.dateNaissance && anniversairePendantConference(new Date(j.dateNaissance)))
      )
        return false;
      if (filtre === "MEDICAL" && !j.medical && !j.alimentaire) return false;
      if (filtre === "HORS_CRITERES" && !j.motifHorsCriteres) return false;
      if (filtre === "SANS_GROUPE" && j.groupeId) return false;
      if (!q) return true;
      return `${j.prenom} ${j.nom} ${j.pieu} ${j.paroisse ?? ""} ${j.groupe ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [jeunes, recherche, filtre]);

  const onglets = [
    { cle: "TOUS" as const, label: `Tous (${jeunes.length})` },
    { cle: "ANNIVERSAIRE" as const, label: `🎂 Anniversaires (${compteurs.anniversaire})` },
    { cle: "MEDICAL" as const, label: `⚕️ À suivre (${compteurs.medical})` },
    { cle: "HORS_CRITERES" as const, label: `⚠️ Hors critères (${compteurs.horsCriteres})` },
    { cle: "SANS_GROUPE" as const, label: `Sans groupe (${compteurs.sansGroupe})` },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Jeunes</h1>
        <p className="text-slate-500 text-sm">
          {portee} — {jeunes.length} au total
        </p>
      </div>

      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="🔍 Rechercher par nom, pieu, paroisse ou groupe…"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fsy bg-white"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {onglets.map((o) => (
          <button
            key={o.cle}
            onClick={() => setFiltre(o.cle)}
            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
              filtre === o.cle ? "bg-fsy text-white" : "bg-white shadow-sm text-slate-600"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {filtres.map((j) => {
          const anniv =
            j.dateNaissance && anniversairePendantConference(new Date(j.dateNaissance));
          const annule = j.statutInscription === "Annulé(e)";
          return (
            <li
              key={j.id}
              className={`bg-white rounded-xl shadow-sm p-3 ${annule ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={`font-medium ${annule ? "line-through" : ""}`}>
                    {j.prenom} {j.nom}
                  </div>
                  <div className="text-sm text-slate-500">
                    {j.ageConference !== null && `${j.ageConference} ans · `}
                    {j.sexe === "M" ? "Garçon" : "Fille"}
                    {j.tailleTshirt && ` · T-shirt ${j.tailleTshirt}`}
                  </div>
                  <div className="text-sm text-slate-500">
                    {j.pieu}
                    {j.paroisse && ` · ${j.paroisse}`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {peutReassigner ? (
                    <select
                      value={j.groupeId ?? ""}
                      onChange={(e) =>
                        startTransition(() => deplacerJeune(j.id, e.target.value || null))
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1.5 bg-white text-sm max-w-[8rem]"
                    >
                      <option value="">— Aucun —</option>
                      {groupes
                        .filter((g) => g.sexe === j.sexe)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nom}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <span className="text-sm font-medium">{j.groupe ?? "—"}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {anniv && (
                  <span className="text-xs bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                    🎂 {fmtAnniv.format(new Date(j.dateNaissance!))}
                  </span>
                )}
                {annule && (
                  <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                    Inscription annulée
                  </span>
                )}
                {j.motifHorsCriteres && (
                  <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                    ⚠️ {j.motifHorsCriteres}
                    {j.dateNaissanceBrute && ` (« ${j.dateNaissanceBrute} »)`}
                  </span>
                )}
                {j.statutInscription.startsWith("En attente") && (
                  <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                    En attente d'approbation
                  </span>
                )}
                {j.alimentaire && (
                  <span className="text-xs bg-orange-100 text-orange-800 rounded-full px-2 py-0.5">
                    🍽 {j.alimentaire}
                  </span>
                )}
                {j.medical && (
                  <span className="text-xs bg-red-50 text-red-700 rounded-full px-2 py-0.5">
                    ⚕️ {j.medical}
                  </span>
                )}
              </div>

              {j.contactNom && (
                <div className="text-xs text-slate-400 mt-1.5">
                  Contact : {j.contactNom}
                  {j.contactTelephone && ` · ${j.contactTelephone}`}
                </div>
              )}
            </li>
          );
        })}
        {filtres.length === 0 && <p className="text-slate-500">Aucun jeune trouvé.</p>}
      </ul>
    </div>
  );
}
