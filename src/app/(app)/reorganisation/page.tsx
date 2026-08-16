import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { STATUT_ANNULE } from "@/lib/criteres";
import { taillesProposees } from "@/lib/reorganisation";
import { AssistantReorganisation } from "@/components/AssistantReorganisation";

export const metadata = { title: "Réorganisation du jour 1" };

// Le jour 1, la réalité ne colle pas au plan : moins de jeunes, des
// encadrants absents. Cette page permet de constater qui est là, puis de
// recomposer groupes et compagnies — automatiquement, stabilité d'abord,
// avec retour en arrière possible. Couple et coordinateurs principaux.
export default async function ReorganisationPage() {
  const user = await exigerUtilisateur();
  if (!roleAuMoins(user.role, "COORDINATEUR")) redirect("/accueil");

  const [jeunes, arrives, groupes, encadrants, compagnies, instantanes] = await Promise.all([
    prisma.jeune.findMany({
      where: { statutInscription: { not: STATUT_ANNULE } },
      select: { id: true, prenom: true, nom: true, sexe: true, groupeId: true, presenceManuelle: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.mouvement.findMany({
      where: { type: "ARRIVEE" },
      select: { jeuneId: true },
      distinct: ["jeuneId"],
    }),
    prisma.groupe.findMany({
      select: {
        id: true,
        nom: true,
        sexe: true,
        conseillerId: true,
        conseiller: { select: { prenom: true, nom: true, actif: true } },
        _count: { select: { jeunes: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["CONSEILLER", "ADJOINT"] }, valide: true },
      select: { id: true, prenom: true, nom: true, sexe: true, role: true, actif: true },
      orderBy: [{ role: "asc" }, { nom: "asc" }],
    }),
    prisma.compagnie.findMany({ select: { id: true, nom: true, numero: true } }),
    prisma.instantaneOrganisation.findMany({
      orderBy: { creeLe: "desc" },
      take: 5,
      select: { id: true, motif: true, creeLe: true },
    }),
  ]);

  const pointes = new Set(arrives.map((a) => a.jeuneId));
  const jeunesPresents = jeunes.filter((j) => pointes.has(j.id) || j.presenceManuelle);
  const conseillersPresents = encadrants.filter((e) => e.role === "CONSEILLER" && e.actif);
  const adjointsPresents = encadrants.filter((e) => e.role === "ADJOINT" && e.actif);

  const proposes = taillesProposees({
    jeunesPresents: jeunesPresents.map((j) => ({ id: j.id, sexe: j.sexe, groupeId: j.groupeId })),
    groupes: groupes.map((g) => ({
      id: g.id,
      nom: g.nom,
      sexe: g.sexe,
      conseillerId: g.conseillerId,
      compagnieId: null,
    })),
    conseillersPresents: conseillersPresents.map((c) => ({
      id: c.id,
      nom: `${c.prenom} ${c.nom}`,
      sexe: c.sexe,
    })),
    adjointsPresents: [],
    compagnies,
  });

  const orphelins = groupes.filter(
    (g) => g._count.jeunes > 0 && (!g.conseiller || !g.conseiller.actif)
  );

  return (
    <AssistantReorganisation
      resume={{
        inscrits: jeunes.length,
        presents: jeunesPresents.length,
        pointes: jeunes.filter((j) => pointes.has(j.id)).length,
        manuels: jeunes.filter((j) => j.presenceManuelle && !pointes.has(j.id)).length,
        presentesF: jeunesPresents.filter((j) => j.sexe === "F").length,
        presentsM: jeunesPresents.filter((j) => j.sexe === "M").length,
        conseilleresF: conseillersPresents.filter((c) => c.sexe === "F").length,
        conseillersM: conseillersPresents.filter((c) => c.sexe === "M").length,
        adjoints: adjointsPresents.length,
        groupesOrphelins: orphelins.map((g) => `${g.nom} (${g._count.jeunes})`),
      }}
      encadrants={encadrants.map((e) => ({
        id: e.id,
        nom: `${e.prenom} ${e.nom}`,
        role: e.role,
        sexe: e.sexe,
        actif: e.actif,
      }))}
      jeunes={jeunes.map((j) => ({
        id: j.id,
        nom: `${j.prenom} ${j.nom}`,
        sexe: j.sexe,
        pointe: pointes.has(j.id),
        manuel: j.presenceManuelle,
      }))}
      proposes={proposes}
      instantanes={instantanes.map((i) => ({
        id: i.id,
        motif: i.motif,
        date: i.creeLe.toISOString(),
      }))}
    />
  );
}
