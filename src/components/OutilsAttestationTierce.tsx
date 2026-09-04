"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  corrigerAttestationTierce,
  delivrerAttestationTierce,
  revoquerAttestationTierce,
  type SaisieAttestationTierce,
} from "@/lib/actions";
import {
  GENRES,
  NATURES,
  PERIODE_CONFERENCE,
  nature as natureDe,
  objetPropose as objetProposePour,
} from "@/lib/attestations-tierces";
import { EFFECTIFS, NB_JOURS } from "@/lib/theme";

// Le formulaire d'une attestation de fournisseur ou de bénévole.
//
// Six champs dont deux obligatoires : la nature choisie écrit l'objet toute
// seule, et le couple ne retouche que s'il le veut. C'est le samedi soir de la
// clôture qu'on remplira ceci, avec des gens qui attendent debout — chaque
// champ en trop est un fournisseur qui repart sans son document.

type Valeurs = {
  genre: string;
  nature: string;
  beneficiaire: string;
  representant: string;
  fonction: string;
  objet: string;
  precisions: string;
  periode: string;
  /** Trois cartouches « valeur / libellé » ; vides = l'ampleur de la conférence. */
  chiffres: { valeur: string; label: string }[];
};

const CHIFFRES_VIDES = [
  { valeur: "", label: "" },
  { valeur: "", label: "" },
  { valeur: "", label: "" },
];

const VIDE: Valeurs = {
  genre: "FOURNISSEUR",
  nature: "RESTAURATION",
  beneficiaire: "",
  representant: "",
  fonction: "",
  objet: "",
  precisions: "",
  periode: "",
  chiffres: CHIFFRES_VIDES,
};

const champ =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fsy/40";
const etiquette = "block text-xs font-medium text-slate-600 mb-1";

