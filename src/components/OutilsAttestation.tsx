"use client";

import { useState, useTransition } from "react";
import { delivrerAttestations, revoquerAttestation } from "@/lib/actions";

export function ImprimerAttestation() {
  return (
    <button
      onClick={() => window.print()}
      className="w-full sm:w-auto bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-xl px-6 py-3 transition"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}

// Formulation de CV à copier d'un appui. Le texte reste visible et
// sélectionnable si le presse-papier est refusé par le navigateur.
export function CopierTexte({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <div>
      <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm whitespace-pre-wrap font-sans select-all">
        {texte}
      </pre>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texte);
            setCopie(true);
            setTimeout(() => setCopie(false), 2500);
          } catch {
            /* refusé : le texte reste sélectionnable à la main */
          }
        }}
        className="mt-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 font-medium"
      >
        {copie ? "✓ Copié" : "Copier"}
      </button>
    </div>
  );
}

// Délivrance en une fois, réservée au couple dirigeant.
export function DelivrerAttestations({ candidats }: { candidats: number }) {
  const [resultat, setResultat] = useState<{
    delivrees: number;
    parMention: Record<string, number>;
  } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();

  return (
    <div className="space-y-3">
      <button
        disabled={pending || candidats === 0}
        onClick={() =>
          demarrer(async () => {
            setErreur(null);
            try {
              setResultat(await delivrerAttestations());
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Erreur");
            }
          })
        }
        className="w-full sm:w-auto bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-xl px-6 py-3 transition disabled:opacity-40"
      >
        {pending
          ? "Délivrance…"
          : candidats === 0
            ? "Tout le monde a la sienne"
            : `Délivrer ${candidats} attestation${candidats > 1 ? "s" : ""}`}
      </button>

      {erreur && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {erreur}
        </p>
      )}

      {resultat && (
        <div className="text-sm bg-green-50 border border-green-200 rounded-lg p-3 text-green-900">
          <strong>{resultat.delivrees} attestations délivrées.</strong>
          <ul className="mt-1">
            <li>Mention Excellence : {resultat.parMention.EXCELLENCE}</li>
            <li>Mention Rigueur et suivi : {resultat.parMention.RIGUEUR}</li>
            <li>Sans mention : {resultat.parMention.SANS}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Une attestation délivrée par erreur — mauvais nom, personne finalement absente
// — se révoque. Le document n'est pas effacé : la page de vérification doit
// pouvoir répondre « plus valable » plutôt que « code inconnu ».
export function RevoquerAttestation({ id, nom }: { id: string; nom: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="text-xs text-slate-400 hover:text-red-700 underline"
      >
        Révoquer
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1">
      <label className="block text-xs text-slate-500">Motif de la révocation de {nom}</label>
      <input
        autoFocus
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder="Ex. : erreur sur la personne"
        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm"
      />
      {erreur && <p className="text-xs text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending || motif.trim().length < 3}
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              try {
                await revoquerAttestation(id, motif);
                setOuvert(false);
              } catch (e) {
                setErreur(e instanceof Error ? e.message : "Erreur");
              }
            })
          }
          className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-40"
        >
          {pending ? "…" : "Confirmer"}
        </button>
        <button
          onClick={() => setOuvert(false)}
          className="text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
