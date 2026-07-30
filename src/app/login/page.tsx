"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { seConnecter } from "@/lib/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(seConnecter, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-fsy-dark to-fsy">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-2">
          <Logo taille={72} />
        </div>
        <h1 className="text-2xl font-bold text-center text-fsy-dark">FSY 2026</h1>
        <p className="text-center text-slate-500 mb-6">Abidjan Ouest — Gestion de l'événement</p>
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fsy"
              placeholder="vous@fsy2026.ci"
            />
          </div>
          <div>
            <label htmlFor="motDePasse" className="block text-sm font-medium mb-1">Mot de passe</label>
            <input
              id="motDePasse"
              name="motDePasse"
              type="password"
              required
              autoComplete="current-password"
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
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-fsy hover:underline">
            Demander un accès
          </Link>
        </p>
        <p className="text-center text-xs text-slate-400 mt-2">
          Mot de passe oublié ? Demandez-en un provisoire à un coordinateur principal.
        </p>
      </div>
    </main>
  );
}
