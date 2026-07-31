"use client";

import { useRef, useState, useTransition } from "react";
import { importerInscriptions, type ApercuImport } from "@/lib/actions";

const CHAMPS: { champ: string; libelle: string }[] = [
  { champ: "prenom", libelle: "Prénom" },
  { champ: "nom", libelle: "Nom" },
  { champ: "naissance", libelle: "Date de naissance" },
  { champ: "medical", libelle: "Renseignement médical" },
  { champ: "alimentaire", libelle: "Contrainte alimentaire" },
  { champ: "contactNom", libelle: "Contact d'urgence — nom" },
  { champ: "contactTelephone", libelle: "Contact d'urgence — téléphone" },
  { champ: "telephone", libelle: "Téléphone du jeune" },
  { champ: "email", libelle: "Adresse e-mail" },
];

// Verser le fichier d'inscription dans la base.
//
// Les renseignements médicaux ne sont pas versionnés — ils concernent des
// mineurs — donc ils n'arrivent pas avec le déploiement, et la page Santé reste
// vide tant que personne ne les charge. Les saisir un par un serait absurde :
// c'est le fichier lui-même qu'on verse, celui qui a servi aux inscriptions.
//
// Deux temps, toujours : on regarde ce qui serait fait, puis on le fait. Six
// cent cinquante fiches médicales ne s'écrasent pas à l'aveugle.
export function ImportInscriptions({ ouvertAuDepart = false }: { ouvertAuDepart?: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  const [apercu, setApercu] = useState<ApercuImport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Déplié tant qu'il n'y a rien en base, replié ensuite — mais c'est un état
  // du composant, pas une branche de rendu : le serveur re-rend la page après
  // le versement, et un composant qui changerait de place perdrait au passage
  // le compte rendu de ce qu'il vient de faire.
  const [ouvert, setOuvert] = useState(ouvertAuDepart);
  const [pending, demarrer] = useTransition();

  const envoyer = (appliquer: boolean) =>
    demarrer(async () => {
      setErreur(null);
      const f = form.current;
      if (!f) return;
      const donnees = new FormData(f);
      donnees.set("appliquer", appliquer ? "1" : "0");
      try {
        const r = await importerInscriptions(donnees);
        if (r.ok) setApercu(r);
        else { setErreur(r.motif); setApercu(null); }
      } catch {
        setErreur(
          "Le fichier n'a pas pu être envoyé. S'il dépasse quelques mégaoctets, " +
            "enregistrez-le au format .csv et réessayez."
        );
      }
    });

  if (!ouvert) {
    return (
      <section className="bg-white rounded-xl shadow-sm p-4">
        <button onClick={() => setOuvert(true)} className="font-bold text-left hover:text-fsy">
          Mettre à jour depuis le fichier d&apos;inscription
        </button>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div>
        <h2 className="font-bold">Verser le fichier d&apos;inscription</h2>
        <p className="text-sm text-slate-500">
          Le fichier d&apos;inscription (.xlsx ou .csv) porte les renseignements médicaux, les
          contraintes alimentaires et les contacts d&apos;urgence. Ils ne sont pas livrés avec
          l&apos;application — ils concernent des mineurs et ne sont donc pas versionnés — et
          doivent être versés ici une fois.
        </p>
      </div>

      <form ref={form} className="space-y-3">
        <input
          type="file"
          name="fichier"
          accept=".xlsx,.xlsm,.csv"
          onChange={() => { setApercu(null); setErreur(null); }}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-fsy file:px-4 file:py-2 file:text-white file:font-medium hover:file:bg-fsy-dark"
        />

        {apercu && (
          <details className="text-sm border border-slate-200 rounded-lg p-3">
            <summary className="cursor-pointer font-medium">
              Colonnes reconnues — feuille « {apercu.feuille} »
            </summary>
            <p className="text-xs text-slate-500 mt-1.5">
              Corrigez ce qui a été mal deviné. Une colonne laissée sur « — » n&apos;est pas
              reprise.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {CHAMPS.map(({ champ, libelle }) => {
                const detecte = apercu.colonnes.find((c) => c.champ === champ)?.libelle ?? null;
                const index = detecte ? apercu.entetes.indexOf(detecte) : -1;
                return (
                  <label key={champ} className="text-xs">
                    <span className="text-slate-500">{libelle}</span>
                    <select
                      name={`col_${champ}`}
                      defaultValue={String(index)}
                      className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 bg-white text-sm"
                    >
                      <option value="-1">—</option>
                      {apercu.entetes.map((e, i) => (
                        <option key={`${e}-${i}`} value={i}>
                          {e || `colonne ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => envoyer(false)}
              className="mt-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 disabled:opacity-40"
            >
              Réexaminer avec ces colonnes
            </button>
          </details>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            disabled={pending}
            onClick={() => envoyer(false)}
            className="text-sm bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 font-medium disabled:opacity-40"
          >
            {pending ? "Lecture…" : "Examiner le fichier"}
          </button>
          {apercu && !apercu.applique && apercu.apparies > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => envoyer(true)}
              className="text-sm bg-fsy hover:bg-fsy-dark text-white rounded-lg px-4 py-2 font-medium disabled:opacity-40"
            >
              {pending ? "…" : `Verser ${apercu.apparies} fiches dans la base`}
            </button>
          )}
        </div>
      </form>

      {erreur && (
        <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
          {erreur}
        </p>
      )}

      {apercu && (
        <div
          data-apercu-import
          className={`text-sm rounded-lg p-3 border ${
            apercu.applique
              ? "bg-green-50 border-green-200 text-green-900"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          {apercu.applique ? (
            <p className="font-medium">
              ✅ {apercu.ecrits} fiches complétées. La page se met à jour ci-dessus.
            </p>
          ) : (
            <p className="font-medium">
              Rien n&apos;a encore été écrit. Voici ce qui le serait :
            </p>
          )}
          <ul className="mt-1.5 space-y-0.5">
            <li>• {apercu.lues} lignes lues, {apercu.apparies} rattachées à un jeune
              {apercu.parLaDate > 0 && ` (dont ${apercu.parLaDate} confirmées par la date de naissance)`}</li>
            <li>• {apercu.aEcrire.medical} renseignements médicaux, {apercu.aEcrire.alimentaire} contraintes alimentaires</li>
            <li>• {apercu.aEcrire.contacts} contacts d&apos;urgence, {apercu.aEcrire.telephone} téléphones</li>
          </ul>

          {apercu.echantillon.length > 0 && !apercu.applique && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium">
                Voir un échantillon ({apercu.echantillon.length})
              </summary>
              <ul className="text-xs mt-1 space-y-0.5">
                {apercu.echantillon.map((e, i) => (
                  <li key={`${e.nom}-${i}`}>
                    <strong>{e.nom}</strong> — {[e.medical, e.alimentaire].filter(Boolean).join(" · ")}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {apercu.ambigus.length > 0 && (
            <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded p-2 text-amber-900">
              <strong>{apercu.ambigus.length} lignes ne sont pas reprises</strong> : plusieurs
              jeunes portent ce nom avec la même vraisemblance, et attribuer une allergie à la
              mauvaise personne serait pire que de ne rien écrire. À saisir à la main.
              <ul className="mt-1 space-y-0.5">
                {apercu.ambigus.map((a) => (
                  <li key={a.nom}>
                    • {a.nom} → {a.concurrents.join(" ou ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {apercu.introuvables.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">
                {apercu.introuvables.length} lignes sans jeune correspondant
              </summary>
              <p className="mt-1 text-slate-500">
                Normal pour une unité hors périmètre ou une inscription annulée.
              </p>
              <ul className="mt-1 space-y-0.5">
                {apercu.introuvables.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Le fichier est lu en mémoire et n&apos;est conservé nulle part : ni sur le serveur, ni
        dans le dépôt. Une cellule vide n&apos;efface jamais ce que la base contient déjà, et
        verser deux fois le même fichier ne fait pas de doublon.
      </p>
    </section>
  );
}
