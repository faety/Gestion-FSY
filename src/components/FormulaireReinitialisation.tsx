"use client";

import { useActionState } from "react";
import { reinitialiserParJeton } from "@/lib/actions";
import { ChampMotDePasse } from "./ChampMotDePasse";

export function FormulaireReinitialisation({ jeton }: { jeton: string }) {
  const [state, action, pending] = useActionState(reinitialiserParJeton, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="jeton" value={jeton} />
      <ChampMotDePasse
        name="nouveau"
        label="Nouveau mot de passe"
        aide="Au moins 8 caractères."
        minLength={8}
        autoComplete="new-password"
        autoFocus
      />
      <ChampMotDePasse
        name="confirmation"
        label="Répétez-le"
        minLength={8}
        autoComplete="new-password"
      />
      {state?.erreur && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{state.erreur}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
