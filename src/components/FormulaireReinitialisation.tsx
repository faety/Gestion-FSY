"use client";

import { useActionState } from "react";
import { reinitialiserParJeton } from "@/lib/actions";

export function FormulaireReinitialisation({ jeton }: { jeton: string }) {
  const [state, action, pending] = useActionState(reinitialiserParJeton, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="jeton" value={jeton} />
      <div>
        <label htmlFor="nouveau" className="block text-sm font-medium mb-1">
          Nouveau mot de passe
        </label>
        <input
          id="nouveau"
          name="nouveau"
          type="password"
          required
          minLength={8}
          autoFocus
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fsy"
        />
        <p className="text-xs text-slate-500 mt-1">Au moins 8 caractères.</p>
      </div>
      <div>
        <label htmlFor="confirmation" className="block text-sm font-medium mb-1">
          Répétez-le
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fsy"
        />
      </div>
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
