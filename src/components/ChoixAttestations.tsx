"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// Choisir à la main qui reçoit son attestation, parmi ceux qui n'ont rendu
// aucun rapport.
//
// Ils ne sont pas tous dans la même situation : certains ont encadré leur
// groupe six jours durant avec un téléphone à plat ou sans réseau, d'autres
// ne sont jamais venus. L'application ne sait pas les distinguer — le couple
// dirigeant, si. D'où une liste à cocher plutôt qu'une règle automatique : la
// machine ne doit pas trancher ce qu'elle ne peut pas savoir.

export type CandidatAttestation = {
  id: string;
  nom: string;
  role: string;
  code: string;
};

export function ChoixAttestations({
  candidats,
  format,
}: {
  candidats: CandidatAttestation[];
  /** Le format d'impression à conserver en passant à l'aperçu. */
  format: string;
}) {
  const router = useRouter();
  const [coches, setCoches] = useState<Set<string>>(new Set());

  const basculer = (id: string) =>
    setCoches((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Les rôles regroupés : on parcourt la liste dans l'ordre de la cérémonie.
  const parRole = useMemo(() => {
    const m = new Map<string, CandidatAttestation[]>();
    for (const c of candidats) {
      const l = m.get(c.role) ?? [];
      l.push(c);
      m.set(c.role, l);
    }
    return [...m.entries()];
  }, [candidats]);

  const imprimer = () => {
    const ids = [...coches].join(",");
    router.push(`/attestations/impression?ids=${ids}&format=${format}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setCoches(new Set(candidats.map((c) => c.id)))}
          className="text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 font-medium"
        >
          Tout cocher
        </button>
        <button
          onClick={() => setCoches(new Set())}
          className="text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 font-medium"
        >
          Tout décocher
        </button>
        <span className="text-xs text-slate-500">
          {coches.size} sélectionné{coches.size > 1 ? "s" : ""} sur {candidats.length}
        </span>
      </div>

      {parRole.map(([role, gens]) => (
        <div key={role}>
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">{role}</div>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {gens.map((c) => (
              <li key={c.id}>
                <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coches.has(c.id)}
                    onChange={() => basculer(c.id)}
                    className="w-4 h-4 accent-fsy shrink-0"
                  />
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{c.nom}</span>
                  <span className="font-mono text-xs text-slate-400 shrink-0">{c.code}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <button
        disabled={coches.size === 0}
        onClick={imprimer}
        className="w-full sm:w-auto bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-xl px-6 py-3 transition disabled:opacity-40"
      >
        {coches.size === 0
          ? "Cochez ceux à imprimer"
          : `Voir les ${coches.size} attestation${coches.size > 1 ? "s" : ""} à imprimer`}
      </button>
    </div>
  );
}
