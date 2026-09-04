"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { demanderCorrectionNom } from "@/lib/actions";
import type { EtatDemandeNom } from "@/lib/noms";

// « Ce n'est pas tout à fait mon nom. »
//
// Volontairement discret : replié en une ligne sous le document, il ne
// s'ouvre que pour qui en a besoin. La majorité n'a rien à corriger, et une
// grande boîte « modifier mon nom » sous une attestation inviterait à y
// toucher — alors que c'est précisément ce qu'on ne veut pas.
export function CorrigerMonNom({
  etat,
  prenom,
  nom,
}: {
  etat: EtatDemandeNom;
  prenom: string;
  nom: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [p, setP] = useState(prenom);
  const [n, setN] = useState(nom);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoyee, setEnvoyee] = useState(false);
  const [pending, demarrer] = useTransition();

  if (envoyee || !etat.peutDemander) {
    const message = envoyee
      ? "Votre demande est partie. Le couple dirigeant la regardera ; votre attestation sera corrigée dès qu'il aura validé."
      : etat.peutDemander
        ? ""
        : etat.raison === "EN_ATTENTE"
          ? "Votre demande de correction est en attente : le couple dirigeant doit la valider."
          : "Votre nom a déjà été corrigé. Pour toute autre correction, adressez-vous au couple dirigeant.";
    return (
      <p className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600">
        {envoyee ? "✅ " : "⏳ "}
        {message}
      </p>
    );
  }

  if (!ouvert) {
    return (
      <div className="space-y-2">
        {etat.refusPrecedent && (
          <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
            Votre précédente demande n&apos;a pas été retenue : {etat.refusPrecedent}. Vous
            pouvez en faire une nouvelle.
          </p>
        )}
        <button
          onClick={() => setOuvert(true)}
          className="text-sm text-slate-500 hover:text-fsy underline"
        >
          Mon nom n&apos;est pas écrit correctement
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div>
        <h2 className="font-bold">Corriger mon nom</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Écrivez votre nom tel qu&apos;il doit figurer sur votre attestation. Le couple
          dirigeant validera avant que le document ne change.{" "}
          <strong>Cette correction n&apos;est possible qu&apos;une fois</strong> — relisez-vous.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="corr-prenom">
            Prénom
          </label>
          <input
            id="corr-prenom"
            value={p}
            onChange={(e) => setP(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fsy/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="corr-nom">
            Nom de famille
          </label>
          <input
            id="corr-nom"
            value={n}
            onChange={(e) => setN(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fsy/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="corr-motif">
          Ce que vous voulez expliquer <span className="text-slate-400">(facultatif)</span>
        </label>
        <input
          id="corr-motif"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Ex. : mon nom de famille manquait à l'inscription"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fsy/40"
        />
      </div>

      {/* Ce que portera le document : on le montre avant, pas après. */}
      <p className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">
        Votre attestation portera :{" "}
        <strong>{`${p} ${n}`.replace(/\s+/g, " ").trim() || "—"}</strong>
      </p>

      {erreur && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {erreur}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending}
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              const r = await demanderCorrectionNom({ prenom: p, nom: n, motif });
              if (!r.ok) {
                setErreur(r.motif);
                return;
              }
              setEnvoyee(true);
              router.refresh();
            })
          }
          className="bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition disabled:opacity-40"
        >
          {pending ? "…" : "Envoyer la demande"}
        </button>
        <button
          onClick={() => setOuvert(false)}
          className="bg-slate-100 hover:bg-slate-200 rounded-xl px-5 py-2.5 text-sm font-medium"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
