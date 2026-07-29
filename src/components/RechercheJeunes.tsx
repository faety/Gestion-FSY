"use client";

import { useMemo, useState, useTransition } from "react";
import { deplacerJeune } from "@/lib/actions";

type Jeune = {
  id: string;
  nom: string;
  prenom: string;
  sexe: string;
  pieu: string;
  groupeId: string | null;
  groupe: string | null;
};

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
  const [, startTransition] = useTransition();

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return jeunes;
    return jeunes.filter((j) =>
      `${j.prenom} ${j.nom} ${j.pieu} ${j.groupe ?? ""}`.toLowerCase().includes(q)
    );
  }, [jeunes, recherche]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Jeunes</h1>
        <p className="text-slate-500 text-sm">{portee} — {jeunes.length} au total</p>
      </div>
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="🔍 Rechercher par nom, pieu ou groupe…"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fsy bg-white"
      />
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-3">Nom</th>
              <th className="p-3">Sexe</th>
              <th className="p-3">Pieu / District</th>
              <th className="p-3">Groupe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtres.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <td className="p-3 font-medium">
                  {j.prenom} {j.nom}
                </td>
                <td className="p-3">{j.sexe === "M" ? "G" : "F"}</td>
                <td className="p-3 text-slate-600">{j.pieu}</td>
                <td className="p-3">
                  {peutReassigner ? (
                    <select
                      value={j.groupeId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        startTransition(() => deplacerJeune(j.id, val));
                      }}
                      className="rounded-lg border border-slate-300 px-2 py-1 bg-white"
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
                    j.groupe ?? "—"
                  )}
                </td>
              </tr>
            ))}
            {filtres.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-slate-500">
                  Aucun jeune trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
