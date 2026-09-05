"use client";

import { useActionState, useState, useTransition } from "react";
import {
  basculerActif,
  basculerLectureSeule,
  changerRole,
  creerUtilisateur,
  envoyerEssaiEmail,
  reinitialiserMotDePasse,
} from "@/lib/actions";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

// Outils de la page Administration. Chacun appelle une action serveur et
// affiche ce qu'elle renvoie — un refus ({ ok: false, motif }) se lit à
// l'écran au lieu de disparaître dans une erreur masquée.

export function NouvelUtilisateur() {
  const [state, action, pending] = useActionState(creerUtilisateur, undefined);
  const champ = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-marque";

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input name="prenom" required placeholder="Prénom" aria-label="Prénom" className={champ} />
        <input name="nom" required placeholder="Nom" aria-label="Nom" className={champ} />
      </div>
      <input name="email" type="email" required placeholder="Adresse e-mail" aria-label="Adresse e-mail" className={champ} />
      <div className="grid grid-cols-2 gap-2">
        <select name="sexe" aria-label="Genre" className={champ} defaultValue="M">
          <option value="M">Homme</option>
          <option value="F">Femme</option>
        </select>
        <select name="role" aria-label="Rôle" className={champ} defaultValue="MEMBRE">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      {state?.erreur && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{state.erreur}</p>}
      {state?.provisoire && (
        <p className="text-sm text-green-900 bg-green-50 border border-green-200 rounded-lg p-3">
          Compte créé pour <strong>{state.email}</strong>. Mot de passe provisoire, à dicter (il ne sera plus affiché) :{" "}
          <code className="font-mono text-base font-bold">{state.provisoire}</code>
        </p>
      )}
      <button type="submit" disabled={pending} className="bg-marque hover:bg-marque-sombre text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {pending ? "Création…" : "Créer le compte"}
      </button>
    </form>
  );
}

export function LigneUtilisateur({ u, moi }: { u: { id: string; prenom: string; nom: string; email: string; role: string; actif: boolean }; moi: boolean }) {
  const [pending, demarrer] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const lancer = (f: () => Promise<{ ok: boolean; motif?: string; provisoire?: string }>) =>
    demarrer(async () => {
      setInfo(null);
      setErreur(null);
      const r = await f();
      if (!r.ok) setErreur(r.motif ?? "Refusé.");
      else if (r.provisoire) setInfo(`Mot de passe provisoire : ${r.provisoire}`);
    });

  return (
    <li className={`py-2 ${u.actif ? "" : "opacity-55"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {u.prenom} {u.nom} {moi && <span className="text-xs text-slate-400">(vous)</span>}
          </div>
          <div className="text-xs text-slate-500">{u.email}</div>
        </div>
        <select
          aria-label={`Rôle de ${u.prenom} ${u.nom}`}
          value={u.role}
          disabled={moi || pending}
          onChange={(e) => lancer(() => changerRole(u.id, e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <button type="button" disabled={pending} onClick={() => lancer(() => reinitialiserMotDePasse(u.id))} className="text-xs underline text-slate-600 hover:text-marque">
          Mot de passe provisoire
        </button>
        {!moi && (
          <button type="button" disabled={pending} onClick={() => lancer(() => basculerActif(u.id))} className="text-xs underline text-slate-600 hover:text-marque">
            {u.actif ? "Désactiver" : "Réactiver"}
          </button>
        )}
      </div>
      {info && <p className="text-xs text-green-900 bg-green-50 border border-green-200 rounded-lg p-2 mt-1 font-mono">{info}</p>}
      {erreur && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mt-1">{erreur}</p>}
    </li>
  );
}

export function InterrupteurLectureSeule({ actif }: { actif: boolean }) {
  const [pending, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => demarrer(() => basculerLectureSeule(!actif).then(() => undefined))}
      className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${actif ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-slate-100 hover:bg-slate-200"}`}
    >
      {pending ? "…" : actif ? "Lever la lecture seule" : "Passer en lecture seule"}
    </button>
  );
}

export function EssaiEmail({ adresseParDefaut }: { adresseParDefaut: string }) {
  const [state, action, pending] = useActionState(envoyerEssaiEmail, undefined);
  return (
    <form action={action} className="flex flex-wrap gap-2 items-start">
      <input
        name="a"
        type="email"
        defaultValue={adresseParDefaut}
        aria-label="Adresse de destination"
        className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button type="submit" disabled={pending} className="bg-marque hover:bg-marque-sombre text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {pending ? "Envoi…" : "Envoyer un essai"}
      </button>
      {state?.message && <p className="w-full text-sm text-green-900 bg-green-50 border border-green-200 rounded-lg p-2">{state.message}</p>}
      {state?.erreur && <p className="w-full text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{state.erreur}</p>}
    </form>
  );
}
