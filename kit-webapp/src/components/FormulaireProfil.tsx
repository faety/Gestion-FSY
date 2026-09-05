"use client";

import { useActionState } from "react";
import { changerMonProfil } from "@/lib/actions";

export function FormulaireProfil({ u }: { u: { prenom: string; nom: string; telephone: string | null; sexe: string } }) {
  const [state, action, pending] = useActionState(changerMonProfil, undefined);
  const champ = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-marque";

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="block font-medium mb-1">Prénom</span>
          <input name="prenom" defaultValue={u.prenom} required className={champ} />
        </label>
        <label className="text-sm">
          <span className="block font-medium mb-1">Nom</span>
          <input name="nom" defaultValue={u.nom} required className={champ} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="block font-medium mb-1">Téléphone</span>
          <input name="telephone" defaultValue={u.telephone ?? ""} className={champ} />
        </label>
        <label className="text-sm">
          <span className="block font-medium mb-1">Genre</span>
          <select name="sexe" defaultValue={u.sexe} className={champ}>
            <option value="M">Homme</option>
            <option value="F">Femme</option>
          </select>
        </label>
      </div>
      {state?.erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{state.erreur}</p>}
      {state?.ok && <p className="text-sm text-green-900 bg-green-50 border border-green-200 rounded-lg p-2">Profil enregistré.</p>}
      <button type="submit" disabled={pending} className="bg-marque hover:bg-marque-sombre text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
