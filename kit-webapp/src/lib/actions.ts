"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";
import { creerSession, detruireSession, getUtilisateur } from "./auth";
import { journaliser } from "./audit";
import { roleAuMoins, roleValide, type Role } from "./roles";
import { publicIdValide, signerEnvoi, supprimerImages } from "./cloudinary";
import {
  EMAIL_ACTIF,
  courrielCompteCree,
  courrielEssai,
  courrielReinitialisation,
  emailPlausible,
  envoyer,
} from "./email";
import { SITE_URL } from "./site";
import { CLE_LECTURE_SEULE, ecrireReglage } from "./reglages";

// Actions serveur.
//
// Deux conventions, tenues partout :
//
//   • Un REFUS n'est pas une exception. En production, Next masque le message
//     d'une erreur levée dans une action : l'utilisateur voit « Une erreur est
//     survenue » et ne sait pas quoi corriger. Une action renvoie donc
//     { ok: false, motif } ou { erreur } — et { ok: true, … } en cas de succès.
//     On ne lève que pour ce qui ne devrait jamais arriver (formulaire trafiqué).
//
//   • Chaque action commence par `exiger(rôle)` : la vérification des droits
//     est dans l'action, pas seulement dans la page qui l'affiche.

async function exiger(minimum: Role) {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  if (!roleAuMoins(user.role, minimum)) {
    throw new Error("Vous n'avez pas la permission d'effectuer cette action.");
  }
  return user;
}

// ---------- Connexion ----------

/** Au-delà, on cesse de répondre à cette adresse pendant la fenêtre. */
const ESSAIS_MAX = 8;
const FENETRE_ESSAIS_MS = 15 * 60_000;

export async function seConnecter(_prev: { erreur?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");

  // Trop d'échecs récents sur cette adresse : on cesse de répondre un quart
  // d'heure. Le compte n'est pas verrouillé — verrouiller serait un moyen
  // commode d'empêcher quelqu'un de travailler.
  const echecs = await prisma.tentativeConnexion.count({
    where: { email, reussie: false, createdAt: { gt: new Date(Date.now() - FENETRE_ESSAIS_MS) } },
  });
  if (echecs >= ESSAIS_MAX) {
    return { erreur: "Trop de tentatives sur cette adresse. Patientez un quart d'heure." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(motDePasse, user.passwordHash))) {
    await prisma.tentativeConnexion.create({ data: { email, reussie: false } });
    return { erreur: "Email ou mot de passe incorrect." };
  }
  await prisma.tentativeConnexion.create({ data: { email, reussie: true } });

  // Un compte désactivé reçoit un message qui dit quoi faire, plutôt que
  // « mot de passe incorrect » qui enverrait chercher au mauvais endroit.
  if (!user.actif) {
    return { erreur: "Ce compte est désactivé. Adressez-vous à un administrateur." };
  }
  await creerSession(user.id);
  await journaliser(user.id, "CONNEXION");
  redirect(user.doitChangerMotDePasse ? "/mot-de-passe" : "/accueil");
}

export async function seDeconnecter() {
  await detruireSession();
  redirect("/login");
}

// ---------- Mots de passe ----------

const MDP_MINIMUM = 8;

// Mot de passe provisoire lisible au téléphone : pas de 0/O ni de 1/l/I, que
// l'on confond en le dictant.
function motDePasseProvisoire(): string {
  const lettres = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const chiffres = "23456789";
  const tirage = (source: string, n: number) =>
    Array.from(randomBytes(n)).map((o) => source[o % source.length]).join("");
  return `${tirage(lettres, 4)}-${tirage(chiffres, 4)}`;
}

export async function changerMonMotDePasse(_prev: { erreur?: string } | undefined, formData: FormData) {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const actuel = String(formData.get("actuel") ?? "");

  // Le mot de passe actuel n'est pas redemandé quand il est provisoire : la
  // personne vient justement de le recevoir.
  if (!user.doitChangerMotDePasse) {
    if (!(await bcrypt.compare(actuel, user.passwordHash))) {
      return { erreur: "Mot de passe actuel incorrect." };
    }
  }
  if (nouveau.length < MDP_MINIMUM) return { erreur: `Choisissez au moins ${MDP_MINIMUM} caractères.` };
  if (nouveau !== confirmation) return { erreur: "Les deux saisies ne correspondent pas." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(nouveau, 10), doitChangerMotDePasse: false },
  });
  await journaliser(user.id, "MOT_DE_PASSE_CHANGE");
  redirect("/accueil");
}

/** Un administrateur génère un mot de passe provisoire pour quelqu'un qui a
 *  oublié le sien. Affiché une seule fois, à dicter de vive voix. */
export async function reinitialiserMotDePasse(userId: string) {
  const auteur = await exiger("ADMIN");
  const cible = await prisma.user.findUnique({ where: { id: userId } });
  if (!cible) return { ok: false as const, motif: "Compte introuvable." };
  const provisoire = motDePasseProvisoire();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(provisoire, 10), doitChangerMotDePasse: true },
  });
  await journaliser(auteur.id, "MOT_DE_PASSE_REINITIALISE", `${cible.prenom} ${cible.nom} (${cible.email})`);
  revalidatePath("/admin");
  return { ok: true as const, provisoire, nom: `${cible.prenom} ${cible.nom}` };
}

