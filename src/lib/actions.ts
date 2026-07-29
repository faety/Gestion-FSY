"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { creerSession, detruireSession, getUtilisateur } from "./auth";
import { journaliser } from "./audit";
import { peutModifierDirectement, roleAuMoins } from "./roles";

async function exiger(minimum: "DIRIGEANT" | "COORDINATEUR" | "ADJOINT" | "CONSEILLER") {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  if (!roleAuMoins(user.role, minimum)) {
    throw new Error("Vous n'avez pas la permission d'effectuer cette action.");
  }
  return user;
}

// ---------- Authentification ----------

export async function seConnecter(
  _prev: { erreur?: string } | undefined,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.actif || !(await bcrypt.compare(motDePasse, user.passwordHash))) {
    return { erreur: "Email ou mot de passe incorrect." };
  }
  await creerSession(user.id);
  await journaliser(user.id, "CONNEXION");
  redirect("/");
}

export async function seDeconnecter() {
  await detruireSession();
  redirect("/login");
}

// ---------- Arrivées / départs (cars) ----------

export async function validerMouvement(jeuneId: string, carId: string, type: string) {
  const user = await exiger("CONSEILLER");
  if (!["MONTEE", "ARRIVEE", "DEPART"].includes(type)) throw new Error("Type invalide");
  const jeune = await prisma.jeune.findUniqueOrThrow({ where: { id: jeuneId } });
  await prisma.mouvement.create({
    data: { type, jeuneId, carId, valideParId: user.id },
  });
  await journaliser(
    user.id,
    `MOUVEMENT_${type}`,
    `${jeune.prenom} ${jeune.nom} (car ${carId})`
  );
  revalidatePath(`/cars/${carId}`);
  revalidatePath("/cars");
}

export async function annulerDernierMouvement(jeuneId: string, carId: string, type: string) {
  const user = await exiger("CONSEILLER");
  const dernier = await prisma.mouvement.findFirst({
    where: { jeuneId, carId, type },
    orderBy: { horodatage: "desc" },
  });
  if (dernier) {
    await prisma.mouvement.delete({ where: { id: dernier.id } });
    await journaliser(user.id, "MOUVEMENT_ANNULE", `${type} jeune ${jeuneId}`);
  }
  revalidatePath(`/cars/${carId}`);
  revalidatePath("/cars");
}

// ---------- Réassignation dynamique ----------

export async function deplacerJeune(jeuneId: string, nouveauGroupeId: string | null) {
  const user = await exiger("COORDINATEUR");
  const jeune = await prisma.jeune.findUniqueOrThrow({ where: { id: jeuneId } });
  if (nouveauGroupeId) {
    const groupe = await prisma.groupe.findUniqueOrThrow({
      where: { id: nouveauGroupeId },
      include: { _count: { select: { jeunes: true } } },
    });
    if (groupe.sexe !== jeune.sexe) {
      throw new Error("Le groupe doit être du même sexe que le jeune.");
    }
  }
  await prisma.jeune.update({ where: { id: jeuneId }, data: { groupeId: nouveauGroupeId } });
  await journaliser(
    user.id,
    "REASSIGNATION_JEUNE",
    `${jeune.prenom} ${jeune.nom} → groupe ${nouveauGroupeId ?? "aucun"}`
  );
  revalidatePath("/groupes");
  revalidatePath("/jeunes");
}

export async function reassignerConseiller(groupeId: string, conseillerId: string | null) {
  const user = await exiger("COORDINATEUR");
  const groupe = await prisma.groupe.findUniqueOrThrow({ where: { id: groupeId } });
  if (conseillerId) {
    const conseiller = await prisma.user.findUniqueOrThrow({ where: { id: conseillerId } });
    if (conseiller.sexe !== groupe.sexe) {
      throw new Error("Le conseiller doit être du même sexe que le groupe.");
    }
  }
  await prisma.groupe.update({ where: { id: groupeId }, data: { conseillerId } });
  await journaliser(user.id, "REASSIGNATION_CONSEILLER", `groupe ${groupe.nom} → ${conseillerId ?? "aucun"}`);
  revalidatePath("/groupes");
  revalidatePath("/organigramme");
}

