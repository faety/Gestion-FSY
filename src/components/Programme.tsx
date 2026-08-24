"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CONFERENCE, LIEU } from "@/lib/theme";
import {
  creerActivite,
  modifierActivite,
  deciderModification,
  basculerConfirmation,
  confirmerJournee,
} from "@/lib/actions";
import {
  activitePourMoi,
  monRoleActivite,
  PUBLIC_LABELS,
  TYPE_LABELS,
  TYPES_CREATION,
} from "@/lib/roles";
import { jourParDefaut } from "@/lib/jours";
import { Horaire, BadgesActivite, BadgeRole } from "@/components/StatutActivite";
import { OrdreDuJourSuggere } from "@/components/OrdreDuJourSuggere";

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
  pourEncadrants: boolean;
  roleConseiller: string;
  roleAdjoint: string;
  roleCoordinateur: string;
  roleDirigeant: string;
  compagnieId: string | null;
  groupeIds: string[];
  cibles: string[];
};

type Proposition = {
  id: string;
  activiteTitre: string;
  proposePar: string;
  nouveauTitre: string | null;
  nouveauDebut: string | null;
  nouvelleFin: string | null;
  nouveauLieu: string | null;
  nouveauStatut: string | null;
  motif: string | null;
};

type Journee = {
  numero: number;
  date: string;
  tenue: string | null;
  tenueEncadrants: string | null;
  note: string | null;
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
  journees,
  mesGroupes,
  role,
  peutCreer,
  peutModifierDirect,
  peutProposer,
  peutValider,
  maintenant,
}: {
  activites: ActiviteVue[];
  propositions: Proposition[];
  compagnies: { id: string; nom: string }[];
  groupes: { id: string; nom: string }[];
  journees: Journee[];
  mesGroupes: { id: string; sexe: string; compagnieId: string | null }[];
  role: string;
  peutCreer: boolean;
  peutModifierDirect: boolean;
  peutProposer: boolean;
  peutValider: boolean;
  /** L'instant présent, lu sur le serveur : un téléphone mal réglé ne doit pas
   *  ouvrir le programme sur le mauvais jour. */
  maintenant: number;
}) {
  // Le jour ouvert au départ est celui d'aujourd'hui, sans que personne ait
  // à le chercher : pendant la conférence, c'est ce que l'on vient voir. Hors
  // conférence, aucun jour ne correspond et la vue d'ensemble reste.
  //
  // `undefined` veut dire « personne n'a encore choisi » : le jour se déduit
  // alors de la date. Dès qu'une pastille est touchée — « Tout » compris — le
  // choix de la personne l'emporte pour le reste de la visite.
  const [choixJour, setChoixJour] = useState<string | null | undefined>(undefined);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);
  const [typeCreation, setTypeCreation] = useState("GENERAL");
  const [pourMoi, setPourMoi] = useState(true);
  const [pending, startTransition] = useTransition();

  // Journée (numéro + tenue) par date, pour l'en-tête de chaque jour
  const journeeParDate = useMemo(() => {
    const m = new Map<string, Journee>();
    for (const j of journees) m.set(new Date(j.date).toDateString(), j);
    return m;
  }, [journees]);

  const pertinentes = useMemo(() => {
    if (!pourMoi) return activites;
    return activites.filter((a) => activitePourMoi(a, role, mesGroupes));
  }, [activites, pourMoi, role, mesGroupes]);

  const jours = useMemo(() => {
    const m = new Map<string, Date>();
    for (const a of pertinentes) {
      const d = new Date(a.debut);
      if (!m.has(d.toDateString())) m.set(d.toDateString(), d);
    }
    return [...m.entries()].sort((a, b) => a[1].getTime() - b[1].getTime());
  }, [pertinentes]);

  // La clé du jour d'aujourd'hui, dans le même repère que les journées
  // affichées — les deux se lisent dans le fuseau de l'appareil, elles ne
  // peuvent donc pas se décaler l'une par rapport à l'autre.
  const cleAujourdhui = useMemo(() => new Date(maintenant).toDateString(), [maintenant]);

  // Hors conférence — ou si la journée du jour ne contient rien qui me
  // concerne — aucune pastille ne correspond : la vue d'ensemble reste.
  const jourSelectionne =
    choixJour !== undefined ? choixJour : jourParDefaut(jours.map(([cle]) => cle), maintenant);

  // Sept journées ne tiennent pas dans la largeur d'un téléphone : sans cela,
  // le programme s'ouvrirait sur J5 avec une pastille active hors de l'écran,
  // et l'on croirait être resté sur « Tout ». Seule la barre défile, jamais la
  // page — et une seule fois, à l'ouverture : toucher une pastille ne doit
  // rien déplacer sous le doigt.
  const refBarreJours = useRef<HTMLDivElement>(null);
  const refJourActif = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const barre = refBarreJours.current;
    const actif = refJourActif.current;
    if (!barre || !actif) return;
    barre.scrollLeft = actif.offsetLeft - barre.clientWidth / 2 + actif.clientWidth / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {/* L'étendue du programme, veille comprise : elle commence un jour
              avant la conférence des jeunes, quand les encadrants arrivent. */}
          <p className="text-sm font-medium text-slate-700">
            {CONFERENCE.duAuAvecVeille.replace(/^du /, "Du ")} · {LIEU.nom}
          </p>
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

      <p className="text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
        Horaires officiels du <strong>manuel du participant</strong> et du{" "}
        <strong>manuel de l'encadrant</strong> FSY 2026. Le badge{" "}
        <span className="bg-fsy text-white rounded-full px-2 py-0.5 text-xs font-medium">
          ★ Vous dirigez
        </span>{" "}
        signale les activités dont vous êtes responsable.
        {nbAConfirmer > 0 && (
          <>
            {" "}
            <strong>{nbAConfirmer} activité(s) « À confirmer »</strong> : horaires de la
            veille et lieux, à renseigner pour le {LIEU.nom}.
          </>
        )}
      </p>

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
                {p.nouvelleFin && (
                  <li>
                    Fin →{" "}
                    {new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(
                      new Date(p.nouvelleFin)
                    )}
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
            {TYPES_CREATION.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select name="publicCible" className="rounded-lg border border-slate-300 px-3 py-2.5 bg-white">
            {Object.entries(PUBLIC_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          {typeCreation === "COMPAGNIE" && (
            <select name="compagnieId" className="rounded-lg border border-slate-300 px-3 py-2.5 bg-white sm:col-span-2">
              {compagnies.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          )}
          {(typeCreation === "GROUPE" || typeCreation === "MULTI_GROUPE") && (
            <select
              name="groupeIds"
              multiple={typeCreation === "MULTI_GROUPE"}
              className="rounded-lg border border-slate-300 px-3 py-2.5 bg-white sm:col-span-2"
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

      {/* Filtre par jour — ouvert sur aujourd'hui pendant la conférence */}
      <div ref={refBarreJours} className="flex gap-2 overflow-x-auto pb-1">
        <button
          ref={jourSelectionne === null ? refJourActif : undefined}
          onClick={() => setChoixJour(null)}
          className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
            !jourSelectionne ? "bg-fsy text-white" : "bg-white shadow-sm text-slate-600"
          }`}
        >
          Tout
        </button>
        {jours.map(([cle, date]) => {
          const libelle = `${
            journeeParDate.get(cle)?.numero === 0
              ? "Veille"
              : `J${journeeParDate.get(cle)?.numero ?? "?"}`
          } · ${fmtJourCourt.format(date)}`;
          const cEstAujourdhui = cle === cleAujourdhui;
          return (
            <button
              key={cle}
              ref={jourSelectionne === cle ? refJourActif : undefined}
              onClick={() => setChoixJour(cle)}
              aria-current={cEstAujourdhui ? "date" : undefined}
              aria-label={cEstAujourdhui ? `${libelle} — aujourd'hui` : libelle}
              title={cEstAujourdhui ? "Aujourd'hui" : undefined}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap capitalize flex items-center gap-1.5 ${
                jourSelectionne === cle ? "bg-fsy text-white" : "bg-white shadow-sm text-slate-600"
              }`}
            >
              {/* Le point dit pourquoi c'est ce jour-là qui s'est ouvert. */}
              {cEstAujourdhui && (
                <span
                  aria-hidden
                  className={`w-1.5 h-1.5 rounded-full ${
                    jourSelectionne === cle ? "bg-white" : "bg-fsy"
                  }`}
                />
              )}
              {libelle}
            </button>
          );
        })}
      </div>

      {/* Filtre : n'afficher que ce qui me concerne */}
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={pourMoi}
          onChange={(e) => setPourMoi(e.target.checked)}
          className="w-4 h-4"
        />
        N'afficher que les activités qui me concernent
      </label>

      {/* Liste des activités par jour */}
      {[...parJour.entries()].map(([cle, liste]) => {
        const journee = journeeParDate.get(cle);
        const aConfirmerCeJour = liste.filter((a) => a.statut === "A_CONFIRMER").length;
        return (
          <section key={cle}>
            <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
              <div>
                <h2 className="font-bold text-slate-700 capitalize">
                  {journee &&
                    (journee.numero === 0 ? "Veille — " : `Jour ${journee.numero} — `)}
                  {fmtJourLong.format(new Date(liste[0].debut))}
                </h2>
                {journee?.tenueEncadrants && (
                  <p className="text-sm text-fsy">
                    👕 {journee.tenueEncadrants}
                    {journee.tenue && journee.tenue !== journee.tenueEncadrants && (
                      <span className="text-slate-400"> · jeunes : {journee.tenue}</span>
                    )}
                  </p>
                )}
              </div>
              {peutValider && aConfirmerCeJour > 0 && (
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => confirmerJournee(liste[0].debut))}
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
                        <BadgeRole role={monRoleActivite(role, a)} />
                        <BadgesActivite
                          statut={a.statut}
                          publicCible={a.publicCible}
                          type={a.type}
                          pourEncadrants={a.pourEncadrants}
                        />
                      </div>
                      {(a.lieu || a.cibles.length > 0) && (
                        <div className="text-sm text-slate-500 mt-1">
                          {a.lieu}
                          {a.cibles.length > 0 && `${a.lieu ? " — " : ""}${a.cibles.join(", ")}`}
                        </div>
                      )}
                      {a.description && (
                        <p className="text-sm text-slate-600 mt-1">{a.description}</p>
                      )}
                      {a.statut !== "ANNULE" && (
                        <OrdreDuJourSuggere
                          titre={a.titre}
                          jour={journee?.numero}
                          debut={a.debut}
                        />
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
                    <FormulaireActivite
                      activite={a}
                      duJour={liste}
                      peutModifierDirect={peutModifierDirect}
                      fermer={() => setEditionId(null)}
                    />
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

// ---------- Formulaire de modification d'une activité ----------
//
// Trois exigences du terrain, sur téléphone : les heures se modifient (début
// et fin — le jour, lui, ne change pas d'ici) ; le chevauchement avec le reste
// de la journée se voit pendant la saisie, avant d'enregistrer ; et l'on peut
// toujours ressortir sans rien toucher — croix, bouton Annuler, et un
// enregistrement sans changement est refusé avec le mot pour le dire.
const enHeure = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const enMinutes = (heure: string): number | null => {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(heure);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

function FormulaireActivite({
  activite,
  duJour,
  peutModifierDirect,
  fermer,
}: {
  activite: ActiviteVue;
  duJour: ActiviteVue[];
  peutModifierDirect: boolean;
  fermer: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [heureDebut, setHeureDebut] = useState(enHeure(activite.debut));
  const [heureFin, setHeureFin] = useState(activite.fin ? enHeure(activite.fin) : "");
  const [message, setMessage] = useState<string | null>(null);

  // Chevauchements avec le reste de la journée, calculés pendant la saisie.
  // Une information, pas un interdit : bien des activités se tiennent en
  // parallèle (répétitions, réunions par niveau) — mais qu'on le sache.
  const debutMin = enMinutes(heureDebut);
  const finMin = heureFin ? enMinutes(heureFin) : null;
  const chevauchements =
    debutMin === null
      ? []
      : duJour.filter((autre) => {
          if (autre.id === activite.id || autre.statut === "ANNULE") return false;
          const d = enMinutes(enHeure(autre.debut))!;
          const f = autre.fin ? enMinutes(enHeure(autre.fin))! : d + 1;
          const fin = finMin ?? debutMin + 1;
          return debutMin < f && d < fin;
        });

  return (
    <form
      action={(fd) => {
        setMessage(null);
        startTransition(async () => {
          const res = await modifierActivite(activite.id, fd);
          if (res.ok) fermer();
          else setMessage(res.motif);
        });
      }}
      className="mt-3 border-t border-slate-100 pt-3 space-y-2 text-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-700">
          {peutModifierDirect ? "Modifier" : "Proposer une modification"}
        </span>
        <button
          type="button"
          onClick={fermer}
          aria-label="Fermer sans modifier"
          className="text-slate-400 hover:text-slate-600 text-lg leading-none px-2 py-1"
        >
          ✕
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <input
          name="titre"
          defaultValue={activite.titre}
          className="rounded-lg border border-slate-300 px-3 py-2.5"
        />
        <input
          name="lieu"
          defaultValue={activite.lieu ?? ""}
          placeholder="Lieu"
          className="rounded-lg border border-slate-300 px-3 py-2.5"
        />
        <label className="flex items-center gap-2">
          <span className="text-slate-500 w-14 shrink-0">Début</span>
          <input
            name="heureDebut"
            type="time"
            value={heureDebut}
            onChange={(e) => {
              setHeureDebut(e.target.value);
              setMessage(null);
            }}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-slate-500 w-14 shrink-0">Fin</span>
          <input
            name="heureFin"
            type="time"
            value={heureFin}
            onChange={(e) => {
              setHeureFin(e.target.value);
              setMessage(null);
            }}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </label>
        {!peutModifierDirect && (
          <input
            name="motif"
            placeholder="Motif de la proposition"
            className="rounded-lg border border-slate-300 px-3 py-2.5 sm:col-span-2"
          />
        )}
        <label className="flex items-center gap-2 text-red-600 py-1 sm:col-span-2">
          <input type="checkbox" name="annuler" className="w-4 h-4" /> Annuler cette activité
        </label>
      </div>

      {debutMin !== null && finMin !== null && finMin <= debutMin && (
        <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">
          L'heure de fin doit venir après l'heure de début.
        </p>
      )}

      {chevauchements.length > 0 && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <span className="font-medium">Sur ce créneau se tiennent aussi :</span>{" "}
          {chevauchements
            .slice(0, 4)
            .map(
              (autre) =>
                `${autre.titre} (${enHeure(autre.debut)}${autre.fin ? `–${enHeure(autre.fin)}` : ""})`
            )
            .join(" · ")}
          {chevauchements.length > 4 && ` · et ${chevauchements.length - 4} autre(s)`}
        </div>
      )}

      {message && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          {message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={fermer}
          className="flex-1 bg-slate-100 text-slate-600 rounded-lg px-4 py-2.5 font-medium hover:bg-slate-200"
        >
          Annuler
        </button>
        <button
          disabled={pending}
          className="flex-1 bg-fsy text-white rounded-lg px-4 py-2.5 font-medium hover:bg-fsy-dark disabled:opacity-50"
        >
          {pending ? "…" : peutModifierDirect ? "Enregistrer" : "Soumettre"}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {peutModifierDirect
          ? "Seul ce qui diffère de l'existant sera changé — le jour de l'activité ne bouge pas d'ici."
          : "Votre proposition sera soumise à la validation des coordinateurs principaux."}
      </p>
    </form>
  );
}
