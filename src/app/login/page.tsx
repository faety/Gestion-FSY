"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { seConnecter } from "@/lib/actions";
import { RetourAccueil } from "@/components/RetourAccueil";

// Après une réinitialisation réussie, on revient ici : sans un mot, la personne
// ne saurait pas si son nouveau mot de passe a bien été pris en compte.
function MessageRetour() {
  const params = useSearchParams();
  if (!params.get("reinitialise")) return null;
  return (
    <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
      ✅ Votre nouveau mot de passe est enregistré. Connectez-vous avec.
    </p>
  );
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(seConnecter, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-fsy-dark to-fsy">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        {/* Le logo ramène à la présentation publique : c'est là qu'on le
            cherche, et c'est la seule issue quand on est arrivé ici par un lien. */}
        <Link href="/" className="block" aria-label="Accueil FSY 2026">
          <div className="flex justify-center mb-2">
            <Logo taille={72} />
          </div>
          <h1 className="text-2xl font-bold text-center text-fsy-dark">FSY 2026</h1>
        </Link>
        <p className="text-center text-slate-500 mb-6">Abidjan Ouest — Gestion de l'événement</p>
        <Suspense fallback={null}>
          <MessageRetour />
        </Suspense>
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
              placeholder="votre adresse e-mail"
            />
          </div>
          <ChampMotDePasse name="motDePasse" label="Mot de passe" />
          {state?.erreur && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{state.erreur}</p>
          )}
          <div className="text-right -mt-1">
            <Link href="/mot-de-passe-oublie" className="text-sm text-fsy hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
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
        <RetourAccueil />
      </div>
    </main>
  );
}
