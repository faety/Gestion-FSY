"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { basculerDroit, confierResponsabilite } from "@/lib/actions";
import { jetons } from "@/lib/rapprochement";
import { DROITS, ROLE_LABELS, roleAuMoins, type Droit, type Role } from "@/lib/roles";

// Retrouver quelqu'un de l'équipe par son nom, voir d'un coup d'œil ce qu'il
// porte — appel, affectation, droits, responsabilités, accès à la santé — et
// agir depuis la même fiche. Né d'un cas réel : un coordinateur du bien-être
// ne voyait pas la page Santé, et rien ne permettait de chercher son nom pour
// comprendre pourquoi.

export type PersonneEquipe = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  role: string;
  actif: boolean;
  attente: boolean;
  motDePasseProvisoire: boolean;
  droits: string[];
  groupes: string[];
  compagnie: string | null;
};

export type ResponsabiliteEtat = {
  cle: string;
  nom: string;
  titulaireId: string | null;
  titulaire: string | null;
};

export function RechercheEncadrant({
  personnes,
  responsabilites,
  estDirigeant,
}: {
  personnes: PersonneEquipe[];
  responsabilites: ResponsabiliteEtat[];
  estDirigeant: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [recherche, setRecherche] = useState("");
  const [choisiId, setChoisiId] = useState<string | null>(null);
  const [aConfier, setAConfier] = useState("");
  const [message, setMessage] = useState("");

  const indexe = useMemo(
    () => personnes.map((p) => ({ p, mots: jetons(p.prenom, p.nom) })),
    [personnes]
  );

  const resultats = useMemo(() => {
    const demandes = jetons(recherche, "");
    if (demandes.length === 0) return [];
    return indexe
      .filter(({ mots }) => demandes.every((d) => mots.some((m) => m.startsWith(d))))
      .map(({ p }) => p)
      .slice(0, 8);
  }, [indexe, recherche]);

  const choisi = personnes.find((p) => p.id === choisiId) ?? null;
  const siennes = choisi ? responsabilites.filter((r) => r.titulaireId === choisi.id) : [];

  // Le même verrou que la page Santé (voitToutesLesAlertes) : le dire ici,
  // avec la raison, évite d'aller le deviner dans le code ou d'accorder un
  // droit qui ne suffira pas.
  const acces = choisi
    ? roleAuMoins(choisi.role, "COORDINATEUR")
      ? { ok: true as const, motif: "Coordinateur principal ou couple dirigeant : tous les accès, santé comprise." }
      : roleAuMoins(choisi.role, "ADJOINT") && choisi.droits.includes("BIEN_ETRE")
        ? { ok: true as const, motif: "Adjoint avec le droit Bien-être : voit la page Santé et les alertes de tous les jeunes." }
        : {
            ok: false as const,
            motif: !roleAuMoins(choisi.role, "ADJOINT")
              ? choisi.droits.includes("BIEN_ETRE")
                ? "Son appel est Conseiller : le droit Bien-être ne vaut qu'au niveau adjoint. Passez d'abord son appel à « Coordinateur adjoint » (tableau Équipe), le droit s'accordera ensuite."
                : "Son appel est Conseiller : il ne voit que les jeunes de son groupe. La page Santé demande l'appel « Coordinateur adjoint » et le droit Bien-être."
              : "Adjoint sans le droit Bien-être : il ne voit que sa compagnie. Accordez le droit ci-dessous pour ouvrir la page Santé.",
          }
    : null;

  const agir = (fn: () => Promise<unknown>, fait: string) =>
    startTransition(async () => {
      setMessage("");
      await fn();
      setMessage(fait);
      router.refresh();
    });

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div>
        <h2 className="font-bold">🔎 Rechercher un encadrant</h2>
        <p className="text-sm text-slate-500">
          Tapez un nom pour vérifier ce qu&apos;il porte — appel, droits, responsabilités, accès à
          la santé — et le corriger d&apos;ici.
        </p>
      </div>

      <input
        type="search"
        value={recherche}
        onChange={(e) => {
          setRecherche(e.target.value);
          setChoisiId(null);
          setMessage("");
        }}
        placeholder="Nom ou prénom…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
      />

      {recherche && !choisi && (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {resultats.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setChoisiId(p.id);
                  setAConfier("");
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-baseline justify-between gap-2"
              >
                <span className="font-medium">
                  {p.prenom} {p.nom}
                </span>
                <span className="text-xs text-slate-500">
                  {ROLE_LABELS[p.role as Role] ?? p.role}
                  {p.groupes.length > 0 && ` · ${p.groupes.join(", ")}`}
                  {p.compagnie && ` · ${p.compagnie}`}
                </span>
              </button>
            </li>
          ))}
          {resultats.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">Personne ne correspond.</li>
          )}
        </ul>
      )}

      {choisi && (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-lg">
                {choisi.prenom} {choisi.nom}
                {!choisi.actif && (
                  <span className="ml-2 text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                    Absent
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-600">
                {ROLE_LABELS[choisi.role as Role] ?? choisi.role}
                {choisi.groupes.length > 0 && ` — ${choisi.groupes.join(", ")}`}
                {choisi.compagnie && ` — ${choisi.compagnie}`}
              </div>
              <div className={`text-xs ${choisi.attente ? "text-amber-700" : "text-slate-400"}`}>
                {choisi.email}
                {choisi.attente && " (adresse d'attente — aucun message ne peut y arriver)"}
                {choisi.telephone && ` · ${choisi.telephone}`}
              </div>
              {choisi.motDePasseProvisoire && (
                <div className="text-xs text-amber-700 mt-0.5">
                  Mot de passe provisoire : ne s&apos;est encore jamais connecté(e).
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setChoisiId(null)}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          {acces && (
            <div
              className={`text-sm rounded-lg border p-3 ${
                acces.ok
                  ? "bg-green-50 border-green-200 text-green-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              <span className="font-medium">
                {acces.ok ? "✅ Accès santé et alimentation : oui." : "🚫 Accès santé et alimentation : non."}
              </span>{" "}
              {acces.motif}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-700">Droits nominatifs</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {roleAuMoins(choisi.role, "COORDINATEUR") ? (
                <span className="text-sm text-slate-500">Tous les accès, d&apos;office.</span>
              ) : (
                Object.values(DROITS).map((d) => {
                  const accorde = choisi.droits.includes(d.cle);
                  const modifiable = estDirigeant && choisi.role === "ADJOINT";
                  return (
                    <button
                      key={d.cle}
                      type="button"
                      title={d.aide}
                      disabled={!modifiable || pending}
                      onClick={() =>
                        agir(
                          () => basculerDroit(choisi.id, d.cle as Droit),
                          accorde ? `Droit « ${d.label} » retiré.` : `Droit « ${d.label} » accordé.`
                        )
                      }
                      className={`text-xs rounded-full px-3 py-1.5 border transition disabled:opacity-60 ${
                        accorde
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      } ${modifiable ? "hover:border-fsy cursor-pointer" : "cursor-default"}`}
                    >
                      {accorde ? `${d.label} ✓` : d.label}
                    </button>
                  );
                })
              )}
            </div>
            {!estDirigeant && !roleAuMoins(choisi.role, "COORDINATEUR") && (
              <p className="text-xs text-slate-400 mt-1">
                Seul le couple dirigeant accorde ou retire un droit.
              </p>
            )}
            {estDirigeant && choisi.role === "CONSEILLER" && (
              <p className="text-xs text-slate-400 mt-1">
                Les droits ne s&apos;accordent qu&apos;aux adjoints — changez d&apos;abord son appel
                dans le tableau Équipe ci-dessous.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Responsabilités logistiques ({siennes.length})
            </h3>
            {siennes.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {siennes.map((r) => (
                  <li key={r.cle} className="flex items-center justify-between gap-2 text-sm">
                    <span>{r.nom}</span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        agir(
                          () => confierResponsabilite(r.cle, {}),
                          `Responsabilité « ${r.nom} » retirée.`
                        )
                      }
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 mt-1">Aucune pour l&apos;instant.</p>
            )}
            <div className="flex gap-2 mt-2">
              <select
                value={aConfier}
                onChange={(e) => setAConfier(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 bg-white text-sm min-w-0"
              >
                <option value="">— Confier une responsabilité —</option>
                {responsabilites
                  .filter((r) => r.titulaireId !== choisi.id)
                  .map((r) => (
                    <option key={r.cle} value={r.cle}>
                      {r.nom}
                      {r.titulaire ? ` (aujourd'hui : ${r.titulaire})` : " (vacante)"}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!aConfier || pending}
                onClick={() => {
                  const r = responsabilites.find((x) => x.cle === aConfier);
                  setAConfier("");
                  agir(
                    () => confierResponsabilite(aConfier, { userId: choisi.id }),
                    `Responsabilité « ${r?.nom ?? aConfier} » confiée à ${choisi.prenom} ${choisi.nom}.`
                  );
                }}
                className="text-sm bg-fsy text-white rounded-lg px-3 py-1.5 disabled:opacity-50 shrink-0"
              >
                Confier
              </button>
            </div>
          </div>

          {message && (
            <p className="text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg px-3 py-2">
              ✓ {message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
