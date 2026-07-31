"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { useActionState } from "react";
import { sInscrire } from "@/lib/actions";

export default function InscriptionPage() {
  const [state, action, pending] = useActionState(sInscrire, undefined);

  if (state?.ok) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-fsy-dark to-fsy">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-5xl">📨</div>
          <h1 className="text-xl font-bold mt-3">Demande envoyée</h1>
          <p className="text-slate-600 mt-2 text-sm leading-relaxed">
            Les coordinateurs principaux vont vérifier votre inscription. Vous pourrez vous
            connecter dès qu'elle sera validée, avec le mot de passe que vous venez de choisir.
          </p>
          <Link
            href="/login"
            className="inline-block mt-5 bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-lg px-6 py-2.5 transition"
          >
            Retour à la connexion
          </Link>
        </div>
      </main>
    );
  }

  const champ =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-fsy";

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-fsy-dark to-fsy">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 my-8">
        <div className="flex justify-center mb-2">
          <Logo taille={72} />
        </div>
        <h1 className="text-2xl font-bold text-center text-fsy-dark">FSY 2026</h1>
        <p className="text-center text-slate-500 text-sm">Demande de compte encadrant</p>
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
          Réservé aux personnes appelées à encadrer la conférence. Votre demande est vérifiée
          par les coordinateurs principaux avant que le compte ne soit actif.
        </p>

        <form action={action} className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nom" className="block text-sm font-medium mb-1">
                Nom
              </label>
              <input id="nom" name="nom" required className={champ} placeholder="Zilé" />
            </div>
            <div>
              <label htmlFor="prenom" className="block text-sm font-medium mb-1">
                Prénoms
              </label>
              <input id="prenom" name="prenom" required className={champ} placeholder="Patricia" />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Adresse électronique
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className={champ} />
          </div>

          <div>
            <label htmlFor="telephone" className="block text-sm font-medium mb-1">
              Téléphone
            </label>
            <input id="telephone" name="telephone" type="tel" className={champ} placeholder="+225 07 00 00 00 00" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sexe" className="block text-sm font-medium mb-1">
                Vous êtes
              </label>
              <select id="sexe" name="sexe" required defaultValue="" className={champ}>
                <option value="" disabled>
                  — Choisir —
                </option>
                <option value="F">Une femme</option>
                <option value="M">Un homme</option>
              </select>
            </div>
          </div>

          <ChampMotDePasse
            name="motDePasse"
            label="Mot de passe"
            aide="Au moins 8 caractères."
            minLength={8}
            autoComplete="new-password"
          />

          {state?.erreur && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {state.erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-lg py-3 transition disabled:opacity-50"
          >
            {pending ? "Envoi…" : "Envoyer ma demande"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="text-fsy hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