// ---------- Mot de passe oublié, par e-mail ----------

const VALIDITE_LIEN_HEURES = 3;
/** Au-delà, on cesse d'envoyer : ni harcèlement d'une boîte, ni facture de messagerie. */
const DEMANDES_MAX_PAR_HEURE = 3;

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

type Retour = { message?: string; erreur?: string };

/**
 * La réponse est TOUJOURS la même, que l'adresse existe ou non : sinon ce
 * formulaire deviendrait un moyen commode de découvrir qui a un compte.
 */
export async function demanderReinitialisation(_prev: Retour | undefined, formData: FormData): Promise<Retour> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erreur: "Indiquez votre adresse e-mail." };

  const reponse: Retour = {
    message:
      "Si cette adresse correspond à un compte, un lien vient d'y être envoyé. " +
      `Il est valable ${VALIDITE_LIEN_HEURES} heures. Pensez à regarder dans les indésirables.`,
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.actif) return reponse;

  if (!EMAIL_ACTIF) {
    await journaliser(user.id, "REINITIALISATION_IMPOSSIBLE", "e-mail non configuré");
    return reponse;
  }

  const recentes = await prisma.reinitialisationMotDePasse.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 3600_000) } },
  });
  if (recentes >= DEMANDES_MAX_PAR_HEURE) return reponse;

  // Un seul lien vivant à la fois.
  await prisma.reinitialisationMotDePasse.updateMany({
    where: { userId: user.id, utiliseLe: null },
    data: { utiliseLe: new Date() },
  });

  const jeton = randomBytes(32).toString("base64url");
  await prisma.reinitialisationMotDePasse.create({
    data: {
      userId: user.id,
      empreinte: empreinte(jeton),
      expireLe: new Date(Date.now() + VALIDITE_LIEN_HEURES * 3600_000),
    },
  });

  const envoi = await envoyer({
    a: user.email,
    ...courrielReinitialisation(user.prenom, `${SITE_URL}/reinitialiser/${jeton}`, VALIDITE_LIEN_HEURES),
  });
  await journaliser(
    user.id,
    envoi.envoye ? "REINITIALISATION_DEMANDEE" : "REINITIALISATION_NON_ENVOYEE",
    envoi.envoye ? user.email : `${user.email} — ${envoi.raison}`
  );
  return reponse;
}

/** Le jeton est-il utilisable ? Sert à la page avant d'afficher le formulaire. */
export async function verifierJeton(jeton: string) {
  const demande = await prisma.reinitialisationMotDePasse.findUnique({
    where: { empreinte: empreinte(jeton) },
    include: { user: { select: { prenom: true, actif: true } } },
  });
  if (!demande || demande.utiliseLe || demande.expireLe < new Date()) return null;
  if (!demande.user.actif) return null;
  return { prenom: demande.user.prenom };
}

export async function reinitialiserParJeton(_prev: { erreur?: string } | undefined, formData: FormData) {
  const jeton = String(formData.get("jeton") ?? "");
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (nouveau.length < MDP_MINIMUM) return { erreur: `Choisissez au moins ${MDP_MINIMUM} caractères.` };
  if (nouveau !== confirmation) return { erreur: "Les deux saisies ne correspondent pas." };

  const demande = await prisma.reinitialisationMotDePasse.findUnique({
    where: { empreinte: empreinte(jeton) },
    include: { user: true },
  });
  if (!demande || demande.utiliseLe || demande.expireLe < new Date()) {
    return { erreur: "Ce lien n'est plus valable. Demandez-en un nouveau." };
  }
  if (!demande.user.actif) return { erreur: "Ce compte n'est pas actif." };

  // Le marquage et le changement vont ensemble : si l'un échoue, aucun des
  // deux ne doit passer, sinon le lien resterait utilisable une seconde fois.
  await prisma.$transaction([
    prisma.reinitialisationMotDePasse.update({ where: { id: demande.id }, data: { utiliseLe: new Date() } }),
    prisma.user.update({
      where: { id: demande.userId },
      data: { passwordHash: await bcrypt.hash(nouveau, 10), doitChangerMotDePasse: false },
    }),
  ]);
  await journaliser(demande.userId, "MOT_DE_PASSE_REINITIALISE_PAR_LIEN", demande.user.email);
  redirect("/login?reinitialise=1");
}

// ---------- Profil ----------

export async function changerMonProfil(_prev: { erreur?: string; ok?: boolean } | undefined, formData: FormData) {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim() || null;
  const sexe = String(formData.get("sexe") ?? "M") === "F" ? "F" : "M";
  if (!prenom || !nom) return { erreur: "Le prénom et le nom sont obligatoires." };
  if (prenom.length > 60 || nom.length > 60) return { erreur: "Nom ou prénom trop long." };

  await prisma.user.update({ where: { id: user.id }, data: { prenom, nom, telephone, sexe } });
  await journaliser(user.id, "PROFIL_MODIFIE");
  revalidatePath("/profil");
  return { ok: true };
}

