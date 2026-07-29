"use client";

import { useMemo, useState, useTransition } from "react";
import {
  creerActivite,
  modifierActivite,
  deciderModification,
  basculerConfirmation,
  confirmerJournee,
} from "@/lib/actions";
import { activitePourSexe, PUBLIC_LABELS } from "@/lib/roles";
import { Horaire, BadgesActivite } from "@/components/StatutActivite";

type ActiviteVue = {
  id: string;
  titre: string;
  description: string | null;
  debut: string;
  fin: string | null;
  lieu: string | null;
  type: string;
  statut: string;
  publicCible: string;
  cibles: string[];
};

type Proposition = {
  id: string;
  activiteTitre: string;
  proposePar: string;
  nouveauTitre: string | null;
  nouveauDebut: string | null;
  nouveauLieu: string | null;
  nouveauStatut: string | null;
  motif: string | null;
};

const fmtJourCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });
const fmtJourLong = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function Programme({
  activites,
  propositions,
  compagnies,
  groupes,
  peutCreer,
  peutModifierDirect,
  peutProposer,
  peutValider,
  sexesDeMesGroupes,
}: {
  role: string;
  activites: ActiviteVue[];
  propositions: Proposition[];
  compagnies: { id: string; nom: string }[];
  groupes: { id: string; nom: string }[];
  peutCreer: boolean;
  peutModifierDirect: boolean;
  peutProposer: boolean;
  peutValider: boolean;
  sexesDeMesGroupes: string[];
}) {
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);
  const [typeCreation, setTypeCreation] = useState("GENERAL");
  const [pourMoi, setPourMoi] = useState(sexesDeMesGroupes.length > 0);
  const [pending, startTransition] = useTransition();

  // Un conseiller de groupe de filles n'a pas besoin de voir la réunion
  // spirituelle des Jeunes Gens (et inversement)
  const pertinentes = useMemo(() => {
    if (!pourMoi || sexesDeMesGroupes.length === 0) return activites;
    return activites.filter((a) =>
      sexesDeMesGroupes.some((s) => activitePourSexe(a.publicCible, s))
    );
  }, [activites, pourMoi, sexesDeMesGroupes]);

  const jours = useMemo(() => {
    const m = new Map<string, Date>();
    for (const a of pertinentes) {
      const d = new Date(a.debut);
      if (!m.has(d.toDateString())) m.set(d.toDateString(), d);
    }
    return [...m.entries()].sort((a, b) => a[1].getTime() - b[1].getTime());
  }, [pertinentes]);

  const visibles = useMemo(
    () =>
      jourSelectionne
        ? pertinentes.filter((a) => new Date(a.debut).toDateString() === jourSelectionne)
        : pertinentes,
    [pertinentes, jourSelectionne]
  );

  const parJour = useMemo(() => {
    const m = new Map<string, ActiviteVue[]>();
    for (const a of visibles) {
      const cle = new Date(a.debut).toDateString();
      m.set(cle, [...(m.get(cle) ?? []), a]);
    }
    return m;
  }, [visibles]);

  const nbAConfirmer = activites.filter((a) => a.statut === "A_CONFIRMER").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">📅 Programme</h1>
          <p className="text-sm text-slate-500">
            FSY 2026 — « Marche avec moi » (Moïse 6:34)
          </p>
        </div>
        {peutCreer && (
          <button
            onClick={() => setCreation(!creation)}
            className="bg-fsy text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-fsy-dark transition"
          >
            {creation ? "Fermer" : "+ Activité"}
          </button>
        )}
      </div>

      {/* Rappel sur les horaires provisoires */}
      {nbAConfirmer > 0 && (
        <p className="text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
          <strong>{nbAConfirmer} activité(s) « À confirmer »</strong> — structure standard
          d'une journée FSY. Seuls les horaires du jour 4 (réunions spirituelles Jeunes Gens /
          Jeunes Filles et répétition du medley) sont officiels.
          {peutValider && " Corrigez l'horaire ou confirmez-le pour le rendre définitif."}
        </p>
      )}

      {/* Propositions en attente (coordinateurs) */}
      {peutValider && propositions.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
          <h2 className="font-bold text-amber-800">
            Modifications proposées ({propositions.length})
          </h2>
          {propositions.map((p) => (
            <div key={p.id} className="bg-white rounded-lg p-3 text-sm">
              <div className="font-medium">{p.activiteTitre}</div>
              <div className="text-slate-600">
                Proposé par {p.proposePar}
                {p.motif && ` — Motif : ${p.motif}`}
              </div>
              <ul className="text-slate-600 mt-1 list-disc list-inside">
                {p.nouveauTitre && <li>Titre → {p.nouveauTitre}</li>}
                {p.nouveauDebut && (
                  <li>
                    Horaire →{" "}
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(p.nouveauDebut))}
                  </li>
                )}
                {p.nouveauLieu && <li>Lieu → {p.nouveauLieu}</li>}
                {p.nouveauStatut === "ANNULE" && <li className="text-red-600">Annulation</li>}
              </ul>
              <div className="flex gap-2 mt-2">
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => deciderModification(p.id, "VALIDE"))}
                  className="bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700"
                >
                  Valider
                </button>
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => deciderModification(p.id, "REJETE"))}
                  className="bg-red-100 text-red-700 rounded-lg px-3 py-1.5 hover:bg-red-200"
                >
                  Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire de création */}
      {creation && peutCreer && (
        <form
          action={(fd) => {
            startTransition(async () => {
              await creerActivite(fd);
              setCreation(false);
            });
          }}
          className="bg-white rounded-xl shadow-sm p-4 grid sm:grid-cols-2 gap-3 text-sm"
        >
          <input name="titre" required placeholder="Titre de l'activité" className="rounded-lg border border-slate-300 px-3 py-2.5 sm:col-span-2" />
          <input name="debut" type="datetime-local" required className="rounded-lg border border-slate-300 px-3 py-2.5" />
          <input name="lieu" placeholder="Lieu" className="rounded-lg border border-slate-300 px-3 py-2.5" />
          <textarea name="description" placeholder="Description (optionnel)" className="rounded-lg border border-slate-300 px-3 py-2.5 sm:col-span-2" />
          <select
            name="type"
            value={typeCreation}
            onChange={(e) => setTypeCreation(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 bg-white"
          >
            <option value="GENERAL">Générale (tout le monde)</option>
            <option value="COMPAGNIE">Compagnie</option>
            <option value="GROUPE">Un groupe</option>
            <option value="MULTI_GROUPE">Plusieurs groupes</option>
          </select>
          <select name="publicCible" className="rounded-lg border border-slate-300 px-3 py-2.5 bg-white">
            {Object.entries(PUBLIC_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          {typeCreation === "COMPAGNIE" && (
            <select name="compagnieId" className="rounded-lg border border-slate-300 px-3 py-2.5 bg-white">
              {compagnies.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          )}
          {(typeCreation === "GROUPE" || typeCreation === "MULTI_GROUPE") && (
            <select
              name="groupeIds"
              multiple={typeCreation === "MULTI_GROUPE"}
              className="rounded-lg border border-slate-300 px-3 py-2.5 bg-white"
            >
              {groupes.map((g) => (
                <option key={g.id} value={g.id}>{g.nom}</option>
              ))}
            </select>
          )}
          <button
            disabled={pending}
            className="bg-fsy text-white rounded-lg px-4 py-2.5 font-medium sm:col-span-2 hover:bg-fsy-dark disabled:opacity-50"
          >
            Créer l'activité
          </button>
        </form>
      )}

      {/* Filtre par jour */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setJourSelectionne(null)}
          className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
            !jourSelectionne ? "bg-fsy text-white" : "bg-white shadow-sm text-slate-600"
          }`}
        >
          Tout
        </button>
        {jours.map(([cle, date], i) => (
          <button
            key={cle}
            onClick={() => setJourSelectionne(cle)}
            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap capitalize ${
              jourSelectionne === cle ? "bg-fsy text-white" : "bg-white shadow-sm text-slate-600"
            }`}
          >
            J{i + 1} · {fmtJourCourt.format(date)}
          </button>
        ))}
      </div>

      {/* Filtre « pertinentes pour mes groupes » (conseillers) */}
      {sexesDeMesGroupes.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={pourMoi}
            onChange={(e) => setPourMoi(e.target.checked)}
            className="w-4 h-4"
          />
          N'afficher que les activités concernant mes groupes
        </label>
      )}

      {/* Liste des activités par jour */}
      {[...parJour.entries()].map(([cle, liste]) => {
        const aConfirmerCeJour = liste.filter((a) => a.statut === "A_CONFIRMER").length;
        return (
          <section key={cle}>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <h2 className="font-bold text-slate-700 capitalize">
                {fmtJourLong.format(new Date(liste[0].debut))}
              </h2>
              {peutValider && aConfirmerCeJour > 0 && (
                <button
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => confirmerJournee(liste[0].debut))
                  }
                  className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg px-2.5 py-1.5 hover:bg-green-100 disabled:opacity-50"
                >
                  Confirmer la journée ({aConfirmerCeJour})
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {liste.map((a) => (
                <li key={a.id} className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Horaire debut={a.debut} fin={a.fin} />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium ${
                          a.statut === "ANNULE" ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {a.titre}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <BadgesActivite statut={a.statut} publicCible={a.publicCible} />
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {a.lieu ?? "Lieu à confirmer"}
                        {a.cibles.length > 0 && ` — ${a.cibles.join(", ")}`}
                        {a.type === "COMPAGNIE" && a.cibles.length === 0 && " — Par compagnie"}
                      </div>
                      {a.description && (
                        <p className="text-sm text-slate-600 mt-1">{a.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {(peutModifierDirect || peutProposer) && (
                        <button
                          onClick={() => setEditionId(editionId === a.id ? null : a.id)}
                          className="text-sm text-fsy hover:underline"
                        >
                          {peutModifierDirect ? "Modifier" : "Proposer"}
                        </button>
                      )}
                      {peutValider && a.statut === "A_CONFIRMER" && (
                        <button
                          disabled={pending}
                          onClick={() => startTransition(() => basculerConfirmation(a.id))}
                          className="text-xs text-green-700 hover:underline whitespace-nowrap"
                        >
                          Confirmer
                        </button>
                      )}
                    </div>
                  </div>

                  {editionId === a.id && (
                    <form
                      action={(fd) => {
                        startTransition(async () => {
                          await modifierActivite(a.id, fd);
                          setEditionId(null);
                        });
                      }}
                      className="mt-3 border-t border-slate-100 pt-3 grid sm:grid-cols-2 gap-2 text-sm"
                    >
                      <input name="titre" placeholder={`Titre (actuel : ${a.titre})`} className="rounded-lg border border-slate-300 px-3 py-2.5" />
                      <input name="debut" type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2.5" />
                      <input name="lieu" placeholder={`Lieu (actuel : ${a.lieu ?? "—"})`} className="rounded-lg border border-slate-300 px-3 py-2.5" />
                      {!peutModifierDirect && (
                        <input name="motif" placeholder="Motif de la proposition" className="rounded-lg border border-slate-300 px-3 py-2.5" />
                      )}
                      <label className="flex items-center gap-2 text-red-600 py-2">
                        <input type="checkbox" name="annuler" className="w-4 h-4" /> Annuler cette activité
                      </label>
                      <button
                        disabled={pending}
                        className="bg-fsy text-white rounded-lg px-4 py-2.5 font-medium hover:bg-fsy-dark disabled:opacity-50"
                      >
                        {peutModifierDirect ? "Enregistrer" : "Soumettre la proposition"}
                      </button>
                      <p className="sm:col-span-2 text-xs text-slate-500">
                        {peutModifierDirect
                          ? "Laissez un champ vide pour ne pas le changer. Corriger un horaire « À confirmer » le rend définitif."
                          : "Votre proposition sera soumise à la validation des coordinateurs principaux."}
                      </p>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {visibles.length === 0 && (
        <p className="text-slate-500">Aucune activité au programme.</p>
      )}
    </div>
  );
}
