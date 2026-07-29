"use client";

import { useMemo, useState, useTransition } from "react";
import {
  creerActivite,
  modifierActivite,
  deciderModification,
} from "@/lib/actions";

type ActiviteVue = {
  id: string;
  titre: string;
  description: string | null;
  debut: string;
  lieu: string | null;
  type: string;
  statut: string;
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

const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtJour = new Intl.DateTimeFormat("fr-FR", {
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
}) {
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);
  const [typeCreation, setTypeCreation] = useState("GENERAL");
  const [pending, startTransition] = useTransition();

  const jours = useMemo(() => {
    const set = new Map<string, Date>();
    for (const a of activites) {
      const d = new Date(a.debut);
      const cle = d.toDateString();
      if (!set.has(cle)) set.set(cle, d);
    }
    return [...set.entries()].sort((a, b) => a[1].getTime() - b[1].getTime());
  }, [activites]);

  const visibles = useMemo(
    () =>
      jourSelectionne
        ? activites.filter((a) => new Date(a.debut).toDateString() === jourSelectionne)
        : activites,
    [activites, jourSelectionne]
  );

  const parJour = useMemo(() => {
    const m = new Map<string, ActiviteVue[]>();
    for (const a of visibles) {
      const cle = new Date(a.debut).toDateString();
      m.set(cle, [...(m.get(cle) ?? []), a]);
    }
    return m;
  }, [visibles]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">📅 Programme</h1>
        {peutCreer && (
          <button
            onClick={() => setCreation(!creation)}
            className="bg-fsy text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-fsy-dark transition"
          >
            {creation ? "Fermer" : "+ Nouvelle activité"}
          </button>
        )}
      </div>

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
                  className="bg-green-600 text-white rounded-lg px-3 py-1 hover:bg-green-700"
                >
                  Valider
                </button>
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => deciderModification(p.id, "REJETE"))}
                  className="bg-red-100 text-red-700 rounded-lg px-3 py-1 hover:bg-red-200"
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
          <input name="titre" required placeholder="Titre de l'activité" className="rounded-lg border border-slate-300 px-3 py-2 sm:col-span-2" />
          <input name="debut" type="datetime-local" required className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="lieu" placeholder="Lieu" className="rounded-lg border border-slate-300 px-3 py-2" />
          <textarea name="description" placeholder="Description (optionnel)" className="rounded-lg border border-slate-300 px-3 py-2 sm:col-span-2" />
          <select
            name="type"
            value={typeCreation}
            onChange={(e) => setTypeCreation(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 bg-white"
          >
            <option value="GENERAL">Générale (tout le monde)</option>
            <option value="COMPAGNIE">Compagnie</option>
            <option value="GROUPE">Un groupe</option>
            <option value="MULTI_GROUPE">Plusieurs groupes</option>
          </select>
          {typeCreation === "COMPAGNIE" && (
            <select name="compagnieId" className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
              {compagnies.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          )}
          {(typeCreation === "GROUPE" || typeCreation === "MULTI_GROUPE") && (
            <select
              name="groupeIds"
              multiple={typeCreation === "MULTI_GROUPE"}
              className="rounded-lg border border-slate-300 px-3 py-2 bg-white"
            >
              {groupes.map((g) => (
                <option key={g.id} value={g.id}>{g.nom}</option>
              ))}
            </select>
          )}
          <button
            disabled={pending}
            className="bg-fsy text-white rounded-lg px-4 py-2 font-medium sm:col-span-2 hover:bg-fsy-dark disabled:opacity-50"
          >
            Créer l'activité
          </button>
        </form>
      )}

      {/* Filtre par jour */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setJourSelectionne(null)}
          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
            !jourSelectionne ? "bg-fsy text-white" : "bg-white shadow-sm text-slate-600"
          }`}
        >
          Tout
        </button>
        {jours.map(([cle, date]) => (
          <button
            key={cle}
            onClick={() => setJourSelectionne(cle)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap capitalize ${
              jourSelectionne === cle ? "bg-fsy text-white" : "bg-white shadow-sm text-slate-600"
            }`}
          >
            {fmtJour.format(date)}
          </button>
        ))}
      </div>

      {/* Liste des activités par jour */}
      {[...parJour.entries()].map(([cle, liste]) => (
        <section key={cle}>
          <h2 className="font-bold text-slate-700 capitalize mb-2">
            {fmtJour.format(new Date(liste[0].debut))}
          </h2>
          <ul className="space-y-2">
            {liste.map((a) => (
              <li key={a.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-sm bg-fsy-light text-fsy-dark rounded px-2 py-0.5 mt-0.5">
                    {fmtHeure.format(new Date(a.debut))}
                  </span>
                  <div className="flex-1">
                    <div
                      className={`font-medium ${
                        a.statut === "ANNULE" ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {a.titre}
                      {a.statut === "ANNULE" && (
                        <span className="ml-2 text-xs text-red-600 no-underline">Annulée</span>
                      )}
                      {a.statut === "MODIFIE" && (
                        <span className="ml-2 text-xs text-amber-600">Modifiée</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      {a.lieu ?? "Lieu à confirmer"}
                      {a.cibles.length > 0 && ` — ${a.cibles.join(", ")}`}
                      {a.type === "GENERAL" && " — Tout le monde"}
                    </div>
                    {a.description && (
                      <p className="text-sm text-slate-600 mt-1">{a.description}</p>
                    )}
                  </div>
                  {(peutModifierDirect || peutProposer) && (
                    <button
                      onClick={() => setEditionId(editionId === a.id ? null : a.id)}
                      className="text-sm text-fsy hover:underline shrink-0"
                    >
                      {peutModifierDirect ? "Modifier" : "Proposer"}
                    </button>
                  )}
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
                    <input name="titre" placeholder={`Titre (actuel : ${a.titre})`} className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input name="debut" type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2" />
                    <input name="lieu" placeholder={`Lieu (actuel : ${a.lieu ?? "—"})`} className="rounded-lg border border-slate-300 px-3 py-2" />
                    {!peutModifierDirect && (
                      <input name="motif" placeholder="Motif de la proposition" className="rounded-lg border border-slate-300 px-3 py-2" />
                    )}
                    <label className="flex items-center gap-2 text-red-600">
                      <input type="checkbox" name="annuler" /> Annuler cette activité
                    </label>
                    <button
                      disabled={pending}
                      className="bg-fsy text-white rounded-lg px-4 py-2 font-medium hover:bg-fsy-dark disabled:opacity-50"
                    >
                      {peutModifierDirect ? "Enregistrer" : "Soumettre la proposition"}
                    </button>
                    {!peutModifierDirect && (
                      <p className="sm:col-span-2 text-xs text-slate-500">
                        Votre proposition sera soumise à la validation des coordinateurs
                        principaux.
                      </p>
                    )}
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {visibles.length === 0 && (
        <p className="text-slate-500">Aucune activité au programme.</p>
      )}
    </div>
  );
}
