"use client";

import { useActionState } from "react";
import { changerMonTelephone } from "@/lib/actions";

// Le numéro sert le jour même : un conseiller qu'on cherche au moment du départ
// d'un car, un adjoint à joindre pour une décision. Chacun renseigne le sien —
// faire saisir soixante-quatre fiches par le couple dirigeant garantirait des
// numéros périmés.
export function MonTelephone({ telephone }: { telephone: string | null }) {
  const [state, action, pending] = useActionState(changerMonTelephone, undefined);

  return (
    <form action={action} className="space-y-2">
      <label htmlFor="telephone" className="block text-sm font-medium">
        Numéro de téléphone
      </label>
      <input
        id="telephone"
        name="telephone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={telephone ?? ""}
        placeholder="+225 07 00 00 00 00"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fsy"
      />
      {state?.erreur && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          {state.erreur}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-2">
          ✅ Numéro enregistré.
        </p>
      )}
      <button
        disabled={pending}
        className="bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-lg px-5 py-2 transition disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer mon numéro"}
      </button>
      <p className="text-xs text-slate-500">
        Visible par l'encadrement dans l'organigramme, pour être joint pendant la
        conférence. Il n'apparaît sur aucune page publique.
      </p>
    </form>
  );
}
