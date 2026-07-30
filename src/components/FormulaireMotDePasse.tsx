"use client";

import { useActionState } from "react";
import { changerMonMotDePasse } from "@/lib/actions";

export function FormulaireMotDePasse({
  provisoire,
  prenom,
}: {
  provisoire: boolean;
  prenom: string;
}) {
  const [state, action, pending] = useActionState(changerMonMotDePasse, undefined);

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
      <div>
        <h1 className="text-xl font-bold">
          {provisoire ? `Bienvenue ${prenom} 👋` : "Changer mon mot de passe"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {provisoire
            ? "Votre mot de passe est provisoire. Choisissez-en un que vous seul connaissez pour continuer."
            : "Choisissez un nouveau mot de passe."}
        </p>
      </div>

      <form action={action} className="space-y-4">
        {!provisoire && (
          <div>
            <label htmlFor="actuel" className="block text-sm font-medium mb-1">
              Mot de passe actuel
            </label>
            <input
              id="actuel"
              name="actuel"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-fsy"
            />
          </div>
        )}

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
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-fsy"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-fsy"
          />
        </div>

        {state?.erreur && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {state.erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-xl py-3.5 transition disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer et continuer"}
        </button>
      </form>
    </div>
  );
}
