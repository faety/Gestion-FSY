"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CartePublique } from "@/components/CartePublique";
import { demanderReinitialisation } from "@/lib/actions";

export default function MotDePasseOubliePage() {
  const [state, action, pending] = useActionState(demanderReinitialisation, undefined);

  return (
    <CartePublique
      titre="Mot de passe oublié"
      sousTitre="Indiquez l'adresse avec laquelle vous vous connectez. Vous recevrez un lien pour en choisir un nouveau."
    >
      {state?.message ? (
        <>
          <p className="text-sm text-green-900 bg-green-50 border border-green-200 rounded-lg p-3">{state.message}</p>
          <p className="text-sm text-slate-500 mt-4">
            Rien ne vous parvient ? Demandez un mot de passe provisoire à un administrateur.
          </p>
        </>
      ) : (
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-marque"
            />
          </div>
          {state?.erreur && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{state.erreur}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-marque hover:bg-marque-sombre text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-50"
          >
            {pending ? "Envoi…" : "Recevoir un lien"}
          </button>
        </form>
      )}
      <p className="text-center text-sm text-slate-500 mt-6">
        <Link href="/login" className="text-marque hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </CartePublique>
  );
}
