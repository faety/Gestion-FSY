import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { verifierAge } from "@/lib/criteres";
import { RechercheJeunes } from "@/components/RechercheJeunes";

export default async function JeunesPage() {
  const user = await exigerUtilisateur();

  // Portée selon le rôle : conseiller → son groupe ; adjoint → sa compagnie ;
  // coordinateur/dirigeant → tout le monde
  let where = {};
  let portee = "Tous les jeunes";
  if (user.role === "CONSEILLER") {
    where = { groupeId: { in: user.groupesDiriges.map((g) => g.id) } };
    portee = "Les jeunes de votre groupe";
  } else if (user.role === "ADJOINT" && user.compagnieId) {
    where = { groupe: { compagnieId: user.compagnieId } };
    portee = `Les jeunes de votre compagnie (${user.compagnie?.nom})`;
  }

  const jeunes = await prisma.jeune.findMany({
    where,
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: { pieu: true, groupe: true },
  });

  const groupes = roleAuMoins(user.role, "COORDINATEUR")
    ? await prisma.groupe.findMany({ orderBy: { nom: "asc" } })
    : [];

  return (
    <RechercheJeunes
      portee={portee}
      peutReassigner={roleAuMoins(user.role, "COORDINATEUR")}
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
  );
}