/** Signature d'envoi pour la photo de profil, dans son propre dossier. */
export async function demanderSignaturePhotoProfil() {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  return signerEnvoi("profils");
}

export async function enregistrerMaPhoto(publicId: string) {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  // Sans ce contrôle, un formulaire trafiqué pourrait faire pointer sa photo
  // vers n'importe quel fichier du compte Cloudinary.
  if (!publicIdValide(publicId, "profils")) return { ok: false as const, motif: "Image refusée." };

  await prisma.user.update({ where: { id: user.id }, data: { photoPublicId: publicId } });
  // L'ancienne ne sert plus à rien.
  if (user.photoPublicId) await supprimerImages([user.photoPublicId]);
  await journaliser(user.id, "PHOTO_PROFIL_MODIFIEE");
  revalidatePath("/profil");
  return { ok: true as const };
}

export async function supprimerMaPhoto() {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  if (!user.photoPublicId) return { ok: true as const };
  await prisma.user.update({ where: { id: user.id }, data: { photoPublicId: null } });
  await supprimerImages([user.photoPublicId]);
  await journaliser(user.id, "PHOTO_PROFIL_RETIREE");
  revalidatePath("/profil");
  return { ok: true as const };
}

// ---------- Administration ----------

export async function creerUtilisateur(
  _prev: { erreur?: string; provisoire?: string; email?: string } | undefined,
  formData: FormData
) {
  const auteur = await exiger("ADMIN");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const sexe = String(formData.get("sexe") ?? "M") === "F" ? "F" : "M";
  const role = String(formData.get("role") ?? "MEMBRE");

  if (!emailPlausible(email)) return { erreur: "Adresse e-mail invalide." };
  if (!prenom || !nom) return { erreur: "Le prénom et le nom sont obligatoires." };
  if (!roleValide(role)) return { erreur: "Rôle inconnu." };
  if (await prisma.user.findUnique({ where: { email } })) {
    return { erreur: "Cette adresse a déjà un compte." };
  }

  const provisoire = motDePasseProvisoire();
  const cree = await prisma.user.create({
    data: { email, prenom, nom, sexe, role, passwordHash: await bcrypt.hash(provisoire, 10), doitChangerMotDePasse: true },
  });
  await journaliser(auteur.id, "COMPTE_CREE", `${prenom} ${nom} (${email}) — ${role}`);
  // Le mot de passe n'est jamais envoyé par e-mail : on annonce l'ouverture,
  // le provisoire se dicte.
  await envoyer({ a: email, ...courrielCompteCree(prenom, email) });
  revalidatePath("/admin");
  return { provisoire, email: cree.email };
}

export async function basculerActif(userId: string) {
  const auteur = await exiger("ADMIN");
  if (userId === auteur.id) return { ok: false as const, motif: "Vous ne pouvez pas désactiver votre propre compte." };
  const cible = await prisma.user.findUnique({ where: { id: userId } });
  if (!cible) return { ok: false as const, motif: "Compte introuvable." };
  await prisma.user.update({ where: { id: userId }, data: { actif: !cible.actif } });
  await journaliser(auteur.id, cible.actif ? "COMPTE_DESACTIVE" : "COMPTE_REACTIVE", cible.email);
  revalidatePath("/admin");
  return { ok: true as const, actif: !cible.actif };
}

export async function changerRole(userId: string, role: string) {
  const auteur = await exiger("ADMIN");
  if (!roleValide(role)) return { ok: false as const, motif: "Rôle inconnu." };
  if (userId === auteur.id) return { ok: false as const, motif: "Vous ne pouvez pas changer votre propre rôle." };
  const cible = await prisma.user.update({ where: { id: userId }, data: { role } });
  await journaliser(auteur.id, "ROLE_CHANGE", `${cible.email} → ${role}`);
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function basculerLectureSeule(actif: boolean) {
  const auteur = await exiger("ADMIN");
  await ecrireReglage(CLE_LECTURE_SEULE, actif ? "oui" : "non");
  await journaliser(auteur.id, actif ? "LECTURE_SEULE_ACTIVEE" : "LECTURE_SEULE_LEVEE");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function envoyerEssaiEmail(_prev: { message?: string; erreur?: string } | undefined, formData: FormData) {
  const user = await exiger("ADMIN");
  const a = String(formData.get("a") ?? "").trim().toLowerCase() || user.email;
  if (!emailPlausible(a)) return { erreur: "Adresse invalide." };
  const envoi = await envoyer({ a, ...courrielEssai(user.prenom) });
  await journaliser(user.id, "ESSAI_EMAIL", envoi.envoye ? a : `${a} — ${envoi.raison}`);
  if (envoi.envoye) return { message: `Message envoyé à ${a}. Regardez aussi dans les indésirables.` };
  return {
    erreur:
      envoi.raison === "non-configuré"
        ? "L'envoi n'est pas configuré : RESEND_API_KEY ou EMAIL_EXPEDITEUR manque."
        : `Envoi refusé : ${envoi.detail ?? "raison inconnue"}.`,
  };
}
