import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { verifierAge } from "@/lib/criteres";
import { porteeJeunes } from "@/lib/portee";
import { RechercheJeunes } from "@/components/RechercheJeunes";
import { AjoutJeuneSurPlace } from "@/components/AjoutJeuneSurPlace";

export default async function JeunesPage() {
  const user = await exigerUtilisateur();

  // Portée fermée par défaut : voir src/lib/portee.ts.
  const { where, libelle: portee } = porteeJeunes(user);

  // L'appel — marquer présent/absent — appartient au conseiller, sur son
  // groupe. La direction corrige partout ; l'aperçu, lui, regarde sans agir.
  const conseilleAvecGroupe = user.role === "CONSEILLER" && user.groupesDiriges.length > 0;
  const peutAppeler =
    !user.apercu && (conseilleAvecGroupe || roleAuMoins(user.role, "COORDINATEUR"));

  const [jeunes, arrives] = await Promise.all([
    prisma.jeune.findMany({
      where,
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      include: { pieu: true, groupe: true },
    }),
    // Qui a été pointé à la montée d'un car : l'avertissement au moment de
    // barrer un enfant pourtant pointé. Identifiants seuls, rien de plus.
    peutAppeler
      ? prisma.mouvement.findMany({
          where: { type: "ARRIVEE" },
          select: { jeuneId: true },
          distinct: ["jeuneId"],
        })
      : [],
  ]);
  const pointes = new Set(arrives.map((a) => a.jeuneId));

  const groupes = roleAuMoins(user.role, "COORDINATEUR")
    ? await prisma.groupe.findMany({ orderBy: { nom: "asc" } })
    : [];

  // Le formulaire d'ajout du conseiller : pieux, et paroisses connues de
  // chaque pieu d'après les inscrits — plus « Autre… » en saisie libre.
  let ajout: {
    pieux: { id: string; nom: string }[];
    paroissesParPieu: Record<string, string[]>;
    groupes: { id: string; nom: string; sexe: string }[];
  } | null = null;
  if (conseilleAvecGroupe && !user.apercu) {
    const [pieux, paroisses] = await Promise.all([
      prisma.pieu.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
      prisma.jeune.groupBy({ by: ["pieuId", "paroisse"], where: { paroisse: { not: null } } }),
    ]);
    const paroissesParPieu: Record<string, string[]> = {};
    for (const p of paroisses) {
      if (!p.paroisse) continue;
      (paroissesParPieu[p.pieuId] ??= []).push(p.paroisse);
    }
    for (const cle of Object.keys(paroissesParPieu)) {
      paroissesParPieu[cle].sort((a, b) => a.localeCompare(b, "fr"));
    }
    ajout = {
      pieux,
      paroissesParPieu,
      groupes: user.groupesDiriges.map((g) => ({ id: g.id, nom: g.nom, sexe: g.sexe })),
    };
  }

  return (
    <div className="space-y-4">
      {ajout && (
        <AjoutJeuneSurPlace
          pieux={ajout.pieux}
          paroissesParPieu={ajout.paroissesParPieu}
          groupes={ajout.groupes}
        />
      )}
      <RechercheJeunes
        portee={portee}
        peutReassigner={roleAuMoins(user.role, "COORDINATEUR") && !user.apercu}
        peutAppeler={peutAppeler}
        groupes={groupes.map((g) => ({ id: g.id, nom: g.nom, sexe: g.sexe }))}
        jeunes={jeunes.map((j) => ({
          id: j.id,
          nom: j.nom,
          prenom: j.prenom,
          sexe: j.sexe,
          pieu: j.pieu.nom,
          paroisse: j.paroisse,
          groupeId: j.groupeId,
          groupe: j.groupe?.nom ?? null,
          dateNaissance: j.dateNaissance?.toISOString() ?? null,
          dateNaissanceBrute: j.dateNaissanceBrute,
          tailleTshirt: j.tailleTshirt,
          statutInscription: j.statutInscription,
          presenceManuelle: j.presenceManuelle,
          absenceConstatee: j.absenceConstatee,
          ajouteSurPlace: j.ajouteSurPlace,
          pointeCar: pointes.has(j.id),
          // Contrôle des critères d'âge officiels
          motifHorsCriteres: (() => {
            const v = verifierAge(j.dateNaissance);
            return v.valide ? null : v.motif;
          })(),
          ageConference: verifierAge(j.dateNaissance).ageConference,
          // Informations sensibles : la requête ci-dessus limite déjà la liste à la
          // portée de l'utilisateur (son groupe, sa compagnie, ou tous), ces
          // informations ne sortent donc pas de son périmètre de responsabilité.
          medical: j.medical,
          alimentaire: j.alimentaire,
          contactNom: j.contactNom,
          contactTelephone: j.contactTelephone,
        }))}
      />
    </div>
  );
}
