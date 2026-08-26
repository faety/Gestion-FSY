"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { appliquerFichesPapier, restaurerOrganisation } from "@/lib/actions";

// Le bouton qui applique l'organisation des fiches papier — et celui qui la
// défait. L'application recalcule tout côté serveur ; ici on ne fait que
// demander, confirmer, et dire ce qui s'est passé.
export function AppliquerFiches({ nbSansFiche }: { nbSansFiche: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resultat, setResultat] = useState<
    { ok: true; instantaneId: string; places: number } | { ok: false; motif: string } | null
  >(null);

  return (
    <div className="space-y-2">
      {resultat?.ok ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-900 space-y-2">
          <p className="font-medium">
            ✅ Organisation appliquée : {resultat.places} jeunes placés dans leurs groupes.
          </p>
          <p>
            Les groupes et compagnies suivent maintenant les fiches papier. Les conseillers
            peuvent compléter leur liste depuis leur téléphone (page Jeunes → « Ajouter un
            jeune arrivé sans inscription », ou reprendre un « sans groupe »).
          </p>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await restaurerOrganisation(resultat.instantaneId);
                if (r.ok) {
                  setResultat(null);
                  router.refresh();
                }
              })
            }
            className="underline font-medium disabled:opacity-50"
          >
            ↺ Tout défaire (revenir à l&apos;instantané)
          </button>
        </div>
      ) : (
        <>
          {resultat && !resultat.ok && (
            <p className="text-sm text-red-600">{resultat.motif}</p>
          )}
          <button
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  "Appliquer l'organisation des fiches papier ?\n\n" +
                    `• Les jeunes rapprochés rejoignent le groupe de leur fiche, marqués présents.\n` +
                    `• ${nbSansFiche} jeunes qu'aucune fiche ne cite passeront « sans groupe » — ` +
                    "les conseillers pourront les reprendre depuis leur téléphone.\n" +
                    "• Un instantané est pris d'abord : tout se défait d'un geste."
                )
              )
                return;
              startTransition(async () => {
                const r = await appliquerFichesPapier();
                setResultat(
                  r.ok
                    ? { ok: true, instantaneId: r.instantaneId, places: r.stats.places }
                    : { ok: false, motif: r.motif }
                );
                if (r.ok) router.refresh();
              });
            }}
            className="bg-fsy text-white rounded-lg px-4 py-2.5 font-medium hover:bg-fsy-dark transition disabled:opacity-50"
          >
            {pending ? "Application en cours…" : "Appliquer cette organisation"}
          </button>
        </>
      )}
    </div>
  );
}
