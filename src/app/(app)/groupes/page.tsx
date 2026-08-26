import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { GestionGroupes } from "@/components/GestionGroupes";

export default async function GroupesPage() {
  const user = await exigerUtilisateur();

  const [groupes, conseillers] = await Promise.all([
    prisma.groupe.findMany({
      // Les coquilles vides — lignes de l'ancienne organisation, vidées par la
      // réorganisation — n'apparaissent pas : elles ne racontent rien.
      where: {
        OR: [
          { compagnieId: { not: null } },
          { conseillerId: { not: null } },
          { jeunes: { some: {} } },
        ],
      },
      orderBy: [{ compagnie: { numero: "asc" } }, { numeroDansCompagnie: "asc" }, { nom: "asc" }],
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
    <div className="space-y-4">
      {roleAuMoins(user.role, "COORDINATEUR") && (
        <a
          href="/reorganisation"
          className="block bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-fsy-dark hover:bg-blue-100 transition"
        >
          🧩 Le jour 1, les effectifs réels ne collent plus ?{" "}
          <span className="font-semibold underline">Réorganiser automatiquement</span> — les
          jeunes gardent leur conseiller quand c&apos;est possible, et tout peut se défaire.
        </a>
      )}
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
    </div>
  );
}
