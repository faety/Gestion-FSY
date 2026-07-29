import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { GestionGroupes } from "@/components/GestionGroupes";

export default async function GroupesPage() {
  const user = (await getUtilisateur())!;

  const [groupes, conseillers] = await Promise.all([
    prisma.groupe.findMany({
      orderBy: { nom: "asc" },
      include: {
        conseiller: true,
        compagnie: true,
        _count: { select: { jeunes: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "CONSEILLER" },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <GestionGroupes
      peutModifier={roleAuMoins(user.role, "COORDINATEUR")}
      groupes={groupes.map((g) => ({
        id: g.id,
        nom: g.nom,
        sexe: g.sexe,
        compagnie: g.compagnie?.nom ?? null,
        nbJeunes: g._count.jeunes,
        capaciteMax: g.capaciteMax,
        conseillerId: g.conseillerId,
        conseiller: g.conseiller ? `${g.conseiller.prenom} ${g.conseiller.nom}` : null,
        conseillerActif: g.conseiller?.actif ?? false,
      }))}
      conseillers={conseillers.map((c) => ({
        id: c.id,
        nom: `${c.prenom} ${c.nom}`,
        sexe: c.sexe,
        actif: c.actif,
      }))}
    />
  );
}
