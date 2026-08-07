import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { peutModifierDirectement, roleAuMoins } from "@/lib/roles";
import { Programme } from "@/components/Programme";
import { ResynchroniserProgramme } from "@/components/ResynchroniserProgramme";
import { A_ANNONCER } from "@/lib/report";
import { EncartReport } from "@/components/BandeauReport";

export default async function ProgrammePage() {
  const user = await exigerUtilisateur();

  const [activites, propositions, compagnies, groupes, journees] = await Promise.all([
    prisma.activite.findMany({
      orderBy: { debut: "asc" },
      include: { groupes: { include: { groupe: true } }, compagnie: true },
    }),
    roleAuMoins(user.role, "ADJOINT")
      ? prisma.modificationProgramme.findMany({
          where: { statut: "PROPOSE" },
          orderBy: { createdAt: "asc" },
          include: { activite: true, proposePar: true },
        })
      : [],
    prisma.compagnie.findMany({ orderBy: { nom: "asc" } }),
    prisma.groupe.findMany({ orderBy: { nom: "asc" } }),
    prisma.journeeConference.findMany({ orderBy: { numero: "asc" } }),
  ]);

  return (
    <div className="space-y-3">
      {A_ANNONCER && (
        <EncartReport precision="Le programme court du dimanche 23 — arrivée des encadrants — au samedi 29. Les horaires sont ceux des manuels, décalés de trois semaines : les jours de la semaine sont inchangés, donc tout tient tel quel." />
      )}
    <Programme
      peutCreer={roleAuMoins(user.role, "COORDINATEUR")}
      peutModifierDirect={peutModifierDirectement(user)}
      peutProposer={user.role === "ADJOINT"}
      peutValider={roleAuMoins(user.role, "COORDINATEUR")}
      mesGroupes={user.groupesDiriges.map((g) => ({
        id: g.id,
        sexe: g.sexe,
        compagnieId: g.compagnieId,
      }))}
      role={user.role}
      journees={journees.map((j) => ({
        numero: j.numero,
        date: j.date.toISOString(),
        tenue: j.tenue,
        tenueEncadrants: j.tenueEncadrants,
        note: j.note,
      }))}
      activites={activites.map((a) => ({
        id: a.id,
        titre: a.titre,
        description: a.description,
        debut: a.debut.toISOString(),
        fin: a.fin?.toISOString() ?? null,
        lieu: a.lieu,
        type: a.type,
        statut: a.statut,
        publicCible: a.publicCible,
        pourEncadrants: a.pourEncadrants,
        roleConseiller: a.roleConseiller,
        roleAdjoint: a.roleAdjoint,
        roleCoordinateur: a.roleCoordinateur,
        roleDirigeant: a.roleDirigeant,
        compagnieId: a.compagnieId,
        groupeIds: a.groupes.map((g) => g.groupeId),
        cibles: [
          ...(a.compagnie ? [a.compagnie.nom] : []),
          ...a.groupes.map((g) => g.groupe.nom),
        ],
      }))}
      propositions={propositions.map((p) => ({
        id: p.id,
        activiteTitre: p.activite.titre,
        proposePar: `${p.proposePar.prenom} ${p.proposePar.nom}`,
        nouveauTitre: p.nouveauTitre,
        nouveauDebut: p.nouveauDebut?.toISOString() ?? null,
        nouveauLieu: p.nouveauLieu,
        nouveauStatut: p.nouveauStatut,
        motif: p.motif,
      }))}
      compagnies={compagnies.map((c) => ({ id: c.id, nom: c.nom }))}
      groupes={groupes.map((g) => ({ id: g.id, nom: g.nom }))}
    />
      {roleAuMoins(user.role, "COORDINATEUR") && (
        <div className="pt-1">
          <ResynchroniserProgramme />
        </div>
      )}
    </div>
  );
}
