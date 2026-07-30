import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { ETAPES_CAR } from "@/lib/etapes-car";
import { ValidationCar } from "@/components/ValidationCar";

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getUtilisateur())!;

  const car = await prisma.car.findUnique({
    where: { id },
    include: {
      pieu: {
        include: {
          jeunes: {
            where: { statutInscription: { not: "Annulé(e)" } },
            orderBy: [{ nom: "asc" }, { prenom: "asc" }],
            include: { groupe: true },
          },
        },
      },
      affectations: { include: { user: true } },
      mouvements: {
        orderBy: { horodatage: "desc" },
        include: { jeune: true, validePar: true },
      },
    },
  });
  if (!car) notFound();

  // Pour chaque jeune : les étapes déjà validées, et la dernière en date.
  // On garde les étapes séparément : un jeune arrivé sur le site reste coché
  // « Départ du pieu », sinon on ne saurait plus qui a été oublié à la montée.
  const etapesValidees = new Map<string, string[]>();
  const dernierStatut = new Map<string, string>();
  for (const m of [...car.mouvements].sort(
    (a, b) => a.horodatage.getTime() - b.horodatage.getTime()
  )) {
    dernierStatut.set(m.jeuneId, m.type);
    const deja = etapesValidees.get(m.jeuneId) ?? [];
    if (!deja.includes(m.type)) etapesValidees.set(m.jeuneId, [...deja, m.type]);
  }

  const peutAffecter = roleAuMoins(user.role, "COORDINATEUR");

  // Personnes affectables au pointage : conseillers, adjoints et coordinateurs
  const encadrants = peutAffecter
    ? await prisma.user.findMany({
        where: { actif: true },
        orderBy: [{ role: "asc" }, { nom: "asc" }],
        select: { id: true, prenom: true, nom: true, role: true, sexe: true },
      })
    : [];

  // Droit de cocher, étape par étape : les personnes affectées, et toujours les
  // coordinateurs principaux et le couple dirigeant.
  const droits = Object.fromEntries(
    ETAPES_CAR.map((e) => {
      const pointeurs = car.affectations.filter((a) => a.etape === e.cle);
      return [
        e.cle,
        peutAffecter || pointeurs.length === 0 || pointeurs.some((a) => a.userId === user.id),
      ];
    })
  );

  return (
    <ValidationCar
      car={{ id: car.id, nom: car.nom, capacite: car.capacite, pieu: car.pieu.nom }}
      affectations={car.affectations.map((a) => ({
        etape: a.etape,
        userId: a.userId,
        nom: `${a.user.prenom} ${a.user.nom}`,
        role: a.user.role,
      }))}
      encadrants={encadrants.map((e) => ({
        id: e.id,
        nom: `${e.prenom} ${e.nom}`,
        role: e.role,
        sexe: e.sexe,
      }))}
      droits={droits}
      peutAffecter={peutAffecter}
      monId={user.id}
      jeunes={car.pieu.jeunes.map((j) => ({
        id: j.id,
        nom: j.nom,
        prenom: j.prenom,
        sexe: j.sexe,
        groupe: j.groupe?.nom ?? null,
        statut: dernierStatut.get(j.id) ?? null,
        etapes: etapesValidees.get(j.id) ?? [],
        medical: j.medical,
        alimentaire: j.alimentaire,
      }))}
      historique={
        roleAuMoins(user.role, "ADJOINT")
          ? car.mouvements.slice(0, 60).map((m) => ({
              id: m.id,
              type: m.type,
              jeune: `${m.jeune.prenom} ${m.jeune.nom}`,
              par: `${m.validePar.prenom} ${m.validePar.nom}`,
              heure: m.horodatage.toISOString(),
            }))
          : null
      }
    />
  );
}
