"use client";

import { useState, useTransition } from "react";
import { resynchroniserProgramme, type BilanProgramme } from "@/lib/actions";

const LIBELLES: Record<string, string> = {
  DIRIGER: "dirige",
  ENSEIGNER: "enseigne",
  SUPERVISER: "supervise",
  AIDER: "aide",
  ASSISTER: "assiste",
  RECEVOIR: "reçoit les rapports d'appel",
  FACULTATIF: "facultatif",
  SI_ATTRIBUE: "si attribué",
  AUCUN: "ne le concerne pas",
};
// Une ligne de rôles se lit « DIRIGER / RECEVOIR / … » ; une date, non. On ne
// traduit que ce qui est une suite de quatre rôles connus.
const lisible = (r: string) => {
  const parts = r.split(" / ");
  if (parts.length !== 4 || !parts.every((x) => x in LIBELLES)) return r;
  return parts
    .map((x, i) => `${["conseiller", "adjoint", "coordinateur", "couple"][i]} : ${LIBELLES[x]}`)
    .join(" · ");
};

// Remettre les rôles attendus du programme officiel sur les activités déjà en
// base.
//
// Le programme n'est semé qu'à la création de la base : corriger le fichier de
// référence ne touche pas une base déjà remplie, et c'est le cas de la
// production. Sans ce bouton, une correction du manuel resterait dans le code
// sans jamais atteindre ceux qu'elle concerne.
export function ResynchroniserProgramme() {
  const [bilan, setBilan] = useState<BilanProgramme | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [pending, demarrer] = useTransition();

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="text-xs text-slate-400 hover:text-fsy underline"
      >
        Programme officiel : horaires et rôles
      </button>
    );
  }

  return (
    <div
      data-resync
      className="bg-white rounded-xl shadow-sm p-4 space-y-2 border border-slate-200"
    >
      <h2 className="font-bold text-sm">Remettre le programme sur la référence</h2>
      <p className="text-xs text-slate-500">
        Rejoue les horaires officiels et le rôle attendu de chaque niveau sur les activités
        du programme. Ne touche ni aux titres, ni aux lieux, ni aux activités ajoutées sur
        place. À lancer après un changement de dates.
      </p>

      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              try {
                const r = await resynchroniserProgramme();
                if (r.ok) setBilan(r);
                else setErreur(r.motif);
              } catch {
                setErreur("La mise à jour n'a pas abouti. Rechargez la page et réessayez.");
              }
            })
          }
          className="text-xs bg-fsy hover:bg-fsy-dark text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-40"
        >
          {pending ? "…" : "Mettre à jour le programme"}
        </button>
        <button
          onClick={() => setOuvert(false)}
          className="text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5"
        >
          Fermer
        </button>
      </div>

      {erreur && (
        <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg p-2">
          {erreur}
        </p>
      )}

      {bilan && (
        <div className="text-xs bg-green-50 border border-green-200 rounded-lg p-2.5 text-green-900">
          <p className="font-medium">
            {bilan.misAJour === 0
              ? "✅ Tout était déjà à jour."
              : `✅ ${bilan.misAJour} activités remises sur la référence` +
                (bilan.datesDeplacees > 0 ? `, dont ${bilan.datesDeplacees} déplacées.` : ".")}{" "}
            <span className="font-normal text-green-800">
              {bilan.inchangees} déjà conformes.
            </span>
          </p>
          {bilan.details.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {bilan.details.map((d, i) => (
                <li key={`${d.titre}-${i}`}>
                  <strong>
                    J{d.jour} {d.heure} — {d.titre}
                  </strong>
                  <div className="text-green-800">avant : {lisible(d.avant)}</div>
                  <div>après : {lisible(d.apres)}</div>
                </li>
              ))}
            </ul>
          )}
          {bilan.ignores.length > 0 && (
            <p className="mt-1.5 text-amber-900">
              Non traitées, parce que modifiées sur place : {bilan.ignores.join(" ; ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