export async function fusionnerGroupes(sourceId: string, cibleId: string) {
  const user = await exiger("COORDINATEUR");
  const [source, cible] = await Promise.all([
    prisma.groupe.findUniqueOrThrow({ where: { id: sourceId } }),
    prisma.groupe.findUniqueOrThrow({ where: { id: cibleId } }),
  ]);
  if (source.sexe !== cible.sexe) throw new Error("Les deux groupes doivent être du même sexe.");
  await prisma.jeune.updateMany({ where: { groupeId: sourceId }, data: { groupeId: cibleId } });
  await prisma.groupe.delete({ where: { id: sourceId } });
  await journaliser(user.id, "FUSION_GROUPES", `${source.nom} → ${cible.nom}`);
  revalidatePath("/groupes");
}

// ---------- Programme ----------

export async function creerActivite(formData: FormData) {
  const user = await exiger("COORDINATEUR");
  const titre = String(formData.get("titre") ?? "").trim();
  const debut = new Date(String(formData.get("debut")));
  if (!titre || isNaN(debut.getTime())) throw new Error("Titre et date requis.");
  const type = String(formData.get("type") ?? "GENERAL");
  const compagnieId = String(formData.get("compagnieId") ?? "") || null;
  const groupeIds = formData.getAll("groupeIds").map(String).filter(Boolean);
  const activite = await prisma.activite.create({
    data: {
      titre,
      description: String(formData.get("description") ?? "") || null,
      lieu: String(formData.get("lieu") ?? "") || null,
      debut,
      type,
      compagnieId: type === "COMPAGNIE" ? compagnieId : null,
      creeParId: user.id,
      groupes:
        type === "GROUPE" || type === "MULTI_GROUPE"
          ? { create: groupeIds.map((groupeId) => ({ groupeId })) }
          : undefined,
    },
  });
  await journaliser(user.id, "ACTIVITE_CREEE", activite.titre);
  revalidatePath("/programme");
}

export async function modifierActivite(activiteId: string, formData: FormData) {
  const user = await exiger("CONSEILLER");
  const activite = await prisma.activite.findUniqueOrThrow({ where: { id: activiteId } });

  const nouveauTitre = String(formData.get("titre") ?? "").trim() || null;
  const debutStr = String(formData.get("debut") ?? "");
  const nouveauDebut = debutStr ? new Date(debutStr) : null;
  const nouveauLieu = String(formData.get("lieu") ?? "").trim() || null;
  const annuler = formData.get("annuler") === "on";
  const motif = String(formData.get("motif") ?? "").trim() || null;

  if (peutModifierDirectement(user)) {
    // Modification directe (coordinateurs principaux, couple dirigeant,
    // ou adjoint ayant reçu le droit)
    await prisma.activite.update({
      where: { id: activiteId },
      data: {
        titre: nouveauTitre ?? activite.titre,
        debut: nouveauDebut ?? activite.debut,
        lieu: nouveauLieu ?? activite.lieu,
        statut: annuler ? "ANNULE" : "MODIFIE",
      },
    });
    await journaliser(user.id, "ACTIVITE_MODIFIEE", `${activite.titre}${annuler ? " (annulée)" : ""}`);
  } else if (user.role === "ADJOINT") {
    // Proposition soumise à validation
    await prisma.modificationProgramme.create({
      data: {
        activiteId,
        nouveauTitre,
        nouveauDebut,
        nouveauLieu,
        nouveauStatut: annuler ? "ANNULE" : null,
        motif,
        proposeParId: user.id,
      },
    });
    await journaliser(user.id, "MODIFICATION_PROPOSEE", activite.titre);
  } else {
    throw new Error("Les conseillers ne peuvent pas modifier le programme.");
  }
  revalidatePath("/programme");
}

