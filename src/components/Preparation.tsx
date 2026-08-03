"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  basculerTachePreparation,
  confierResponsabilite,
  noterTachePreparation,
} from "@/lib/actions";

export type EtatTache = {
  cle: string;
  faite: boolean;
  faitPar: string | null;
  faitLe: string | null;
  note: string | null;
};

export type JalonAffiche = {
  cle: string;
  echeance: string;
  intitule: string;
  qui: string;
  detail?: string;
};

// Un jalon du calendrier de préparation.
//
// Cocher ne suffit pas : « site réservé » et « site réservé, contrat en attente
// de signature » ne sont pas la même chose, et c'est la seconde qu'on veut lire
// trois semaines plus tard. D'où la note, à côté de la case.
function Jalon({ jalon, etat }: { jalon: JalonAffiche; etat?: EtatTache }) {
  const [note, setNote] = useState(etat?.note ?? "");
  const [ecrit, setEcrit] = useState(false);
  const [pending, demarrer] = useTransition();
  // La case bascule tout de suite, sans attendre le serveur : sur un réseau
  // mobile, une case qui ne bouge pas pendant une seconde se reclique, et le
  // second clic annule le premier.
  const [fait, cocher] = useOptimistic(etat?.faite ?? false);

  return (
    <li
      data-jalon={jalon.cle}
      className={`rounded-lg border p-3 ${
        fait ? "bg-green-50 border-green-200" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={fait}
          disabled={pending}
          onChange={() =>
            demarrer(async () => {
              cocher(!fait);
              await basculerTachePreparation(jalon.cle);
            })
          }
          aria-label={jalon.intitule}
          className="mt-1 h-5 w-5 shrink-0 accent-green-600"
        />
        <div className="min-w-0 flex-1">
          <div className={`font-medium text-sm ${fait ? "text-green-900" : ""}`}>
            {jalon.intitule}
          </div>
          <div className="text-xs text-slate-500">{jalon.qui}</div>
          {jalon.detail && <p className="text-xs text-slate-600 mt-1">{jalon.detail}</p>}
          {fait && etat?.faitPar && (
            <p className="text-xs text-green-700 mt-1">
              Fait par {etat.faitPar}
              {etat.faitLe && ` · ${etat.faitLe}`}
            </p>
          )}

          {ecrit ? (
            <div className="mt-2 flex gap-2 items-start">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Où en est-on ?"
                className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                disabled={pending}
                onClick={() =>
                  demarrer(async () => {
                    await noterTachePreparation(jalon.cle, note);
                    setEcrit(false);
                  })
                }
                className="text-xs bg-fsy hover:bg-fsy-dark text-white rounded-lg px-3 py-1.5 disabled:opacity-40"
              >
                {pending ? "…" : "Noter"}
              </button>
            </div>
          ) : etat?.note ? (
            <button
              onClick={() => setEcrit(true)}
              className="mt-1.5 block text-left text-xs bg-amber-50 border border-amber-200 rounded p-2 text-amber-900 w-full hover:bg-amber-100"
            >
              {etat.note}
            </button>
          ) : (
            <button
              onClick={() => setEcrit(true)}
              className="mt-1.5 text-xs text-slate-400 hover:text-fsy underline"
            >
              Ajouter une note
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function Calendrier({
  jalons,
  etats,
}: {
  jalons: JalonAffiche[];
  etats: Record<string, EtatTache>;
}) {
  const echeances = [...new Set(jalons.map((j) => j.echeance))];
  const faits = jalons.filter((j) => etats[j.cle]?.faite).length;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-bold">Calendrier de préparation</h2>
        <p className="text-sm text-slate-500">
          Les jalons du guide de planification qui relèvent de cette session — {faits} sur{" "}
          {jalons.length} accomplis. Les échéances comptent en mois avant le premier jour.
        </p>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all"
          style={{ width: `${Math.round((faits / jalons.length) * 100)}%` }}
        />
      </div>
      {echeances.map((e) => (
        <div key={e}>
          <h3 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-3 mb-1.5">
            {e}
          </h3>
          <ul className="space-y-2">
            {jalons
              .filter((j) => j.echeance === e)
              .map((j) => (
                <Jalon key={j.cle} jalon={j} etat={etats[j.cle]} />
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export type Titulaire = {
  cle: string;
  nom: string | null;
  telephone: string | null;
  userId: string | null;
  note: string | null;
};

export function Comite({
  roles,
  titulaires,
  encadrants,
}: {
  roles: { cle: string; nom: string; role: string }[];
  titulaires: Record<string, Titulaire>;
  encadrants: { id: string; nom: string }[];
}) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-bold">Comité logistique</h2>
        <p className="text-sm text-slate-500">
          Onze responsabilités prévues par le guide. Le titulaire n&apos;a pas forcément de
          compte : l&apos;administrateur des repas peut être le gestionnaire de la cafétéria du
          site. Un nom et un numéro suffisent — c&apos;est souvent tout ce qu&apos;on a le jour
          où il faut appeler.
        </p>
      </div>
      <ul className="space-y-2">
        {roles.map((r) => (
          <Responsabilite key={r.cle} role={r} titulaire={titulaires[r.cle]} encadrants={encadrants} />
        ))}
      </ul>
    </section>
  );
}

function Responsabilite({
  role,
  titulaire,
  encadrants,
}: {
  role: { cle: string; nom: string; role: string };
  titulaire?: Titulaire;
  encadrants: { id: string; nom: string }[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [userId, setUserId] = useState(titulaire?.userId ?? "");
  const [nom, setNom] = useState(titulaire?.nom ?? "");
  const [telephone, setTelephone] = useState(titulaire?.telephone ?? "");
  const [pending, demarrer] = useTransition();

  const affiche = titulaire?.userId
    ? encadrants.find((e) => e.id === titulaire.userId)?.nom ?? "compte lié"
    : titulaire?.nom;

  return (
    <li data-role={role.cle} className="bg-white rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-medium text-sm">{role.nom}</div>
          <div className="text-xs text-slate-500">{role.role}</div>
        </div>
        <div className="text-sm text-right shrink-0">
          {affiche ? (
            <>
              <div className="font-medium">{affiche}</div>
              {titulaire?.telephone && (
                <a
                  href={`tel:${titulaire.telephone.replace(/\s/g, "")}`}
                  className="text-fsy underline text-xs"
                >
                  {titulaire.telephone}
                </a>
              )}
            </>
          ) : (
            <span className="text-xs text-amber-700">non pourvu</span>
          )}
          <button
            onClick={() => setOuvert((o) => !o)}
            className="block ml-auto text-xs text-slate-400 hover:text-fsy underline mt-0.5"
          >
            {affiche ? "Changer" : "Confier"}
          </button>
        </div>
      </div>

      {ouvert && (
        <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
          <label className="block text-xs">
            <span className="text-slate-500">Un encadrant déjà inscrit</span>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 bg-white text-sm"
            >
              <option value="">— quelqu&apos;un d&apos;autre —</option>
              {encadrants.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </select>
          </label>
          {!userId && (
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Nom"
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Téléphone"
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() =>
                demarrer(async () => {
                  await confierResponsabilite(role.cle, { userId, nom, telephone });
                  setOuvert(false);
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
      )}
    </li>
  );
}
