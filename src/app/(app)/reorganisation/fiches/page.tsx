import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { chargerPlanFichesPapier } from "@/lib/actions";
import { AppliquerFiches } from "@/components/AppliquerFiches";

export const metadata = { title: "Fiches papier" };
export const dynamic = "force-dynamic";

// L'aperçu du plan tiré des fiches papier des conseillers : ce qui sera placé,
// ce qui reste à trancher, ce qui n'a pas été retrouvé. Rien ne s'applique
// depuis cette page sans le bouton — et tout se défait par l'instantané.
export default async function FichesPapierPage() {
  const user = await exigerUtilisateur();
  if (!roleAuMoins(user.role, "COORDINATEUR")) redirect("/accueil");

  const { plan, nbJeunesBase } = await chargerPlanFichesPapier();
  const s = plan.stats;
  const aTrancher = plan.fiches.filter((f) => f.ambigus.length > 0 || f.introuvables.length > 0);
  const conseillersManquants = plan.fiches.filter((f) => !f.conseillerId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📋 Les fiches papier des conseillers</h1>
        <p className="text-slate-500 text-sm">
          {plan.fiches.length} fiches saisies (34 compagnies, filles et garçons), rapprochées de
          la base nom par nom, fautes de saisie comprises. L&apos;aperçu ci-dessous est recalculé
          à chaque visite ; rien n&apos;est encore appliqué.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { valeur: s.places, label: `jeunes placés (sur ${s.noms} noms)` },
          { valeur: s.surs, label: "rapprochements exacts" },
          { valeur: s.probables + s.ambigus, label: "à relire (probables + ambigus)" },
          { valeur: s.introuvables, label: "introuvables en base" },
        ].map((x) => (
          <div key={x.label} className="bg-white rounded-xl shadow-sm p-3">
            <div className="text-2xl font-bold text-fsy">{x.valeur}</div>
            <div className="text-xs text-slate-500">{x.label}</div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="font-bold">Ce que fera l&apos;application</h2>
        <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
          <li>
            34 compagnies, chacune avec son groupe filles (n.1) et son groupe garçons (n.2),
            conseillers des fiches rattachés à leur compte quand il a été retrouvé.
          </li>
          <li>
            Les {s.places} jeunes rapprochés rejoignent leur groupe, <strong>marqués
            présents</strong> — leur conseiller a écrit leur nom sur place.
            {s.reactives > 0 && <> {s.reactives} inscription(s) annulée(s) seront réactivées.</>}
          </li>
          <li>
            Les {Math.max(0, nbJeunesBase - s.places)} autres jeunes de la base passent{" "}
            <strong>« sans groupe »</strong> : chaque conseiller les reprend depuis son
            téléphone (recherche puis réaffectation par la direction, ou « Ajouter un jeune »
            pour un non-inscrit).
          </li>
          <li>
            Les noms introuvables et ambigus ne sont <strong>pas</strong> placés : ils sont
            listés ci-dessous, fiche par fiche, pour être réglés à la main.
          </li>
          <li>La liste C12 garçons n&apos;a pas été remise : le groupe 12.2 restera vide.</li>
          <li>Un instantané est pris avant tout : un geste suffit pour revenir en arrière.</li>
        </ul>
        <AppliquerFiches nbSansFiche={Math.max(0, nbJeunesBase - s.places)} />
      </section>

      {conseillersManquants.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          <h2 className="font-bold">
            Conseillers sans compte retrouvé ({conseillersManquants.length})
          </h2>
          <p className="text-xs mt-0.5 mb-2">
            Leur groupe sera créé sans conseiller rattaché — l&apos;« Ajouter un jeune » de leur
            téléphone ne marchera pas tant que le rattachement n&apos;est pas fait (page Groupes).
          </p>
          <ul className="space-y-0.5">
            {conseillersManquants.map((f) => (
              <li key={`${f.compagnie}-${f.sexe}`}>
                • C{f.compagnie} {f.sexe === "F" ? "filles" : "garçons"} — «{" "}
                {f.conseillerSaisi ?? "non renseigné"} »{f.conseillerMotif && ` : ${f.conseillerMotif}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-2">Fiche par fiche</h2>
        <div className="space-y-2">
          {plan.fiches.map((f) => (
            <details
              key={`${f.compagnie}-${f.sexe}`}
              className={`rounded-lg border p-3 ${
                f.ambigus.length + f.introuvables.length > 0
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-slate-200"
              }`}
            >
              <summary className="cursor-pointer text-sm font-medium">
                Compagnie {f.compagnie} — {f.sexe === "F" ? "filles" : "garçons"}{" "}
                <span className="text-slate-500 font-normal">
                  · {f.conseillerNom ?? `« ${f.conseillerSaisi ?? "?"} » (non rattaché)`} ·{" "}
                  {f.placements.length} placé(s)
                  {f.ambigus.length > 0 && ` · ${f.ambigus.length} ambigu(s)`}
                  {f.introuvables.length > 0 && ` · ${f.introuvables.length} introuvable(s)`}
                </span>
              </summary>
              <div className="mt-2 text-sm space-y-1">
                {f.placements.map((p) => (
                  <div key={p.jeuneId} className={p.sur ? "text-slate-700" : "text-amber-800"}>
                    {p.sur ? "✓" : "≈"} « {p.nomFiche} » → <strong>{p.nomBase}</strong>
                    {p.reactiver && " (inscription réactivée)"}
                  </div>
                ))}
                {f.ambigus.map((a) => (
                  <div key={a.nomFiche} className="text-orange-700">
                    ? « {a.nomFiche} » : {a.candidats.map((c) => c.nom).join(" — ou — ")}
                  </div>
                ))}
                {f.introuvables.map((n) => (
                  <div key={n} className="text-red-700">
                    ✗ « {n} » — introuvable : à ajouter par le conseiller (avec pieu et
                    paroisse), ou à réaffecter à la main
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <p className="text-sm text-slate-500">
        Après application : la page <Link href="/groupes" className="underline">Groupes</Link>{" "}
        montre la nouvelle organisation, l&apos;onglet « Sans groupe » de la page{" "}
        <Link href="/jeunes" className="underline">Jeunes</Link> liste ceux qu&apos;il reste à
        placer, et chaque conseiller complète sa liste depuis son téléphone.
      </p>
    </div>
  );
}
