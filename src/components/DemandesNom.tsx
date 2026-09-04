"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { traiterCorrectionNom } from "@/lib/actions";

export type DemandeNomVue = {
  id: string;
  ancien: string;
  nouveau: string;
  motif: string | null;
  role: string;
  code: string | null;
  creeLe: string;
};

// Ce que le couple voit pour trancher : l'ancien nom, le nouveau, et de quoi
// juger d'un coup d'œil. La comparaison est mise en évidence parce que c'est
// tout ce qui compte — une correction d'orthographe se voit, une substitution
// de personne aussi.
export function DemandesNom({ demandes }: { demandes: DemandeNomVue[] }) {
  if (demandes.length === 0) return null;
  return (
    <section className="bg-amber-50 border border-amber-300 rounded-xl p-4">
      <h2 className="font-bold text-amber-900">
        ✋ {demandes.length} correction{demandes.length > 1 ? "s" : ""} de nom à valider
      </h2>
      <p className="text-sm text-amber-800 mt-0.5">
        Ces personnes demandent que leur nom soit corrigé sur leur attestation. Une fois
        accepté, le document et sa page de vérification portent le nouveau nom, et
        l&apos;ancien reste consigné. Vérifiez qu&apos;il s&apos;agit bien de la même personne.
      </p>
      <ul className="mt-3 space-y-3">
        {demandes.map((d) => (
          <Ligne key={d.id} d={d} />
        ))}
      </ul>
    </section>
  );
}

function Ligne({ d }: { d: DemandeNomVue }) {
  const router = useRouter();
  const [refusOuvert, setRefusOuvert] = useState(false);
  const [motifRefus, setMotifRefus] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();

  const trancher = (decision: "ACCEPTEE" | "REFUSEE") =>
    demarrer(async () => {
      setErreur(null);
      const r = await traiterCorrectionNom(d.id, decision, motifRefus);
      if (!r.ok) {
        setErreur(r.motif);
        return;
      }
      router.refresh();
    });

  return (
    <li className="bg-white rounded-lg p-3">
      <div className="text-sm">
        <span className="text-slate-500 line-through">{d.ancien}</span>
        <span className="mx-2 text-slate-400">→</span>
        <strong className="text-fsy-dark">{d.nouveau}</strong>
      </div>
      <div className="text-xs text-slate-500 mt-0.5">
        {d.role}
        {d.code && (
          <>
            {" · "}
            <span className="font-mono">{d.code}</span>
          </>
        )}
        {" · demandé le "}
        {d.creeLe}
      </div>
      {d.motif && <p className="text-sm text-slate-700 mt-1.5 italic">« {d.motif} »</p>}

      {erreur && <p className="text-xs text-red-700 mt-1.5">{erreur}</p>}

      {refusOuvert ? (
        <div className="mt-2 space-y-1.5">
          <input
            autoFocus
            value={motifRefus}
            onChange={(e) => setMotifRefus(e.target.value)}
            placeholder="Pourquoi ? La personne le lira."
            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              disabled={pending || motifRefus.trim().length < 3}
              onClick={() => trancher("REFUSEE")}
              className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-40"
            >
              {pending ? "…" : "Confirmer le refus"}
            </button>
            <button
              onClick={() => setRefusOuvert(false)}
              className="text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            disabled={pending}
            onClick={() => trancher("ACCEPTEE")}
            className="text-sm bg-fsy hover:bg-fsy-dark text-white rounded-lg px-4 py-2 font-medium disabled:opacity-40"
          >
            {pending ? "…" : "Accepter la correction"}
          </button>
          <button
            onClick={() => setRefusOuvert(true)}
            className="text-sm bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2 font-medium"
          >
            Refuser
          </button>
        </div>
      )}
    </li>
  );
}

export type CorrectionRecente = {
  id: string;
  nouveau: string;
  ancien: string;
  attestationId: string | null;
  traiteeLe: string;
};

/**
 * Les corrections acceptées ces derniers jours, avec de quoi réimprimer la
 * seule feuille concernée.
 *
 * Rendue par le serveur, et non affichée dans la foulée du clic : l'action
 * revalide la page, la demande quitte la liste d'attente, et un message qui
 * n'aurait vécu que dans l'état du composant disparaîtrait avec elle. Ici il
 * reste — le couple peut valider dix corrections puis réimprimer les dix.
 */
export function CorrectionsRecentes({ corrections }: { corrections: CorrectionRecente[] }) {
  if (corrections.length === 0) return null;
  return (
    <section className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="font-bold">✅ Noms corrigés récemment</h2>
      <p className="text-sm text-slate-500 mt-0.5 mb-2">
        Leur attestation porte désormais le nouveau nom. Si vous l&apos;aviez déjà imprimée,
        réimprimez leur feuille.
      </p>
      <ul className="divide-y divide-slate-100 text-sm">
        {corrections.map((c) => (
          <li key={c.id} className="py-2 flex items-center justify-between gap-3 flex-wrap">
            <span className="min-w-0">
              <strong>{c.nouveau}</strong>
              <span className="text-xs text-slate-400 block">
                anciennement {c.ancien} · corrigé le {c.traiteeLe}
              </span>
            </span>
            {c.attestationId && (
              <Link
                href={`/attestations/impression?ids=${c.attestationId}&format=page`}
                className="shrink-0 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 font-medium"
              >
                🖨️ Réimprimer
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
