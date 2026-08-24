"use client";

import { useMemo, useState, useTransition } from "react";

// Nombre de fiches rendues d'un coup
const PAGE = 40;
import { constaterAppelJeune, deplacerJeune } from "@/lib/actions";
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
  presenceManuelle: boolean;
  absenceConstatee: boolean;
  ajouteSurPlace: boolean;
  /** Pointé à la montée d'un car : l'avertissement au moment de le barrer. */
  pointeCar: boolean;
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
  peutAppeler,
}: {
  jeunes: Jeune[];
  groupes: { id: string; nom: string; sexe: string }[];
  portee: string;
  peutReassigner: boolean;
  /** L'appel : marquer présent/absent — le conseiller sur son groupe. */
  peutAppeler: boolean;
}) {
  const [recherche, setRecherche] = useState("");
  // 650 fiches rendues d'un coup pesaient plus de deux mégaoctets de HTML, et
  // le téléphone mettait plus d'une seconde à les afficher. On n'en rend qu'une
  // page à la fois ; la recherche, elle, porte toujours sur la liste entière.
  const [limite, setLimite] = useState(PAGE);
  const [filtre, setFiltre] = useState<
    "TOUS" | "ANNIVERSAIRE" | "MEDICAL" | "HORS_CRITERES" | "SANS_GROUPE"
  >("TOUS");
  const [pending, startTransition] = useTransition();

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

  // Toute nouvelle recherche ou tout changement d'onglet ramène à la première page
  const chercher = (v: string) => {
    setRecherche(v);
    setLimite(PAGE);
  };
  const choisirFiltre = (v: typeof filtre) => {
    setFiltre(v);
    setLimite(PAGE);
  };

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
        onChange={(e) => chercher(e.target.value)}
        placeholder="🔍 Rechercher par nom, pieu, paroisse ou groupe…"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fsy bg-white"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {onglets.map((o) => (
          <button
            key={o.cle}
            onClick={() => choisirFiltre(o.cle)}
            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
              filtre === o.cle ? "bg-fsy text-white" : "bg-white shadow-sm text-slate-600"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        {filtres.length} jeune{filtres.length > 1 ? "s" : ""}
        {filtres.length > limite && ` · ${limite} affichés`}
      </p>

      <ul className="space-y-2">
        {filtres.slice(0, limite).map((j) => {
          const anniv =
            j.dateNaissance && anniversairePendantConference(new Date(j.dateNaissance));
          const annule = j.statutInscription === "Annulé(e)";
          const barre = annule || j.absenceConstatee;
          return (
            <li
              key={j.id}
              className={`bg-white rounded-xl shadow-sm p-3 ${barre ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={`font-medium ${barre ? "line-through text-slate-500" : ""}`}>
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
                {j.absenceConstatee && (
                  <span className="text-xs bg-slate-200 text-slate-700 rounded-full px-2 py-0.5">
                    Absent(e) — constaté à l&apos;appel
                  </span>
                )}
                {j.ajouteSurPlace && (
                  <span className="text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">
                    Ajouté(e) sur place
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

              {peutAppeler && !annule && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {j.absenceConstatee ? (
                    <button
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await constaterAppelJeune(j.id, true);
                        })
                      }
                      className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium disabled:opacity-50"
                    >
                      ↺ Finalement présent(e)
                    </button>
                  ) : (
                    <button
                      disabled={pending}
                      onClick={() => {
                        // Un enfant pointé à la montée du car et pourtant
                        // absent du groupe : le barrer est peut-être juste
                        // (pointage erroné, enfant reparti), mais il faut le
                        // savoir avant de confirmer.
                        if (
                          j.pointeCar &&
                          !confirm(
                            `⚠️ ${j.prenom} ${j.nom} a été pointé(e) PRÉSENT(E) à la montée du car.\n\n` +
                              "Si vous le/la barrez, votre constat sur place l'emporte : " +
                              "l'enfant sera compté(e) absent(e) partout, y compris pour la réorganisation.\n\n" +
                              "Confirmer l'absence ?"
                          )
                        )
                          return;
                        startTransition(async () => {
                          await constaterAppelJeune(j.id, false);
                        });
                      }}
                      className="text-sm bg-white border border-slate-300 text-slate-600 rounded-lg px-3 py-1.5 disabled:opacity-50"
                    >
                      Barrer — absent(e)
                    </button>
                  )}
                  {j.pointeCar && !j.absenceConstatee && (
                    <span className="text-xs text-green-700">🚌 pointé(e) au car</span>
                  )}
                  {j.presenceManuelle && !j.pointeCar && !j.absenceConstatee && (
                    <span className="text-xs text-green-700">✓ présent(e), constaté sur place</span>
                  )}
                </div>
              )}

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

      {filtres.length > limite && (
        <button
          onClick={() => setLimite((n) => n + PAGE)}
          className="w-full bg-white shadow-sm hover:bg-slate-50 rounded-xl py-3 text-sm font-medium text-fsy transition"
        >
          Afficher {Math.min(PAGE, filtres.length - limite)} jeunes de plus
          <span className="text-slate-400 font-normal">
            {" "}
            ({filtres.length - limite} restants)
          </span>
        </button>
      )}
    </div>
  );
}
