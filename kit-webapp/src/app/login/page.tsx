"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { APP } from "@/lib/app";
import { CartePublique } from "@/components/CartePublique";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { seConnecter } from "@/lib/actions";

// Après une réinitialisation réussie, on revient ici : sans un mot, la
// personne ne saurait pas si son nouveau mot de passe a été pris en compte.
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
    <CartePublique sousTitre={APP.description}>
      <Suspense fallback={null}>
        <MessageRetour />
      </Suspense>
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-marque"
          />
        </div>
        <ChampMotDePasse name="motDePasse" label="Mot de passe" />
        {state?.erreur && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{state.erreur}</p>}
        <div className="text-right -mt-1">
          <Link href="/mot-de-passe-oublie" className="text-sm text-marque hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-marque hover:bg-marque-sombre text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-50"
        >
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </CartePublique>
  );
}
