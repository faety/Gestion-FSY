import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { CALENDRIER, COMITE_LOGISTIQUE, RAPPORT_INCIDENTS, exigencesDuSite } from "@/lib/guide";
import { A_ANNONCER } from "@/lib/report";
import { EncartReport } from "@/components/BandeauReport";
import { Calendrier, Comite, type EtatTache, type Titulaire } from "@/components/Preparation";

export const metadata = { title: "Préparation" };

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

// Ce qu'il faut avoir préparé avant les six jours.
//
// Le manuel de l'encadrant dit ce que chacun fait pendant la conférence ;
// l'application ne portait que cela. Le guide de planification dit ce qui doit
// être prêt avant, et ce que le site doit offrir. La liste chiffrée a servi à
// évaluer le Foyer des Jeunes de Jacqueville ; elle sert encore à vérifier, une
// fois sur place, que ce qui avait été annoncé y est.
export default async function PreparationPage() {
  const user = await exigerUtilisateur();
  if (!roleAuMoins(user.role, "COORDINATEUR")) redirect("/accueil");

  const [jeunes, filles, encadrants, femmes, groupes, compagnies, taches, responsabilites, comptes] =
    await Promise.all([
      prisma.jeune.count(),
      prisma.jeune.count({ where: { sexe: "F" } }),
      prisma.user.count({ where: { valide: true } }),
      prisma.user.count({ where: { valide: true, sexe: "F" } }),
      prisma.groupe.count(),
      prisma.compagnie.count(),
      prisma.tachePreparation.findMany({ include: { faitPar: { select: { prenom: true, nom: true } } } }),
      prisma.responsabilite.findMany(),
      prisma.user.findMany({
        where: { valide: true },
        orderBy: [{ nom: "asc" }, { prenom: "asc" }],
        select: { id: true, prenom: true, nom: true },
      }),
    ]);

  const effectifs = {
    jeunes,
    jeunesFilles: filles,
    jeunesGarcons: jeunes - filles,
    encadrants,
    encadrantsFemmes: femmes,
    encadrantsHommes: encadrants - femmes,
    groupes,
    compagnies,
  };
  const groupesExigences = exigencesDuSite(effectifs);
  const bloquants = groupesExigences.flatMap((g) => g.exigences).filter((e) => e.bloquant).length;

  const etats: Record<string, EtatTache> = Object.fromEntries(
    taches.map((t) => [
      t.cle,
      {
        cle: t.cle,
        faite: t.faite,
        faitPar: t.faitPar ? `${t.faitPar.prenom} ${t.faitPar.nom}` : null,
        faitLe: t.faitLe ? fmt.format(t.faitLe) : null,
        note: t.note,
      },
    ])
  );
  const titulaires: Record<string, Titulaire> = Object.fromEntries(
    responsabilites.map((r) => [
      r.cle,
      { cle: r.cle, nom: r.nom, telephone: r.telephone, userId: r.userId, note: r.note },
    ])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🧭 Préparation</h1>
        <p className="text-slate-500 text-sm">
          Ce que le guide de planification demande d&apos;avoir prêt avant les six jours, et ce
          que le site doit offrir. Les chiffres sont calculés sur les effectifs réels.
        </p>
      </div>

      {A_ANNONCER && (
        <EncartReport precision="Les exigences ci-dessous ont servi à retenir le site ; vérifiez-les une dernière fois sur place, avant l'arrivée des jeunes." />
      )}

      {/* ---------- Ce que le site doit offrir ---------- */}
      <section className="space-y-3">
        <div>
          <h2 className="font-bold">Ce que le site doit offrir</h2>
          <p className="text-sm text-slate-500">
            Les exigences du guide, chiffrées sur {effectifs.jeunes} jeunes et{" "}
            {effectifs.encadrants} encadrants. À emporter en visite : un gestionnaire de site
            sait répondre à « combien de douches ? », pas à « assez de douches ? ».{" "}
            <strong>{bloquants} sont bloquantes</strong> — sans elles la conférence ne peut pas
            s&apos;y tenir.
          </p>
        </div>

        {groupesExigences.map((g) => (
          <div key={g.groupe} className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-medium text-sm mb-2">{g.groupe}</h3>
            <ul className="divide-y divide-slate-100">
              {g.exigences.map((e) => (
                <li key={e.cle} className="py-2 flex justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm">
                      {e.bloquant && <span className="text-red-600" title="Bloquant">● </span>}
                      {e.intitule}
                    </div>
                    <div className="text-xs text-slate-500">{e.detail}</div>
                  </div>
                  {e.besoin && (
                    <div className="text-sm font-bold text-fsy whitespace-nowrap">{e.besoin}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ---------- Calendrier ---------- */}
      <Calendrier jalons={CALENDRIER} etats={etats} />

      {/* ---------- Comité logistique ---------- */}
      <Comite
        roles={COMITE_LOGISTIQUE}
        titulaires={titulaires}
        encadrants={comptes.map((c) => ({ id: c.id, nom: `${c.prenom} ${c.nom}` }))}
      />

      {/* ---------- Signalement des incidents ---------- */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">Signaler un incident</h2>
        <p className="text-sm text-slate-500 mt-1">
          Le Rapport mondial des incidents a une entrée propre aux conférences FSY — l&apos;adresse
          n&apos;est pas celle des autres activités de l&apos;Église.
        </p>
        <p className="text-sm mt-2">
          <a
            href={RAPPORT_INCIDENTS.lien}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fsy underline break-all font-medium"
          >
            {RAPPORT_INCIDENTS.lien}
          </a>
        </p>
        <p className="text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2">
          {RAPPORT_INCIDENTS.regle}
        </p>
        <ul className="text-sm text-slate-700 mt-2 space-y-1">
          {RAPPORT_INCIDENTS.cas.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 mt-2">{RAPPORT_INCIDENTS.note}</p>
      </section>
    </div>
  );
}
