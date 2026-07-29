"use client";

import { useMemo, useState, useTransition } from "react";
import { validerMouvement, annulerDernierMouvement } from "@/lib/actions";

type JeuneCar = {
  id: string;
  nom: string;
  prenom: string;
  sexe: string;
  groupe: string | null;
  statut: string | null; // dernier mouvement : MONTEE | ARRIVEE | DEPART | null
};

const ETAPES = [
  { type: "MONTEE", label: "Montée au pieu", badge: "🚌 Monté", couleur: "blue" },
  { type: "ARRIVEE", label: "Arrivée au site", badge: "✅ Arrivé", couleur: "green" },
  { type: "DEPART", label: "Départ du site", badge: "🏠 Parti", couleur: "orange" },
] as const;

export function ValidationCar({
  car,
  jeunes,
  historique,
  peutValider,
}: {
  car: { id: string; nom: string; capacite: number; responsable: string | null };
  jeunes: JeuneCar[];
  historique: { id: string; type: string; jeune: string; par: string; heure: string }[] | null;
  peutValider: boolean;
}) {
  const [recherche, setRecherche] = useState("");
  const [etape, setEtape] = useState<"MONTEE" | "ARRIVEE" | "DEPART">("MONTEE");
  const [pending, startTransition] = useTransition();
  const [enCours, setEnCours] = useState<string | null>(null);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return jeunes;
    return jeunes.filter((j) =>
      `${j.prenom} ${j.nom} ${j.groupe ?? ""}`.toLowerCase().includes(q)
    );
  }, [jeunes, recherche]);

  const nbParEtape = (type: string) => jeunes.filter((j) => j.statut === type).length;

  function basculer(jeune: JeuneCar) {
    if (!peutValider || pending) return;
    setEnCours(jeune.id);
    startTransition(async () => {
      if (jeune.statut === etape) {
        await annulerDernierMouvement(jeune.id, car.id, etape);
      } else {
        await validerMouvement(jeune.id, car.id, etape);
      }
      setEnCours(null);
    });
  }

  const badge = (statut: string | null) => {
    const e = ETAPES.find((x) => x.type === statut);
    if (!e) return null;
    const couleurs: Record<string, string> = {
      blue: "bg-blue-100 text-blue-700",
      green: "bg-green-100 text-green-700",
      orange: "bg-orange-100 text-orange-700",
    };
    return <span className={`text-xs rounded-full px-2 py-0.5 ${couleurs[e.couleur]}`}>{e.badge}</span>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{car.nom}</h1>
        <p className="text-slate-500 text-sm">
          Responsable : {car.responsable ?? "—"} — {jeunes.length} jeunes rattachés
        </p>
      </div>

      {/* Sélecteur d'étape */}
      <div className="flex gap-2 flex-wrap">
        {ETAPES.map((e) => (
          <button
            key={e.type}
            onClick={() => setEtape(e.type)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              etape === e.type
                ? "bg-fsy text-white"
                : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            }`}
          >
            {e.label} ({nbParEtape(e.type)}/{jeunes.length})
          </button>
        ))}
      </div>

      {/* Recherche rapide */}
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="🔍 Rechercher un jeune par nom…"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-fsy bg-white"
      />

      {!peutValider && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-2">
          Vous êtes en lecture seule sur ce car.
        </p>
      )}

      {/* Liste de pointage */}
      <ul className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
        {filtres.length === 0 && (
          <li className="p-4 text-slate-500 text-sm">Aucun jeune trouvé.</li>
        )}
        {filtres.map((j) => {
          const coche = j.statut === etape;
          return (
            <li key={j.id}>
              <button
                onClick={() => basculer(j)}
                disabled={!peutValider || pending}
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
                  {h.type === "MONTEE" ? "🚌" : h.type === "ARRIVEE" ? "✅" : "🏠"} {h.jeune}
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
