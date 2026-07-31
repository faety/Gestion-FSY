"use client";

import { useState, useTransition } from "react";
import { definirEmail, envoyerEmailDEssai, reinitialiserMotDePasse } from "@/lib/actions";

// Génère un mot de passe provisoire et l'affiche une seule fois, à dicter de
// vive voix. Il n'est stocké nulle part en clair : la seule façon de le revoir
// est d'en générer un nouveau.
export function BoutonMotDePasse({ userId, nom }: { userId: string; nom: string }) {
  const [resultat, setResultat] = useState<{ provisoire: string; nom: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [pending, demarrer] = useTransition();

  return (
    <>
      <button
        disabled={pending}
        onClick={() =>
          demarrer(async () => {
            setErreur(null);
            try {
              const r = await reinitialiserMotDePasse(userId);
              setResultat({ provisoire: r.provisoire, nom: r.nom });
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Erreur");
            }
          })
        }
        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-3 py-1 whitespace-nowrap disabled:opacity-50"
        title={`Générer un mot de passe provisoire pour ${nom}`}
      >
        {pending ? "…" : "Mot de passe oublié"}
      </button>

      {erreur && <span className="text-xs text-red-600 ml-2">{erreur}</span>}

      {resultat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fsy-dark/70"
          onClick={() => setResultat(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl">🔑</div>
            <h2 className="font-bold text-lg mt-2">Mot de passe provisoire</h2>
            <p className="text-sm text-slate-600 mt-1">
              Pour <strong>{resultat.nom}</strong>. Dictez-le maintenant : il ne sera plus
              affiché.
            </p>
            <div className="mt-4 bg-slate-100 rounded-xl py-4 font-mono text-2xl tracking-widest select-all">
              {resultat.provisoire}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              À la connexion, l'application lui demandera d'en choisir un nouveau.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resultat.provisoire);
                    setCopie(true);
                    setTimeout(() => setCopie(false), 2000);
                  } catch {
                    /* le presse-papier peut être refusé : le mot de passe reste lisible */
                  }
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-lg py-2.5 text-sm font-medium"
              >
                {copie ? "✓ Copié" : "Copier"}
              </button>
              <button
                onClick={() => setResultat(null)}
                className="flex-1 bg-fsy hover:bg-fsy-dark text-white rounded-lg py-2.5 text-sm font-semibold"
              >
                J'ai noté
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Enregistre la vraie adresse de quelqu'un qui ne peut plus se connecter — donc
// qui ne peut pas la saisir lui-même. Sans cela, un compte à identifiant
// d'attente resterait à jamais hors de portée du « mot de passe oublié ».
export function BoutonAdresse({
  userId,
  nom,
  email,
  attente,
}: {
  userId: string;
  nom: string;
  email: string;
  attente: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [valeur, setValeur] = useState(attente ? "" : email);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, demarrer] = useTransition();

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className={`text-xs rounded-full px-3 py-1 whitespace-nowrap ${
          attente
            ? "bg-amber-100 hover:bg-amber-200 text-amber-900"
            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
        }`}
        title={`Enregistrer l'adresse e-mail de ${nom}`}
      >
        {ok ? "✓ Adresse enregistrée" : attente ? "Adresse à renseigner" : "Changer l'adresse"}
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1 min-w-[200px]">
      <input
        autoFocus
        type="email"
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        placeholder="adresse@exemple.com"
        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm"
      />
      {erreur && <p className="text-xs text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending || !valeur.includes("@")}
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              const r = await definirEmail(userId, valeur);
              if (r && "erreur" in r && r.erreur) setErreur(r.erreur);
              else {
                setOk(true);
                setOuvert(false);
              }
            })
          }
          className="text-xs bg-fsy hover:bg-fsy-dark text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        <button
          onClick={() => setOuvert(false)}
          className="text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// Vérifie que Resend est bien configuré, en s'écrivant à soi-même. Plus court
// que d'attendre qu'un encadrant signale ne rien avoir reçu.
export function EssaiEmail({ actif }: { actif: boolean }) {
  const [message, setMessage] = useState<{ ok?: string; erreur?: string } | null>(null);
  const [pending, demarrer] = useTransition();

  return (
    <div className="space-y-2">
      <button
        disabled={pending || !actif}
        onClick={() =>
          demarrer(async () => {
            setMessage(null);
            setMessage(await envoyerEmailDEssai());
          })
        }
        className="bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        {pending ? "Envoi…" : "M'envoyer un message d'essai"}
      </button>
      {message?.ok && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-2">
          ✅ {message.ok}
        </p>
      )}
      {message?.erreur && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          {message.erreur}
        </p>
      )}
    </div>
  );
}
