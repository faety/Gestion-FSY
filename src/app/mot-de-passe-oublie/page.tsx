"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { demanderReinitialisation } from "@/lib/actions";

export default function MotDePasseOubliePage() {
  const [state, action, pending] = useActionState(demanderReinitialisation, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-fsy-dark to-fsy">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-2">
          <Logo taille={64} />
        </div>
        <h1 className="text-xl font-bold text-center text-fsy-dark">Mot de passe oublié</h1>
        <p className="text-center text-slate-500 text-sm mb-6">
          Indiquez l'adresse avec laquelle vous vous connectez. Vous recevrez un lien pour en
          choisir un nouveau.
        </p>

        {state?.message ? (
          <>
            <p className="text-sm text-green-900 bg-green-50 border border-green-200 rounded-lg p-3">
              {state.message}
            </p>
            <p className="text-sm text-slate-500 mt-4">
              Rien ne vous parvient ? Votre compte porte peut-être encore une adresse d'attente,
              qui ne reçoit aucun message. Dans ce cas, demandez un mot de passe provisoire au
              couple dirigeant ou aux coordinateurs principaux.
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
              {pending ? "Envoi…" : "Recevoir un lien"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link href="/login" className="text-fsy hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
