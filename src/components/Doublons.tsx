"use client";

import { useState, useTransition } from "react";
import { fusionnerComptes } from "@/lib/actions";

export type CompteDouble = {
  id: string;
  nom: string;
  email: string;
  adresseDAttente: boolean;
  role: string;
  detail: string;
  porte: string[];
  moi: boolean;
};

export type PaireDouble = {
  cle: string;
  fiabilite: "certain" | "probable" | "à vérifier";
  a: CompteDouble;
  b: CompteDouble;
};

const COULEURS: Record<PaireDouble["fiabilite"], string> = {
  certain: "bg-green-100 text-green-900",
  probable: "bg-blue-100 text-blue-900",
  "à vérifier": "bg-amber-100 text-amber-900",
};

// Deux comptes pour une même personne, déjà validés tous les deux.
//
// La fusion n'est pas une suppression : tout ce que porte le compte absorbé
// rejoint celui qu'on garde, l'appel le plus élevé des deux est conservé, et
// l'adresse de connexion retenue est la vraie. On garde donc ses accès — il
// n'y a rien à redemander après coup.
//
// Le choix du compte à garder revient à un humain : rien ne se fait
// automatiquement, parce que fondre deux homonymes serait pire que le doublon.
function Fiche({
  c,
  autre,
  onFusion,
  pending,
}: {
  c: CompteDouble;
  autre: CompteDouble;
  onFusion: () => void;
  pending: boolean;
}) {
  return (
    <div
      data-compte={c.email}
      className="bg-white rounded-lg border border-slate-200 p-3 flex-1 min-w-[240px]"
    >
      <div className="font-medium text-sm">{c.nom}</div>
      <div className={`text-xs font-mono ${c.adresseDAttente ? "text-amber-700" : "text-slate-500"}`}>
        {c.email}
        {c.adresseDAttente && " (identifiant d'attente)"}
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {c.role} · {c.detail}
      </div>
      {c.porte.length > 0 && (
        <ul className="text-xs text-slate-600 mt-1.5 space-y-0.5">
          {c.porte.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
      )}
      {c.moi && (
        <div className="text-xs text-fsy mt-1.5">C&apos;est le compte avec lequel vous êtes connecté.</div>
      )}
      <button
        disabled={pending || autre.moi}
        onClick={onFusion}
        title={
          autre.moi
            ? "Vous êtes connecté avec l'autre compte : gardez celui-là."
            : undefined
        }
        className="mt-2 w-full text-xs bg-fsy hover:bg-fsy-dark text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "…" : "Garder celui-ci"}
      </button>
    </div>
  );
}

export function Doublons({ paires }: { paires: PaireDouble[] }) {
  const [erreur, setErreur] = useState<Record<string, string>>({});
  const [faits, setFaits] = useState<Record<string, { nom: string; email: string; quoi: string[] }>>({});
  const [ecartes, setEcartes] = useState<string[]>([]);
  const [encours, setEncours] = useState<string | null>(null);
  const [, demarrer] = useTransition();

  const restantes = paires.filter((p) => !ecartes.includes(p.cle) && !faits[p.cle]);

  const fusionner = (p: PaireDouble, garder: CompteDouble, absorber: CompteDouble) =>
    demarrer(async () => {
      setEncours(p.cle);
      setErreur((e) => ({ ...e, [p.cle]: "" }));
      try {
        const r = await fusionnerComptes(garder.id, absorber.id);
        if (!r.ok) setErreur((x) => ({ ...x, [p.cle]: r.motif }));
        else setFaits((f) => ({ ...f, [p.cle]: { nom: r.nom, email: r.email, quoi: r.consequences } }));
      } catch {
        setErreur((x) => ({ ...x, [p.cle]: "La fusion n'a pas abouti. Rechargez la page et réessayez." }));
      } finally {
        setEncours(null);
      }
    });

  const reussites = Object.entries(faits);
  // Une fois le dernier doublon réglé, le serveur ne renvoie plus rien — mais
  // le compte rendu de ce qui vient d'être fait doit rester à l'écran. Il dit
  // quelle adresse permet désormais de se connecter : le faire disparaître à
  // l'instant même où il devient utile serait un mauvais tour.
  if (paires.length === 0 && reussites.length === 0) return null;

  return (
    <section data-doublons className="bg-orange-50 border border-orange-300 rounded-xl p-4">
      <h2 className="font-bold text-orange-900">
        👥 {restantes.length > 0 ? restantes.length : "Aucun"} doublon
        {restantes.length > 1 ? "s" : ""} possible{restantes.length > 1 ? "s" : ""}
      </h2>
      {restantes.length > 0 && (
        <>
          <p className="text-sm text-orange-800 mt-1">
            Ces comptes portent des noms qui se ressemblent au point qu&apos;il s&apos;agit
            probablement de la même personne, inscrite une seconde fois. Un doublon se voit
            dans l&apos;organigramme, et coûte cher au moment des attestations.
          </p>
          <p className="text-sm text-orange-900 bg-orange-100 rounded-lg p-2.5 mt-2">
            <strong>Fusionner ne supprime rien.</strong> Le compte gardé récupère tout :
            groupes, rapports, pointages, photo, téléphone, l&apos;appel le plus élevé des deux
            et tous les droits accordés à l&apos;un ou à l&apos;autre. L&apos;adresse de
            connexion conservée est la vraie, avec le mot de passe choisi par la personne.
          </p>
        </>
      )}

      <ul className="mt-3 space-y-3">
        {restantes.map((p) => (
          <li key={p.cle} data-paire={p.cle} className="bg-white/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] rounded-full px-2 py-0.5 ${COULEURS[p.fiabilite]}`}>
                {p.fiabilite}
              </span>
              <span className="text-xs text-slate-500">
                Gardez le compte le plus complet : l&apos;autre viendra s&apos;y fondre.
              </span>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Fiche c={p.a} autre={p.b} pending={encours === p.cle} onFusion={() => fusionner(p, p.a, p.b)} />
              <Fiche c={p.b} autre={p.a} pending={encours === p.cle} onFusion={() => fusionner(p, p.b, p.a)} />
            </div>
            {erreur[p.cle] && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
                {erreur[p.cle]}
              </p>
            )}
            <button
              onClick={() => setEcartes((e) => [...e, p.cle])}
              className="text-xs text-slate-500 hover:underline mt-2"
            >
              Ce sont deux personnes différentes — masquer
            </button>
          </li>
        ))}
      </ul>

      {reussites.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {reussites.map(([cle, r]) => (
            <li
              key={cle}
              className="text-sm text-green-900 bg-green-50 border border-green-200 rounded-lg p-2.5"
            >
              ✅ Comptes réunis sur <strong>{r.nom}</strong> —{" "}
              <span className="font-mono text-xs">{r.email}</span>
              {r.quoi.length > 0 && <div className="text-xs text-green-800 mt-0.5">{r.quoi.join(" · ")}</div>}
            </li>
          ))}
        </ul>
      )}

      {restantes.length === 0 && reussites.length === 0 && (
        <p className="text-sm text-orange-800 mt-2">Tout est écarté.</p>
      )}
      {restantes.length === 0 && reussites.length > 0 && (
        <p className="text-sm text-orange-800 mt-2">
          Plus aucun doublon en attente. Prévenez les personnes concernées de l&apos;adresse
          avec laquelle elles se connectent désormais.
        </p>
      )}
    </section>
  );
}