export async function deciderModification(modifId: string, decision: "VALIDE" | "REJETE") {
  const user = await exiger("COORDINATEUR");
  const modif = await prisma.modificationProgramme.findUniqueOrThrow({
    where: { id: modifId },
    include: { activite: true },
  });
  if (modif.statut !== "PROPOSE") throw new Error("Cette proposition a déjà été traitée.");
  await prisma.modificationProgramme.update({
    where: { id: modifId },
    data: { statut: decision, valideParId: user.id, decideAt: new Date() },
  });
  if (decision === "VALIDE") {
    await prisma.activite.update({
      where: { id: modif.activiteId },
      data: {
        titre: modif.nouveauTitre ?? modif.activite.titre,
        debut: modif.nouveauDebut ?? modif.activite.debut,
        lieu: modif.nouveauLieu ?? modif.activite.lieu,
        statut: modif.nouveauStatut ?? "MODIFIE",
      },
    });
  }
  await journaliser(user.id, `MODIFICATION_${decision}`, modif.activite.titre);
  revalidatePath("/programme");
}

// ---------- Annonces ----------

export async function creerAnnonce(formData: FormData) {
  const user = await exiger("COORDINATEUR");
  const titre = String(formData.get("titre") ?? "").trim();
  const contenu = String(formData.get("contenu") ?? "").trim();
  const cible = String(formData.get("cible") ?? "TOUS");
  if (!titre || !contenu) throw new Error("Titre et contenu requis.");
  await prisma.annonce.create({ data: { titre, contenu, cible, creeParId: user.id } });
  await journaliser(user.id, "ANNONCE_CREEE", `${titre} (cible: ${cible})`);
  revalidatePath("/annonces");
  revalidatePath("/");
}

export async function supprimerAnnonce(annonceId: string) {
  const user = await exiger("COORDINATEUR");
  await prisma.annonce.delete({ where: { id: annonceId } });
  await journaliser(user.id, "ANNONCE_SUPPRIMEE", annonceId);
  revalidatePath("/annonces");
  revalidatePath("/");
}

// ---------- Administration (couple dirigeant) ----------

export async function creerUtilisateur(formData: FormData) {
  const user = await exiger("COORDINATEUR");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const nom = String(formData.get("nom") ?? "").trim();
  const prenom = String(formData.get("prenom") ?? "").trim();
  const role = String(formData.get("role") ?? "CONSEILLER");
  const sexe = String(formData.get("sexe") ?? "M");
  if (!email || motDePasse.length < 6 || !nom || !prenom) {
    throw new Error("Champs invalides (mot de passe : 6 caractères minimum).");
  }
  if (role === "DIRIGEANT" && user.role !== "DIRIGEANT") {
    throw new Error("Seul le couple dirigeant peut créer un compte dirigeant.");
  }
  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(motDePasse, 10),
      nom,
      prenom,
      role,
      sexe,
      compagnieId: String(formData.get("compagnieId") ?? "") || null,
    },
  });
  await journaliser(user.id, "UTILISATEUR_CREE", `${prenom} ${nom} (${role})`);
  revalidatePath("/admin");
}

export async function basculerDroitModification(userId: string) {
  const user = await exiger("DIRIGEANT");
  const cible = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let droits: string[] = [];
  try {
    droits = JSON.parse(cible.droitsSupplementaires);
  } catch {}
  const aLeDroit = droits.includes("MODIFICATION_DIRECTE");
  droits = aLeDroit
    ? droits.filter((d) => d !== "MODIFICATION_DIRECTE")
    : [...droits, "MODIFICATION_DIRECTE"];
  await prisma.user.update({
    where: { id: userId },
    data: { droitsSupplementaires: JSON.stringify(droits) },
  });
  await journaliser(
    user.id,
    aLeDroit ? "DROIT_RETIRE" : "DROIT_ACCORDE",
    `MODIFICATION_DIRECTE pour ${cible.prenom} ${cible.nom}`
  );
  revalidatePath("/admin");
}

export async function basculerActif(userId: string) {
  const user = await exiger("DIRIGEANT");
  const cible = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.user.update({ where: { id: userId }, data: { actif: !cible.actif } });
  await journaliser(
    user.id,
    cible.actif ? "COMPTE_DESACTIVE" : "COMPTE_ACTIVE",
    `${cible.prenom} ${cible.nom}`
  );
  revalidatePath("/admin");
  revalidatePath("/groupes");
}
