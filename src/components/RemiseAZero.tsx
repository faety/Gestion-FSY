"use client";

import { useState, useTransition } from "react";
import { remiseAZero } from "@/lib/actions";
import { DONNEES_DESSAI } from "@/lib/remise-a-zero";

type Chose = { cle: string; label: string; detail: string };

// Remise à zéro après une répétition. Volontairement découpée : on veut souvent
// garder les affectations décidées ensemble tout en effaçant les pointages et
// les rapports d'essai. Le mot « EFFACER » est demandé parce que rien de tout
// cela ne se récupère.
export function RemiseAZero({ choses }: { choses: readonly Chose[] }) {
  const [ouvert, setOuvert] = useState(false);
  const [choix, setChoix] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState("");
  const [resultat, setResultat] = useState<Record<string, number> | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();

  const basculer = (cle: string) =>
    setChoix((p) => (p.includes(cle) ? p.filter((c) => c !== cle) : [...p, cle]));

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-400">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold">🧹 Remise à zéro après les essais</h2>
          <p className="text-sm text-slate-500">
            Efface les données produites pendant une répétition. Les comptes, les jeunes, les
            groupes, les compagnies et le programme officiel ne sont jamais touchés.
          </p>
        </div>
        <button
          onClick={() => setOuvert(!ouvert)}
          className="text-sm text-fsy hover:underline shrink-0"
        >
          {ouvert ? "Fermer" : "Ouvrir"}
        </button>
      </div>

      {ouvert && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setChoix([...DONNEES_DESSAI])}
              className="text-xs bg-fsy-light text-fsy-dark rounded-full px-3 py-1.5 font-medium"
            >
              Données d'essai seulement
            </button>
            <button
              onClick={() => setChoix(choses.map((c) => c.cle))}
              className="text-xs bg-red-50 text-red-700 rounded-full px-3 py-1.5 font-medium"
            >
              Tout remettre à zéro
            </button>
            <button
              onClick={() => setChoix([])}
              className="text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1.5"
            >
              Rien
            </button>
          </div>

          <ul className="divide-y divide-slate-100">
            {choses.map((c) => (
              <li key={c.cle}>
                <label className="flex items-start gap-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={choix.includes(c.cle)}
                    onChange={() => basculer(c.cle)}
                    className="mt-0.5 w-5 h-5 accent-red-600 shrink-0"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{c.label}</span>
                    <span className="block text-slate-500">{c.detail}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div>
            <label htmlFor="confirmation" className="block text-sm font-medium mb-1">
              Tapez <span className="font-mono">EFFACER</span> pour confirmer
            </label>
            <input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="EFFACER"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base font-mono"
            />
          </div>

          {erreur && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {erreur}
            </p>
          )}

          {resultat && (
            <div className="text-sm bg-green-50 border border-green-200 rounded-lg p-3 text-green-900">
              <strong>Remise à zéro effectuée.</strong>
              <ul className="mt-1">
                {Object.entries(resultat).map(([k, v]) => (
                  <li key={k}>
                    {k} : {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            disabled={pending || choix.length === 0 || confirmation.trim().toUpperCase() !== "EFFACER"}
            onClick={() =>
              demarrer(async () => {
                setErreur(null);
                setResultat(null);
                try {
                  setResultat(await remiseAZero(choix, confirmation));
                  setConfirmation("");
                  setChoix([]);
                } catch (e) {
                  setErreur(e instanceof Error ? e.message : "Erreur");
                }
              })
            }
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl py-3 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending
              ? "Effacement…"
              : `Effacer ${choix.length} élément${choix.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </section>
  );
}
