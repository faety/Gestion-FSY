import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { ValidationCar } from "@/components/ValidationCar";

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getUtilisateur())!;

  const car = await prisma.car.findUnique({
    where: { id },
    include: {
      pieu: {
        include: {
          jeunes: { orderBy: [{ nom: "asc" }, { prenom: "asc" }], include: { groupe: true } },
        },
      },
      responsable: true,
      mouvements: {
        orderBy: { horodatage: "desc" },
        include: { jeune: true, validePar: true },
      },
    },
  });
  if (!car) notFound();

  // Dernier statut de chaque jeune pour ce car
  const dernierStatut = new Map<string, string>();
  for (const m of [...car.mouvements].sort(
    (a, b) => a.horodatage.getTime() - b.horodatage.getTime()
  )) {
    dernierStatut.set(m.jeuneId, m.type);
  }

  const peutValider =
    roleAuMoins(user.role, "COORDINATEUR") ||
    user.role === "CONSEILLER" ||
    user.role === "ADJOINT";
  const voitHistorique = roleAuMoins(user.role, "ADJOINT");

  return (
    <ValidationCar
      car={{
        id: car.id,
        nom: car.nom,
        capacite: car.capacite,
        responsable: car.responsable
          ? `${car.responsable.prenom} ${car.responsable.nom}`
          : null,
      }}
      jeunes={car.pieu.jeunes.map((j) => ({
        id: j.id,
        nom: j.nom,
        prenom: j.prenom,
        sexe: j.sexe,
        groupe: j.groupe?.nom ?? null,
        statut: dernierStatut.get(j.id) ?? null,
      }))}
      historique={
        voitHistorique
          ? car.mouvements.slice(0, 50).map((m) => ({
              id: m.id,
              type: m.type,
              jeune: `${m.jeune.prenom} ${m.jeune.nom}`,
              par: `${m.validePar.prenom} ${m.validePar.nom}`,
              heure: m.horodatage.toISOString(),
            }))
          : null
      }
      peutValider={peutValider}
    />
  );
}
