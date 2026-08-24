"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ajouterJeuneSurPlace,
  adopterJeuneExistant,
  type JeuneRessemblant,
  type SaisieJeune,
} from "@/lib/actions";

// Un enfant est là, et il n'est pas sur la liste. Le conseiller l'ajoute
// depuis son téléphone : nom, prénoms, pieu, paroisse — et l'application
// vérifie d'abord qu'il n'existe pas déjà sous une autre orthographe ou un
// autre pieu, pour proposer un déplacement plutôt qu'un doublon.
export function AjoutJeuneSurPlace({
  pieux,
  paroissesParPieu,
  groupes,
}: {
  pieux: { id: string; nom: string }[];
  /** Les paroisses connues de chaque pieu, d'après les inscrits. */
  paroissesParPieu: Record<string, string[]>;
  /** Les groupes du conseiller — un seul dans presque tous les cas. */
  groupes: { id: string; nom: string; sexe: string }[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [pieuId, setPieuId] = useState("");
  const [paroisse, setParoisse] = useState("");
  const [paroisseLibre, setParoisseLibre] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [groupeId, setGroupeId] = useState(groupes.length === 1 ? groupes[0].id : "");
  const [ressemblants, setRessemblants] = useState<JeuneRessemblant[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const paroisses = pieuId ? (paroissesParPieu[pieuId] ?? []) : [];
  const paroisseFinale = paroisse === "__autre__" ? paroisseLibre : paroisse;

  const saisie = (): SaisieJeune => ({
    prenom,
    nom,
    pieuId,
    paroisse: paroisseFinale,
    dateNaissance: dateNaissance || undefined,
    groupeId: groupeId || undefined,
  });

  function fermer() {
    setOuvert(false);
    setPrenom("");
    setNom("");
    setPieuId("");
    setParoisse("");
    setParoisseLibre("");
    setDateNaissance("");
    setRessemblants(null);
    setMessage(null);
  }

  function soumettre(confirmerCreation: boolean) {
    setMessage(null);
    startTransition(async () => {
      const r = await ajouterJeuneSurPlace(saisie(), confirmerCreation);
      if (r.ok) {
        setFait(`${r.prenom} ${r.nom} est dans votre groupe, marqué(e) présent(e).`);
        fermer();
        router.refresh();
      } else if ("ressemblants" in r && r.ressemblants) {
        setRessemblants(r.ressemblants);
      } else if ("motif" in r) {
        setMessage(r.motif);
      }
    });
  }

  function adopter(j: JeuneRessemblant) {
    setMessage(null);
    startTransition(async () => {
      const r = await adopterJeuneExistant(j.id, groupeId || undefined);
      if (r.ok) {
        setFait(
          `${r.prenom} ${r.nom} a été déplacé(e) dans votre groupe` +
            (r.reactive ? " — son inscription annulée a été réactivée." : ".")
        );
        fermer();
        router.refresh();
      } else {
        setMessage(r.motif);
      }
    });
  }

  const champ =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-fsy";

  return (
    <section className="bg-white rounded-xl shadow-sm">
      {fait && (
        <p className="m-3 mb-0 text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg p-3">
          ✅ {fait}
        </p>
      )}
      <button
        onClick={() => (ouvert ? fermer() : setOuvert(true))}
        className="w-full text-left p-4 font-medium text-fsy"
      >
        {ouvert ? "✕ Fermer" : "➕ Ajouter un jeune arrivé sans inscription"}
      </button>

      {ouvert && !ressemblants && (
        <form
          className="p-4 pt-0 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            soumettre(false);
          }}
        >
          <p className="text-sm text-slate-500">
            L&apos;enfant rejoindra votre groupe et sera marqué présent. L&apos;application
            vérifie d&apos;abord qu&apos;il n&apos;est pas déjà inscrit sous une autre
            orthographe ou un autre pieu.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <span className="font-medium">Prénoms</span>
              <input required value={prenom} onChange={(e) => setPrenom(e.target.value)} className={champ} />
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium">Nom</span>
              <input required value={nom} onChange={(e) => setNom(e.target.value)} className={champ} />
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium">Pieu ou district</span>
              <select
                required
                value={pieuId}
                onChange={(e) => {
                  setPieuId(e.target.value);
                  setParoisse("");
                }}
                className={champ}
              >
                <option value="">— Choisir —</option>
                {pieux.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium">Paroisse ou branche</span>
              <select
                required
                disabled={!pieuId}
                value={paroisse}
                onChange={(e) => setParoisse(e.target.value)}
                className={champ}
              >
                <option value="">{pieuId ? "— Choisir —" : "Choisissez d'abord le pieu"}</option>
                {paroisses.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="__autre__">Autre…</option>
              </select>
            </label>
            {paroisse === "__autre__" && (
              <label className="text-sm space-y-1 sm:col-span-2">
                <span className="font-medium">Nom de la paroisse</span>
                <input
                  required
                  value={paroisseLibre}
                  onChange={(e) => setParoisseLibre(e.target.value)}
                  className={champ}
                />
              </label>
            )}
            <label className="text-sm space-y-1">
              <span className="font-medium">
                Date de naissance <span className="text-slate-400 font-normal">(si connue)</span>
              </span>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className={champ}
              />
            </label>
            {groupes.length > 1 && (
              <label className="text-sm space-y-1">
                <span className="font-medium">Dans quel groupe ?</span>
                <select required value={groupeId} onChange={(e) => setGroupeId(e.target.value)} className={champ}>
                  <option value="">— Choisir —</option>
                  {groupes.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nom}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {message && <p className="text-sm text-red-600">{message}</p>}
          <button
            disabled={pending}
            className="bg-fsy text-white rounded-lg px-4 py-2.5 font-medium hover:bg-fsy-dark disabled:opacity-50"
          >
            {pending ? "Vérification…" : "Ajouter à mon groupe"}
          </button>
        </form>
      )}

      {ouvert && ressemblants && (
        <div className="p-4 pt-0 space-y-3">
          <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
            <strong>Un enfant au nom proche est déjà inscrit.</strong> Si c&apos;est bien lui,
            déplacez-le dans votre groupe plutôt que de créer une deuxième fiche — sinon les
            listes, l&apos;appel et les repas le compteraient deux fois.
          </p>
          <ul className="space-y-2">
            {ressemblants.map((j) => (
              <li key={j.id} className="border border-slate-200 rounded-lg p-3 text-sm">
                <div className="font-medium">
                  {j.prenom} {j.nom}
                  {j.annule && (
                    <span className="ml-2 text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                      Inscription annulée
                    </span>
                  )}
                </div>
                <div className="text-slate-500">
                  {j.pieu}
                  {j.paroisse && ` · ${j.paroisse}`} · {j.groupe ?? "sans groupe"}
                </div>
                {j.dejaChezMoi ? (
                  <p className="mt-1.5 text-green-700 font-medium">
                    Déjà dans votre groupe — rien à faire, marquez-le simplement présent à
                    l&apos;appel.
                  </p>
                ) : j.memeSexe ? (
                  <button
                    disabled={pending}
                    onClick={() => adopter(j)}
                    className="mt-1.5 bg-fsy text-white rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    C&apos;est lui — {j.annule ? "réactiver et déplacer" : "déplacer"} dans mon
                    groupe
                  </button>
                ) : (
                  <p className="mt-1.5 text-slate-500">
                    {j.sexe === "F" ? "Jeune fille" : "Jeune homme"} — à orienter vers{" "}
                    {j.sexe === "F" ? "une conseillère" : "un conseiller"}, pas vers votre
                    groupe.
                  </p>
                )}
              </li>
            ))}
          </ul>
          {message && <p className="text-sm text-red-600">{message}</p>}
          <div className="flex gap-2 flex-wrap">
            <button
              disabled={pending}
              onClick={() => soumettre(true)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Non, c&apos;est bien un autre enfant — créer la fiche
            </button>
            <button
              onClick={() => setRessemblants(null)}
              className="text-sm text-slate-500 underline px-2"
            >
              Revenir au formulaire
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
