"use client";

import { useMemo, useState, useTransition } from "react";
import {
  validerMouvement,
  annulerDernierMouvement,
  affecterPointageCar,
  retirerPointageCar,
  cloturerEtapeCar,
  rouvrirEtapeCar,
  type ResultatPointage,
} from "@/lib/actions";
import { ETAPES_CAR, type EtapeCar } from "@/lib/etapes-car";
import { ROLE_LABELS, type Role } from "@/lib/roles";

type JeuneCar = {
  id: string;
  nom: string;
  prenom: string;
  sexe: string;
  groupe: string | null;
  statut: string | null; // dernière étape validée, pour le badge
  etapes: string[]; // toutes les étapes déjà validées
  medical: string | null;
  alimentaire: string | null;
};

type Affectation = { etape: string; userId: string; nom: string; role: string };
type Encadrant = { id: string; nom: string; role: string; sexe: string };
type Cloture = { par: string; heure: string; pointes: number };

const COULEURS: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
};

export function ValidationCar({
  car,
  jeunes,
  affectations,
  encadrants,
  droits,
  peutAffecter,
  monId,
  historique,
  clotures,
}: {
  car: { id: string; nom: string; capacite: number; pieu: string };
  jeunes: JeuneCar[];
  affectations: Affectation[];
  encadrants: Encadrant[];
  droits: Record<string, boolean>;
  peutAffecter: boolean;
  monId: string;
  historique: { id: string; type: string; jeune: string; par: string; heure: string }[] | null;
  clotures: Record<string, Cloture | null>;
}) {
  const [recherche, setRecherche] = useState("");
  const [etape, setEtape] = useState<EtapeCar>("MONTEE");
  const [pending, startTransition] = useTransition();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [gestion, setGestion] = useState(false);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return jeunes;
    return jeunes.filter((j) =>
      `${j.prenom} ${j.nom} ${j.groupe ?? ""}`.toLowerCase().includes(q)
    );
  }, [jeunes, recherche]);

  const nbParEtape = (cle: string) => jeunes.filter((j) => j.etapes.includes(cle)).length;
  const pointeursDe = (cle: string) => affectations.filter((a) => a.etape === cle);
  const cloture = clotures[etape] ?? null;
  const jePeuxCocher = (droits[etape] ?? false) && !cloture;
  const etapeCourante = ETAPES_CAR.find((e) => e.cle === etape)!;
  const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const lancer = (fn: () => Promise<void | ResultatPointage>) => {
    setErreur(null);
    startTransition(async () => {
      try {
        const res = await fn();
        if (res && res.ok === false) setErreur(res.motif);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur inattendue");
      }
    });
  };

  function basculer(jeune: JeuneCar) {
    if (!jePeuxCocher || pending) return;
    setEnCours(jeune.id);
    lancer(async () => {
      const res = jeune.etapes.includes(etape)
        ? await annulerDernierMouvement(jeune.id, car.id, etape)
        : await validerMouvement(jeune.id, car.id, etape);
      setEnCours(null);
      return res;
    });
  }

  const badge = (statut: string | null) => {
    const e = ETAPES_CAR.find((x) => x.cle === statut);
    if (!e) return null;
    return (
      <span className={`text-xs rounded-full px-2 py-0.5 ${COULEURS[e.couleur]}`}>{e.badge}</span>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{car.nom}</h1>
        <p className="text-slate-500 text-sm">
          {car.pieu} · {jeunes.length} jeunes attendus · capacité {car.capacite}
        </p>
      </div>

      {erreur && <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{erreur}</p>}

      {/* Étape clôturée : le résultat est figé, et il est dit par qui et quand. */}
      {cloture && (
        <div className="bg-green-50 border border-green-300 text-green-900 rounded-xl p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span>
            🔒 <strong>{etapeCourante.label}</strong> clôturée à{" "}
            {fmtHeure.format(new Date(cloture.heure))} par {cloture.par} —{" "}
            <strong>{cloture.pointes} jeunes pointés</strong> sur {jeunes.length} attendus.
          </span>
          {peutAffecter && (
            <button
              disabled={pending}
              onClick={() => {
                if (confirm("Rouvrir cette étape ? Le pointage redeviendra modifiable."))
                  lancer(() => rouvrirEtapeCar(car.id, etape));
              }}
              className="text-sm underline font-medium disabled:opacity-50"
            >
              Rouvrir
            </button>
          )}
        </div>
      )}

      {/* Clôturer : le pointeur affecté, ou un coordinateur. */}
      {!cloture && jePeuxCocher && (
        <button
          disabled={pending}
          onClick={() => {
            const n = nbParEtape(etape);
            if (
              confirm(
                `Clôturer « ${etapeCourante.label} » avec ${n} jeunes pointés sur ${jeunes.length} attendus ?\n` +
                  "Plus rien ne pourra être modifié ensuite (un coordinateur peut rouvrir)."
              )
            )
              lancer(() => cloturerEtapeCar(car.id, etape));
          }}
          className="w-full bg-white border-2 border-green-500 text-green-700 font-semibold rounded-xl py-2.5 text-sm hover:bg-green-50 disabled:opacity-50"
        >
          🔒 Clôturer « {etapeCourante.label} » — {nbParEtape(etape)}/{jeunes.length} pointés
        </button>
      )}

      {/* Sélecteur d'étape */}
      <div className="flex gap-2 flex-wrap">
        {ETAPES_CAR.map((e) => (
          <button
            key={e.cle}
            onClick={() => setEtape(e.cle)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              etape === e.cle
                ? "bg-fsy text-white"
                : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            }`}
          >
            {e.label} ({nbParEtape(e.cle)}/{jeunes.length})
          </button>
        ))}
      </div>

      {/* Qui coche cette étape */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="font-medium">{etapeCourante.label}</div>
            <p className="text-sm text-slate-500">{etapeCourante.description}</p>
          </div>
          {peutAffecter && (
            <button
              onClick={() => setGestion(!gestion)}
              className="text-sm text-fsy hover:underline shrink-0"
            >
              {gestion ? "Fermer" : "Affecter…"}
            </button>
          )}
        </div>

        <div className="mt-2 text-sm">
          {pointeursDe(etape).length === 0 ? (
            <span className="text-amber-700">
              Personne d&apos;affecté — tout encadrant peut cocher pour le moment. Confiez le
              pointage à une seule personne pour verrouiller.
            </span>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {pointeursDe(etape).map((a) => (
                <li
                  key={a.userId}
                  className="text-xs bg-fsy-light text-fsy-dark rounded-full px-2.5 py-1 flex items-center gap-1.5"
                >
                  {a.nom}
                  <span className="text-fsy/60">
                    {ROLE_LABELS[a.role as Role]?.split(" ")[0]}
                  </span>
                  {a.userId === monId && <strong>· vous</strong>}
                  {peutAffecter && (
                    <button
                      disabled={pending}
                      onClick={() =>
                        lancer(() => retirerPointageCar(car.id, etape, a.userId))
                      }
                      className="text-red-500 hover:text-red-700 ml-0.5"
                      aria-label={`Retirer ${a.nom}`}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {gestion && peutAffecter && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <label className="text-sm text-slate-600">
              Confier « {etapeCourante.label} » à :
              {pointeursDe(etape).length > 0 && (
                <span className="text-slate-400">
                  {" "}
                  (remplace {pointeursDe(etape).map((a) => a.nom).join(", ")} — un seul
                  pointeur à la fois)
                </span>
              )}
            </label>
            <select
              defaultValue=""
              disabled={pending}
              onChange={(e) => {
                const userId = e.target.value;
                e.currentTarget.value = "";
                if (userId) lancer(() => affecterPointageCar(car.id, etape, userId));
              }}
              className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2.5 bg-white text-sm"
            >
              <option value="">— Choisir —</option>
              {encadrants
                .filter((e) => !pointeursDe(etape).some((a) => a.userId === e.id))
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom} — {ROLE_LABELS[e.role as Role] ?? e.role}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Recherche rapide */}
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="🔍 Rechercher un jeune par nom…"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-fsy bg-white"
      />

      {!jePeuxCocher && !cloture && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Le pointage « {etapeCourante.label} » de ce car est confié à{" "}
          {pointeursDe(etape).map((a) => a.nom).join(", ") || "quelqu'un d'autre"} : vous
          suivez en lecture seule, la liste se met à jour toute seule.
        </p>
      )}

      {/* Liste de pointage */}
      <ul className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
        {filtres.length === 0 && (
          <li className="p-4 text-slate-500 text-sm">Aucun jeune trouvé.</li>
        )}
        {filtres.map((j) => {
          const coche = j.etapes.includes(etape);
          return (
            <li key={j.id}>
              <button
                onClick={() => basculer(j)}
                disabled={!jePeuxCocher || pending}
                className="w-full flex items-center gap-3 px-3 py-3.5 text-left hover:bg-slate-50 active:bg-slate-100 transition disabled:cursor-default"
              >
                <span
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-white text-sm shrink-0 ${
                    coche ? "bg-green-500 border-green-500" : "border-slate-300"
                  } ${enCours === j.id ? "animate-pulse" : ""}`}
                >
                  {coche && "✓"}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium block sm:inline">
                    {j.prenom} {j.nom}
                  </span>
                  <span className="text-sm text-slate-500 sm:ml-2">
                    {j.sexe === "M" ? "Garçon" : "Fille"}
                    {j.groupe && ` — ${j.groupe}`}
                  </span>
                  {(j.medical || j.alimentaire) && (
                    <span className="block text-xs text-red-700 mt-0.5">
                      {j.medical && `⚕️ ${j.medical}`}
                      {j.medical && j.alimentaire && " · "}
                      {j.alimentaire && `🍽 ${j.alimentaire}`}
                    </span>
                  )}
                </span>
                {badge(j.statut)}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Historique */}
      {historique && (
        <details className="bg-white rounded-xl shadow-sm p-4">
          <summary className="font-bold cursor-pointer">
            Historique des validations ({historique.length})
          </summary>
          <ul className="mt-3 space-y-1 text-sm">
            {historique.map((h) => (
              <li key={h.id} className="flex justify-between gap-2 text-slate-600">
                <span>
                  {ETAPES_CAR.find((e) => e.cle === h.type)?.badge.split(" ")[0]} {h.jeune}
                  <span className="text-slate-400"> par {h.par}</span>
                </span>
                <span className="text-slate-400 font-mono whitespace-nowrap">
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(h.heure))}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