export function FormulaireAttestationTierce({
  existante,
  surFin,
}: {
  /** Présent en correction : l'attestation déjà délivrée. */
  existante?: { id: string; code: string } & Valeurs;
  surFin?: () => void;
}) {
  const router = useRouter();
  // Le formulaire de correction s'ouvre sous la liste, pendant que celui de
  // création reste en haut : sans préfixe, deux champs porteraient le même
  // identifiant et les étiquettes désigneraient le mauvais.
  const pre = useId();
  const [v, setV] = useState<Valeurs>(existante ?? VIDE);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();

  const maj = (k: keyof Valeurs) => (e: { target: { value: string } }) =>
    setV((x) => ({ ...x, [k]: e.target.value }));

  const majChiffre = (i: number, champ: "valeur" | "label", valeur: string) =>
    setV((x) => ({
      ...x,
      chiffres: x.chiffres.map((c, j) => (j === i ? { ...c, [champ]: valeur } : c)),
    }));

  const personne = v.genre === "PERSONNE";
  const n = natureDe(v.nature);
  const objetPropose = objetProposePour(v.genre, v.nature);

  const envoyer = () =>
    demarrer(async () => {
      setErreur(null);
      setSucces(null);
      const saisie: SaisieAttestationTierce = { ...v };
      const r = existante
        ? await corrigerAttestationTierce(existante.id, saisie)
        : await delivrerAttestationTierce(saisie);
      if (!r.ok) {
        setErreur(r.motif);
        return;
      }
      setSucces(
        existante
          ? `Attestation ${r.code} corrigée.`
          : `Attestation délivrée — code ${r.code}. Elle est prête à imprimer.`
      );
      if (!existante) setV({ ...VIDE, genre: v.genre, nature: v.nature });
      router.refresh();
      surFin?.();
    });

  return (
    <div className="space-y-3">
      {/* Fournisseur ou personne : ce choix change le titre du document et sa
          formulation — « a assuré » d'un côté, « a apporté bénévolement son
          concours » de l'autre. Il ne faut jamais laisser croire qu'un
          bénévole était payé, ni qu'un traiteur travaillait gratuitement. */}
      <div className="flex gap-2">
        {Object.values(GENRES).map((g) => (
          <button
            key={g.cle}
            type="button"
            onClick={() => setV((x) => ({ ...x, genre: g.cle }))}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border transition ${
              v.genre === g.cle
                ? "bg-fsy text-white border-fsy"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 -mt-1">
        Titre du document : <strong>{GENRES[v.genre as keyof typeof GENRES]?.titre}</strong>.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={etiquette} htmlFor={`${pre}-nature`}>
            Nature de la prestation
          </label>
          <select id={`${pre}-nature`} value={v.nature} onChange={maj("nature")} className={champ}>
            {NATURES.map((x) => (
              <option key={x.cle} value={x.cle}>
                {x.icone} {x.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={etiquette} htmlFor={`${pre}-beneficiaire`}>
            {personne ? "Nom et prénom" : "Raison sociale du fournisseur"}
          </label>
          <input
            id={`${pre}-beneficiaire`}
            value={v.beneficiaire}
            onChange={maj("beneficiaire")}
            placeholder={personne ? "Ex. : Évêque Douané" : "Ex. : Restaurant La Palmeraie"}
            className={champ}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {personne ? (
          <div>
            <label className={etiquette} htmlFor={`${pre}-fonction`}>
              Fonction exercée <span className="text-slate-400">(facultatif)</span>
            </label>
            <input
              id={`${pre}-fonction`}
              value={v.fonction}
              onChange={maj("fonction")}
              placeholder={n?.fonction || "Ex. : Responsable de la logistique"}
              className={champ}
            />
          </div>
        ) : (
          <div>
            <label className={etiquette} htmlFor={`${pre}-representant`}>
              Représenté par <span className="text-slate-400">(facultatif)</span>
            </label>
            <input
              id={`${pre}-representant`}
              value={v.representant}
              onChange={maj("representant")}
              placeholder="Ex. : M. Konan Yao, gérant"
              className={champ}
            />
          </div>
        )}
        <div>
          <label className={etiquette} htmlFor={`${pre}-periode`}>
            {personne ? "Quand est-il intervenu ?" : "Quand a-t-il travaillé ?"}{" "}
            <span className="text-slate-400">(facultatif)</span>
          </label>
          <input
            id={`${pre}-periode`}
            value={v.periode}
            onChange={maj("periode")}
            placeholder="Ex. : du 23 au 26 août 2026"
            className={champ}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            À remplir seulement si ce n&apos;est pas toute la conférence — un traiteur qui
            commence la veille, une équipe qui reste démonter. Les dates de la conférence («{" "}
            {PERIODE_CONFERENCE} ») ne bougent pas.
          </p>
        </div>
      </div>

      <div>
        <label className={etiquette} htmlFor={`${pre}-objet`}>
          Objet — s&apos;écrit après « {personne ? "À ce titre :" : "a assuré"} »
          {objetPropose && <span className="text-slate-400"> (facultatif)</span>}
        </label>
        <input
          id={`${pre}-objet`}
          value={v.objet}
          onChange={maj("objet")}
          placeholder={objetPropose || "Décrivez la prestation en une phrase"}
          className={champ}
        />
        {objetPropose && !v.objet.trim() && (
          <p className="text-[11px] text-slate-400 mt-1">
            Laissé vide, le document dira : «{" "}
            {personne ? `À ce titre : ${objetPropose}` : `… a assuré ${objetPropose}`} ».
          </p>
        )}
      </div>

      {/* Les trois cartouches du bas. Par défaut le document porte l'ampleur
          de la conférence — juste pour un traiteur, faux pour un imprimeur qui
          a travaillé sur les effectifs prévisionnels. */}
      <div>
        <span className={etiquette}>
          Chiffres mis en avant sur le document{" "}
          <span className="text-slate-400">(facultatif)</span>
        </span>
        <div className="space-y-2">
          {v.chiffres.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={c.valeur}
                onChange={(e) => majChiffre(i, "valeur", e.target.value)}
                placeholder={i === 0 ? "762" : i === 1 ? "652" : ""}
                className={`${champ} w-28 shrink-0 text-center font-semibold`}
                aria-label={`Chiffre ${i + 1}`}
              />
              <input
                value={c.label}
                onChange={(e) => majChiffre(i, "label", e.target.value)}
                placeholder={
                  i === 0 ? "t-shirts imprimés" : i === 1 ? "manuels livrés" : "ce que compte ce nombre"
                }
                className={champ}
                aria-label={`Libellé du chiffre ${i + 1}`}
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Laissés vides, le document porte l&apos;ampleur de la conférence ({EFFECTIFS.total}{" "}
          personnes, {EFFECTIFS.jeunes} jeunes, {NB_JOURS} jours). Renseignez-les quand ce
          n&apos;est pas la bonne mesure — un imprimeur a travaillé sur les quantités
          commandées, pas sur le nombre de présents.
        </p>
      </div>

      <div>
        <label className={etiquette} htmlFor={`${pre}-precisions`}>
          Ce que vous avez constaté <span className="text-slate-400">(facultatif)</span>
        </label>
        <textarea
          id={`${pre}-precisions`}
          rows={3}
          value={v.precisions}
          onChange={maj("precisions")}
          placeholder={"Un fait par ligne :\nEnviron 4 200 repas servis en six jours\nAucun retard sur les horaires de service"}
          className={champ}
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Un fait par ligne, six au maximum. N&apos;écrivez que ce que vous avez vraiment
          constaté : c&apos;est ce qui donne sa valeur au document.
        </p>
      </div>

      {erreur && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {erreur}
        </p>
      )}
      {succes && (
        <p className="text-sm text-green-900 bg-green-50 border border-green-200 rounded-lg p-3">
          {succes}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || v.beneficiaire.trim().length < 2}
          onClick={envoyer}
          className="bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition disabled:opacity-40"
        >
          {pending ? "…" : existante ? "Enregistrer la correction" : "Délivrer l'attestation"}
        </button>
        {existante && surFin && (
          <button
            type="button"
            onClick={surFin}
            className="bg-slate-100 hover:bg-slate-200 rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

// Corriger une attestation déjà délivrée : le formulaire revient, prérempli.
export function CorrigerAttestationTierce({
  attestation,
}: {
  attestation: { id: string; code: string } & Valeurs;
}) {
  const [ouvert, setOuvert] = useState(false);

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="text-xs text-slate-500 hover:text-fsy underline"
      >
        Corriger
      </button>
    );
  }
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <FormulaireAttestationTierce existante={attestation} surFin={() => setOuvert(false)} />
    </div>
  );
}

export function RevoquerAttestationTierce({ id, nom }: { id: string; nom: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="text-xs text-slate-400 hover:text-red-700 underline"
      >
        Révoquer
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <label className="block text-xs text-slate-500">Motif de la révocation de {nom}</label>
      <input
        autoFocus
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder="Ex. : délivrée deux fois"
        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm"
      />
      {erreur && <p className="text-xs text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending || motif.trim().length < 3}
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              const r = await revoquerAttestationTierce(id, motif);
              if (!r.ok) {
                setErreur(r.motif);
                return;
              }
              setOuvert(false);
              router.refresh();
            })
          }
          className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-40"
        >
          {pending ? "…" : "Confirmer"}
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
