import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { peutModifierDirectement, roleAuMoins } from "@/lib/roles";
import { Programme } from "@/components/Programme";

export default async function ProgrammePage() {
  const user = (await getUtilisateur())!;

  const [activites, propositions, compagnies, groupes] = await Promise.all([
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
  ]);

  return (
    <Programme
      role={user.role}
      peutCreer={roleAuMoins(user.role, "COORDINATEUR")}
      peutModifierDirect={peutModifierDirectement(user)}
      peutProposer={user.role === "ADJOINT"}
      peutValider={roleAuMoins(user.role, "COORDINATEUR")}
      activites={activites.map((a) => ({
        id: a.id,
        titre: a.titre,
        description: a.description,
        debut: a.debut.toISOString(),
        lieu: a.lieu,
        type: a.type,
        statut: a.statut,
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
  );
}
