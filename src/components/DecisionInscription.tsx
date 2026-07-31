"use client";

import { useState, useTransition } from "react";
import { deciderInscription } from "@/lib/actions";

// Valider ou refuser une inscription.
//
// Quand un compte existe déjà au même nom, « Valider » n'est pas le bon geste :
// il fabrique un doublon, et le groupe reste attaché à l'ancien compte. Le
// serveur refuse donc de valider dans ce cas ; ici on montre son refus, et on
// laisse une sortie honnête à qui sait qu'il s'agit vraiment de deux personnes
// — l'encadrement compte de vrais homonymes.
export function DecisionInscription({
  inscriptionId,
  nom,
  aUnRapprochement,
}: {
  inscriptionId: string;
  nom: string;
  aUnRapprochement: boolean;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmerRefus, setConfirmerRefus] = useState(false);
  const [pending, demarrer] = useTransition();

  const [doublon, setDoublon] = useState(false);

  const decider = (accepter: boolean, malgreLeDoublon = false) =>
    demarrer(async () => {
      setErreur(null);
      try {
        const r = await deciderInscription(inscriptionId, accepter, { malgreLeDoublon });
        if (!r.ok) {
          setErreur(r.motif);
          setDoublon(true);
        }
      } catch {
        setErreur("La décision n'a pas abouti. Rechargez la page et réessayez.");
      }
    });

  return (
    <div className="shrink-0 w-full sm:w-auto">
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => decider(true)}
          title={
            aUnRapprochement
              ? "Un compte existe peut-être déjà : préférez « Rattacher » ci-dessous."
              : undefined
          }
          className={`text-sm rounded-lg px-3 py-1.5 disabled:opacity-40 ${
            aUnRapprochement
              ? "bg-white hover:bg-slate-50 text-slate-600 border border-slate-300"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {pending ? "…" : "Valider"}
          {aUnRapprochement && " comme nouveau"}
        </button>
        {confirmerRefus ? (
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-slate-600">Refuser {nom} ?</span>
            <button
              disabled={pending}
              onClick={() => decider(false)}
              className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-2.5 py-1.5 disabled:opacity-40"
            >
              Oui
            </button>
            <button
              onClick={() => setConfirmerRefus(false)}
              className="text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-2.5 py-1.5"
            >
              Non
            </button>
          </div>
        ) : (
          <button
            disabled={pending}
            onClick={() => setConfirmerRefus(true)}
            className="text-sm bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-1.5 disabled:opacity-40"
          >
            Refuser
          </button>
        )}
      </div>

      {erreur && (
        <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg p-2 mt-2 max-w-md">
          {erreur}
          {doublon && (
            <button
              disabled={pending}
              onClick={() => decider(true, true)}
              className="block mt-2 text-xs bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-2.5 py-1.5 disabled:opacity-40"
            >
              Ce n&apos;est pas la même personne — créer un compte distinct
            </button>
          )}
        </div>
      )}
    </div>
  );
}
