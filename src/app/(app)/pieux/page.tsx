import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import {
  conseillersAProposer,
  estAccepte,
  LIBELLE_STATUT,
  PROFIL_CONSEILLER,
  verifierAge,
} from "@/lib/criteres";

const fmtDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });

export default async function PieuxPage() {
  const user = (await getUtilisateur())!;
  if (!roleAuMoins(user.role, "ADJOINT")) redirect("/");

  const pieux = await prisma.pieu.findMany({
    orderBy: { nom: "asc" },
    include: {
      jeunes: { select: { sexe: true, statutInscription: true, dateNaissance: true, paroisse: true } },
    },
  });

  const rapports = pieux
    .map((p) => {
      const filles = p.jeunes.filter((j) => j.sexe === "F").length;
      const garcons = p.jeunes.length - filles;
      const statuts = p.jeunes.reduce<Record<string, number>>((acc, j) => {
        acc[j.statutInscription] = (acc[j.statutInscription] ?? 0) + 1;
        return acc;
      }, {});
      const horsCriteres = p.jeunes.filter((j) => !verifierAge(j.dateNaissance).valide).length;
      return {
        nom: p.nom,
        total: p.jeunes.length,
        filles,
        garcons,
        paroisses: new Set(p.jeunes.map((j) => j.paroisse).filter(Boolean)).size,
        acceptes: p.jeunes.filter((j) => estAccepte(j.statutInscription)).length,
        statuts,
        horsCriteres,
        conseilleres: conseillersAProposer(filles),
        conseillers: conseillersAProposer(garcons),
      };
    })
    .sort((a, b) => b.total - a.total);

  const totaux = rapports.reduce(
    (t, r) => ({
      total: t.total + r.total,
      acceptes: t.acceptes + r.acceptes,
      conseilleres: t.conseilleres + r.conseilleres,
      conseillers: t.conseillers + r.conseillers,
      horsCriteres: t.horsCriteres + r.horsCriteres,
    }),
    { total: 0, acceptes: 0, conseilleres: 0, conseillers: 0, horsCriteres: 0 }
  );

  // Détail des participants hors critères d'âge, tous pieux confondus
  const tous = await prisma.jeune.findMany({
    include: { pieu: true },
    orderBy: [{ nom: "asc" }],
  });
  const horsCriteres = tous
    .map((j) => ({ jeune: j, verdict: verifierAge(j.dateNaissance) }))
    .filter((x) => !x.verdict.valide);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🏛️ Pieux et districts</h1>
        <p className="text-sm text-slate-500">
          Effectifs, contrôle des critères d'âge et conseillers à proposer par unité.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Inscrits", valeur: totaux.total },
          { label: "Acceptables en l'état", valeur: totaux.acceptes },
          { label: "Conseillers à proposer", valeur: totaux.conseilleres + totaux.conseillers },
          { label: "Hors critères d'âge", valeur: totaux.horsCriteres },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-fsy">{s.valeur}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
        Le besoin en conseillers est calculé séparément par sexe :{" "}
        <strong>plafond(participants du sexe ÷ 10) + 2</strong>. Ce sont des conseillers à
        proposer par l'unité, pas des conseillers déjà inscrits.
      </p>

      <ul className="space-y-2">
        {rapports.map((r) => (
          <li key={r.nom} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="font-bold">{r.nom}</div>
                <div className="text-sm text-slate-500">
                  {r.total} inscrits · {r.filles} filles · {r.garcons} garçons ·{" "}
                  {r.paroisses} paroisse{r.paroisses > 1 ? "s" : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-fsy">
                  {r.conseilleres + r.conseillers} conseillers
                </div>
                <div className="text-xs text-slate-500">
                  {r.conseilleres} conseillères + {r.conseillers} conseillers
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {Object.entries(r.statuts).map(([statut, n]) => (
                <span
                  key={statut}
                  className={`text-xs rounded-full px-2 py-0.5 ${
                    estAccepte(statut)
                      ? "bg-green-100 text-green-700"
                      : statut.startsWith("En attente")
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {n} {LIBELLE_STATUT[statut] ?? statut}
                </span>
              ))}
              {r.horsCriteres > 0 && (
                <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                  {r.horsCriteres} hors critères d'âge
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Contrôle des critères d'âge */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">Contrôle des critères d'âge</h2>
        <p className="text-sm text-slate-500 mt-1">
          Pour être accepté, un participant doit avoir <strong>au moins 14 ans au
          31 décembre 2026</strong> et <strong>au plus 18 ans au 3 août 2026</strong> (jour et
          mois pris en compte).
        </p>
        {horsCriteres.length === 0 ? (
          <p className="text-sm text-green-700 mt-3">
            Tous les participants respectent les critères d'âge.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {horsCriteres.map(({ jeune, verdict }) => (
              <li key={jeune.id} className="border-l-4 border-red-300 pl-3">
                <div className="font-medium">
                  {jeune.prenom} {jeune.nom}
                </div>
                <div className="text-slate-500">
                  {jeune.dateNaissance
                    ? fmtDate.format(jeune.dateNaissance)
                    : `saisie « ${jeune.dateNaissanceBrute} »`}
                  {verdict.ageConference !== null && ` · ${verdict.ageConference} ans au 03/08`}
                  {" · "}
                  {jeune.paroisse} · {jeune.pieu.nom}
                </div>
                <div className="text-red-700">{"motif" in verdict ? verdict.motif : ""}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Profil attendu des conseillers */}
      <details className="bg-white rounded-xl shadow-sm p-4">
        <summary className="font-bold cursor-pointer">
          Profil et critères des conseillers
        </summary>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-600 list-disc list-inside">
          <li>{PROFIL_CONSEILLER.age}</li>
          <li>Hommes : {PROFIL_CONSEILLER.hommes}</li>
          <li>Femmes : {PROFIL_CONSEILLER.femmes}</li>
          <li>{PROFIL_CONSEILLER.temple}</li>
          <li>{PROFIL_CONSEILLER.formation}</li>
        </ul>
      </details>
    </div>
  );
}
