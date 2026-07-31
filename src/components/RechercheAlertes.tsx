"use client";

import { useMemo, useState, useTransition } from "react";
import { modifierRenseignementJeune } from "@/lib/actions";

export type FicheAlerte = {
  id: string;
  nom: string;
  sexe: string;
  medical: string | null;
  alimentaire: string | null;
  groupe: string | null;
  compagnie: string | null;
  pieu: string;
  conseiller: { nom: string; telephone: string | null } | null;
  contact: { nom: string; telephone: string | null } | null;
};

const FILTRES = [
  { cle: "tous", label: "Tout" },
  { cle: "medical", label: "⚕️ Médical" },
  { cle: "alimentaire", label: "🍽 Alimentaire" },
] as const;

// Cette liste sera consultée dans l'urgence — à l'infirmerie, au réfectoire,
// au bord d'un car. La recherche porte donc aussi sur le contenu de l'alerte
// (« asthme », « arachide »), et pas seulement sur le nom : on cherche parfois
// « qui est allergique à quoi » avant de chercher quelqu'un.
export function RechercheAlertes({
  fiches,
  peutCorriger = false,
}: {
  fiches: FicheAlerte[];
  peutCorriger?: boolean;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]["cle"]>("tous");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [corrige, setCorrige] = useState<string | null>(null);

  const visibles = useMemo(() => {
    const q = recherche
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    return fiches.filter((f) => {
      if (filtre === "medical" && !f.medical) return false;
      if (filtre === "alimentaire" && !f.alimentaire) return false;
      if (!q) return true;
      const foin = `${f.nom} ${f.groupe ?? ""} ${f.compagnie ?? ""} ${f.pieu} ${f.medical ?? ""} ${f.alimentaire ?? ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return q.split(/\s+/).every((mot) => foin.includes(mot));
    });
  }, [fiches, recherche, filtre]);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm p-3 space-y-2 sticky top-[68px] z-10">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Un nom, un groupe, ou « asthme », « arachide »…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-fsy"
        />
        <div className="flex gap-2">
          {FILTRES.map((f) => (
            <button
              key={f.cle}
              onClick={() => setFiltre(f.cle)}
              className={`text-sm rounded-lg px-3 py-1.5 font-medium ${
                filtre === f.cle
                  ? "bg-fsy text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto self-center text-sm text-slate-500">
            {visibles.length} sur {fiches.length}
          </span>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white rounded-xl shadow-sm p-4">
          Aucun jeune ne correspond.
        </p>
      ) : (
        <ul className="space-y-2">
          {visibles.map((f) => (
            <li key={f.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-bold">
                    {f.nom}{" "}
                    <span className="text-slate-400 font-normal text-sm">
                      {f.sexe === "F" ? "fille" : "garçon"}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {f.groupe ? (
                      <>
                        {f.groupe}
                        {f.compagnie && ` · ${f.compagnie}`}
                      </>
                    ) : (
                      <span className="text-amber-700 font-medium">sans groupe</span>
                    )}{" "}
                    · {f.pieu}
                  </div>
                </div>
                {f.conseiller && (
                  <div className="text-sm text-right shrink-0">
                    <div className="text-slate-400 text-xs">Conseiller</div>
                    <div>{f.conseiller.nom}</div>
                    {f.conseiller.telephone && (
                      <a
                        href={`tel:${f.conseiller.telephone.replace(/\s/g, "")}`}
                        className="text-fsy underline"
                      >
                        {f.conseiller.telephone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {f.medical && (
                <p className="mt-2 text-sm bg-red-50 border-l-4 border-red-300 rounded-r-lg p-2.5">
                  <span className="font-semibold text-red-900">⚕️ Santé — </span>
                  {f.medical}
                </p>
              )}
              {f.alimentaire && (
                <p className="mt-2 text-sm bg-amber-50 border-l-4 border-amber-300 rounded-r-lg p-2.5">
                  <span className="font-semibold text-amber-900">🍽 Alimentation — </span>
                  {f.alimentaire}
                </p>
              )}

              {f.contact && (
                <div className="mt-2">
                  {ouvert === f.id ? (
                    <div className="text-sm bg-slate-50 rounded-lg p-2.5">
                      <span className="text-slate-500">Contact d'urgence : </span>
                      <span className="font-medium">{f.contact.nom}</span>
                      {f.contact.telephone && (
                        <>
                          {" · "}
                          <a
                            href={`tel:${f.contact.telephone.replace(/\s/g, "")}`}
                            className="text-fsy underline font-medium"
                          >
                            {f.contact.telephone}
                          </a>
                        </>
                      )}
                    </div>
                  ) : (
                    // Replié par défaut : soixante numéros de parents affichés
                    // en permanence seraient une exposition sans usage.
                    <button
                      onClick={() => setOuvert(f.id)}
                      className="text-sm text-fsy hover:underline"
                    >
                      Afficher le contact d'urgence
                    </button>
                  )}
                </div>
              )}

              {peutCorriger &&
                (corrige === f.id ? (
                  <Correction fiche={f} fermer={() => setCorrige(null)} />
                ) : (
                  <button
                    onClick={() => setCorrige(f.id)}
                    className="mt-2 text-xs text-slate-400 hover:text-fsy underline"
                  >
                    Corriger ce renseignement
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Corriger une déclaration.
//
// Les familles écrivent vite, dans un champ libre : le rapport du bien-être
// signalait « Asiatique » là où il fallait lire « Asthmatique ». Une faute de ce
// genre ne se corrige pas dans le fichier d'origine, qui a déjà servi — elle se
// corrige ici, et la correction est journalisée.
function Correction({ fiche, fermer }: { fiche: FicheAlerte; fermer: () => void }) {
  const [medical, setMedical] = useState(fiche.medical ?? "");
  const [alimentaire, setAlimentaire] = useState(fiche.alimentaire ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();

  return (
    <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
      <label className="block text-xs">
        <span className="text-slate-500">Renseignement médical</span>
        <textarea
          value={medical}
          onChange={(e) => setMedical(e.target.value)}
          rows={2}
          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-xs">
        <span className="text-slate-500">Contrainte alimentaire</span>
        <textarea
          value={alimentaire}
          onChange={(e) => setAlimentaire(e.target.value)}
          rows={2}
          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <p className="text-xs text-slate-400">
        Vider un champ retire l'alerte. La correction est enregistrée au journal.
      </p>
      {erreur && <p className="text-xs text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            demarrer(async () => {
              setErreur(null);
              try {
                await modifierRenseignementJeune(fiche.id, medical, alimentaire);
                fermer();
              } catch {
                setErreur("La correction n'a pas abouti. Rechargez la page et réessayez.");
              }
            })
          }
          className="text-xs bg-fsy hover:bg-fsy-dark text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        <button
          onClick={fermer}
          className="text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
