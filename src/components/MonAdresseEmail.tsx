"use client";

import { useActionState } from "react";
import { changerMonEmail } from "@/lib/actions";

// Les comptes d'amorçage portent un identifiant fabriqué à partir du nom. Tant
// qu'il n'est pas remplacé par une vraie adresse, la personne ne peut recevoir
// ni lien de réinitialisation ni aucun autre message.
export function MonAdresseEmail({
  email,
  attente,
}: {
  email: string;
  attente: boolean;
}) {
  const [state, action, pending] = useActionState(changerMonEmail, undefined);

  return (
    <section
      className={`rounded-xl p-4 shadow-sm ${
        attente ? "bg-amber-50 border border-amber-200" : "bg-white"
      }`}
    >
      <h2 className="font-bold">Mon adresse e-mail</h2>

      {attente ? (
        <p className="text-sm text-amber-900 mt-1">
          Vous vous connectez avec <span className="font-mono">{email}</span>, un identifiant
          créé pour vous à partir de votre nom. <strong>Aucun message ne peut y arriver</strong> —
          ni lien de mot de passe oublié, ni rien d'autre. Enregistrez votre vraie adresse : elle
          deviendra votre identifiant de connexion.
        </p>
      ) : (
        <p className="text-sm text-slate-500 mt-1">
          Vous vous connectez avec <span className="font-medium">{email}</span>. C'est aussi
          l'adresse où arrivent les liens de mot de passe oublié.
        </p>
      )}

      <form action={action} className="mt-3 space-y-2">
        <input
          name="email"
          type="email"
          required
          defaultValue={attente ? "" : email}
          placeholder="vous@exemple.com"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fsy"
        />
        {state?.erreur && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
            {state.erreur}
          </p>
        )}
        {state?.ok && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-2">
            ✅ Adresse enregistrée. C'est désormais votre identifiant de connexion.
          </p>
        )}
        <button
          disabled={pending}
          className="bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-lg px-5 py-2 transition disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer mon adresse"}
        </button>
      </form>
    </section>
  );
}
