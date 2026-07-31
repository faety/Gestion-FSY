"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";
import { creerSession, detruireSession, getUtilisateur } from "./auth";
import { journaliser } from "./audit";
import { DROITS, lireDroits, peutModifierDirectement, roleAuMoins, type Droit } from "./roles";
import { ETAPES_VALIDES, etapeCar } from "./etapes-car";
import { AMBIANCES, calculerPoints, lireReponses, sectionsPour } from "./rapports";
import { publicIdValide, signerEnvoi, supprimerPhotos } from "./cloudinary";
import { CHOSES_A_EFFACER, type ChoseAEffacer } from "./remise-a-zero";
import { STATUT_ANNULE } from "./criteres";
import {
  EMAIL_ACTIF,
  SITE,
  courrielCompteValide,
  courrielEssai,
  courrielReinitialisation,
  emailPlausible,
  envoyer,
  estAdresseDAttente,
} from "./email";
import {
  ROLES_ATTESTABLES,
  RAPPORTS_POSSIBLES,
  calculerMention,
  codeDepuisOctets,
} from "./attestations";

async function exiger(minimum: "DIRIGEANT" | "COORDINATEUR" | "ADJOINT" | "CONSEILLER") {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  if (!roleAuMoins(user.role, minimum)) {
    throw new Error("Vous n'avez pas la permission d'effectuer cette action.");
  }
  return user;
}

// ---------- Authentification ----------

/** Au-delà, on cesse de répondre à cette adresse pendant la fenêtre. */
const ESSAIS_MAX = 8;
const FENETRE_ESSAIS_MS = 15 * 60_000;

export async function seConnecter(
  _prev: { erreur?: string } | undefined,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");

  // Trop d'échecs récents sur cette adresse : on cesse de répondre pendant un
  // quart d'heure. Le compte n'est pas verrouillé — verrouiller serait un moyen
  // commode d'empêcher quelqu'un de travailler le jour du départ.
  const echecs = await prisma.tentativeConnexion.count({
    where: {
      email,
      reussie: false,
      createdAt: { gt: new Date(Date.now() - FENETRE_ESSAIS_MS) },
    },
  });
  if (echecs >= ESSAIS_MAX) {
    return {
      erreur:
        "Trop de tentatives sur cette adresse. Patientez un quart d'heure, " +
        "ou demandez un mot de passe provisoire aux coordinateurs principaux.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(motDePasse, user.passwordHash))) {
    await prisma.tentativeConnexion.create({ data: { email, reussie: false } });
    return { erreur: "Email ou mot de passe incorrect." };
  }
  await prisma.tentativeConnexion.create({ data: { email, reussie: true } });
  // Un compte en attente ou désactivé reçoit un message qui dit quoi faire,
  // plutôt que « mot de passe incorrect » qui enverrait la personne chercher au
  // mauvais endroit.
  if (!user.valide) {
    return {
      erreur:
        "Votre inscription attend la validation des coordinateurs principaux. Vous pourrez vous connecter dès qu'elle sera approuvée.",
    };
  }
  if (!user.actif) {
    return { erreur: "Ce compte a été désactivé. Adressez-vous aux coordinateurs principaux." };
  }
  await creerSession(user.id);
  await journaliser(user.id, "CONNEXION");
  redirect(user.doitChangerMotDePasse ? "/mot-de-passe" : "/accueil");
}

// ---------- Mots de passe ----------

const MDP_MINIMUM = 8;

// Mot de passe provisoire lisible au téléphone : pas de 0/O ni de 1/l/I, que
// l'on confond en le dictant à quelqu'un.
function motDePasseProvisoire(): string {
  const lettres = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const chiffres = "23456789";
  const tirage = (source: string, n: number) =>
    Array.from(randomBytes(n))
      .map((o) => source[o % source.length])
      .join("");
  return `${tirage(lettres, 4)}-${tirage(chiffres, 4)}`;
}

export async function changerMonMotDePasse(
  _prev: { erreur?: string; ok?: boolean } | undefined,
  formData: FormData
) {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const actuel = String(formData.get("actuel") ?? "");

  // Le mot de passe actuel n'est pas redemandé quand il est provisoire : la
  // personne vient justement de le recevoir d'un coordinateur.
  if (!user.doitChangerMotDePasse) {
    const utilisateur = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await bcrypt.compare(actuel, utilisateur.passwordHash))) {
      return { erreur: "Mot de passe actuel incorrect." };
    }
  }
  if (nouveau.length < MDP_MINIMUM) {
    return { erreur: `Choisissez au moins ${MDP_MINIMUM} caractères.` };
  }
  if (nouveau !== confirmation) {
    return { erreur: "Les deux saisies ne correspondent pas." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(nouveau, 10), doitChangerMotDePasse: false },
  });
  await journaliser(user.id, "MOT_DE_PASSE_CHANGE");
  redirect("/accueil");
}

// Un coordinateur génère un mot de passe provisoire pour quelqu'un qui a oublié
// le sien. Il est affiché une seule fois, à dicter de vive voix ; la personne
// devra en choisir un nouveau dès sa connexion.
export async function reinitialiserMotDePasse(userId: string) {
  const auteur = await exiger("COORDINATEUR");
  const cible = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const provisoire = motDePasseProvisoire();
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(provisoire, 10),
      doitChangerMotDePasse: true,
    },
  });
  await journaliser(
    auteur.id,
    "MOT_DE_PASSE_REINITIALISE",
    `${cible.prenom} ${cible.nom} (${cible.email})`
  );
  revalidatePath("/admin");
  return { provisoire, nom: `${cible.prenom} ${cible.nom}`, email: cible.email };
}

// ---------- Mot de passe oublié, par e-mail ----------

const VALIDITE_LIEN_HEURES = 3;
/** Au-delà, on cesse d'envoyer : ni harcèlement d'une boîte, ni facture de messagerie. */
const DEMANDES_MAX_PAR_HEURE = 3;

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

/**
 * Demande d'un lien de réinitialisation.
 *
 * La réponse est **toujours la même**, que l'adresse existe ou non : sinon ce
 * formulaire deviendrait un moyen commode de découvrir qui fait partie de
 * l'encadrement. Les cas particuliers se règlent en interne, pas à l'écran.
 */
type Retour = { message?: string; erreur?: string };

export async function demanderReinitialisation(
  _prev: Retour | undefined,
  formData: FormData
): Promise<Retour> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erreur: "Indiquez votre adresse e-mail." };

  const reponse: Retour = {
    message:
      "Si cette adresse correspond à un compte, un lien vient d'y être envoyé. " +
      "Il est valable trois heures. Pensez à regarder dans les indésirables.",
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.actif || !user.valide) return reponse;

  // Adresse d'attente : aucune boîte derrière, le lien n'arriverait nulle part.
  // On ne le dit pas ici — la personne s'adressera au couple dirigeant, qui a
  // le mot de passe provisoire.
  if (estAdresseDAttente(user.email) || !EMAIL_ACTIF) {
    await journaliser(user.id, "REINITIALISATION_IMPOSSIBLE", user.email);
    return reponse;
  }

  const recentes = await prisma.reinitialisationMotDePasse.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 3600_000) } },
  });
  if (recentes >= DEMANDES_MAX_PAR_HEURE) return reponse;

  // Les liens précédents deviennent caducs : un seul lien vivant à la fois.
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

  const courriel = courrielReinitialisation(
    user.prenom,
    `${SITE}/reinitialiser/${jeton}`,
    VALIDITE_LIEN_HEURES
  );
  const envoi = await envoyer({ a: user.email, ...courriel });
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
    include: { user: { select: { prenom: true, actif: true, valide: true } } },
  });
  if (!demande || demande.utiliseLe || demande.expireLe < new Date()) return null;
  if (!demande.user.actif || !demande.user.valide) return null;
  return { prenom: demande.user.prenom };
}

export async function reinitialiserParJeton(
  _prev: { erreur?: string } | undefined,
  formData: FormData
) {
  const jeton = String(formData.get("jeton") ?? "");
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (nouveau.length < MDP_MINIMUM) {
    return { erreur: `Choisissez au moins ${MDP_MINIMUM} caractères.` };
  }
  if (nouveau !== confirmation) return { erreur: "Les deux saisies ne correspondent pas." };

  const demande = await prisma.reinitialisationMotDePasse.findUnique({
    where: { empreinte: empreinte(jeton) },
    include: { user: true },
  });
  if (!demande || demande.utiliseLe || demande.expireLe < new Date()) {
    return { erreur: "Ce lien n'est plus valable. Demandez-en un nouveau." };
  }
  if (!demande.user.actif || !demande.user.valide) {
    return { erreur: "Ce compte n'est pas actif. Adressez-vous au couple dirigeant." };
  }

  // Le marquage et le changement vont ensemble : si l'un échoue, aucun des deux
  // ne doit passer, sinon le lien resterait utilisable une seconde fois.
  await prisma.$transaction([
    prisma.reinitialisationMotDePasse.update({
      where: { id: demande.id },
      data: { utiliseLe: new Date() },
    }),
    prisma.user.update({
      where: { id: demande.userId },
      data: {
        passwordHash: await bcrypt.hash(nouveau, 10),
        doitChangerMotDePasse: false,
      },
    }),
  ]);
  await journaliser(demande.userId, "MOT_DE_PASSE_REINITIALISE_PAR_LIEN", demande.user.email);
  redirect("/login?reinitialise=1");
}

// ---------- Adresse e-mail ----------
//
// Les 66 comptes d'amorçage portent un identifiant fabriqué à partir du nom.
// Tant qu'il n'est pas remplacé par une vraie adresse, aucun e-mail ne peut
// arriver — d'où ces deux actions, l'une pour soi, l'autre pour le couple
// dirigeant et les coordinateurs principaux.

async function poserEmail(
  userId: string,
  brut: string,
  parAuteur: string
): Promise<{ ok?: boolean; erreur?: string; email?: string }> {
  const email = brut.trim().toLowerCase();
  if (!emailPlausible(email)) return { erreur: "Cette adresse ne semble pas valide." };
  if (estAdresseDAttente(email)) {
    return { erreur: "Indiquez une vraie adresse : le domaine fsy2026.ci n'existe pas." };
  }
  const occupee = await prisma.user.findUnique({ where: { email } });
  if (occupee && occupee.id !== userId) {
    return { erreur: "Cette adresse est déjà utilisée par un autre compte." };
  }
  const avant = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.user.update({ where: { id: userId }, data: { email } });
  await journaliser(parAuteur, "EMAIL_MODIFIE", `${avant.email} → ${email}`);
  return { ok: true, email };
}

export async function changerMonEmail(
  _prev: { erreur?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ erreur?: string; ok?: boolean }> {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  const r = await poserEmail(user.id, String(formData.get("email") ?? ""), user.id);
  if (r.erreur) return { erreur: r.erreur };
  revalidatePath("/mot-de-passe");
  revalidatePath("/admin");
  return { ok: true };
}

export async function definirEmail(userId: string, email: string) {
  const auteur = await exiger("COORDINATEUR");
  const r = await poserEmail(userId, email, auteur.id);
  revalidatePath("/admin");
  return r;
}

/**
 * Vérifie la configuration Resend.
 *
 * Par défaut le message part vers l'adresse du compte, mais on peut en indiquer
 * une autre : au moment où l'on branche la messagerie, tous les comptes portent
 * encore un identifiant d'attente, et il faut bien pouvoir contrôler que
 * l'envoi fonctionne avant de commencer à corriger les adresses.
 */
export async function envoyerEmailDEssai(destinataire?: string) {
  const user = await exiger("COORDINATEUR");
  if (!EMAIL_ACTIF) {
    return { erreur: "L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY, EMAIL_EXPEDITEUR)." };
  }

  const a = (destinataire?.trim() || user.email).toLowerCase();
  if (!emailPlausible(a)) return { erreur: "Cette adresse ne semble pas valide." };
  if (estAdresseDAttente(a)) {
    return {
      erreur:
        "Le domaine fsy2026.ci n'existe pas : aucun message ne peut y arriver. " +
        "Indiquez une vraie adresse pour l'essai.",
    };
  }

  const envoi = await envoyer({ a, ...courrielEssai(user.prenom) });
  await journaliser(user.id, "EMAIL_ESSAI", envoi.envoye ? a : `${a} — ${envoi.raison}`);
  return envoi.envoye
    ? { ok: `Message envoyé à ${a}. Regardez aussi dans les indésirables.` }
    : { erreur: `Échec : ${envoi.detail ?? envoi.raison}` };
}

// ---------- Profil ----------
//
// Chacun renseigne lui-même son téléphone et sa photo. C'est plus juste que de
// faire saisir soixante-quatre fiches par le couple dirigeant, et c'est la
// seule façon d'avoir des numéros à jour le jour du départ.

/** Numéros ivoiriens et internationaux : on accepte large, on refuse l'absurde. */
const telephonePlausible = (t: string) => {
  const chiffres = t.replace(/[^\d]/g, "");
  return chiffres.length >= 8 && chiffres.length <= 15;
};

export async function changerMonTelephone(
  _prev: { erreur?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ erreur?: string; ok?: boolean }> {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  const telephone = String(formData.get("telephone") ?? "").trim();

  if (telephone && !telephonePlausible(telephone)) {
    return { erreur: "Ce numéro ne semble pas complet." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { telephone: telephone || null },
  });
  await journaliser(user.id, "TELEPHONE_MODIFIE", telephone || "retiré");
  revalidatePath("/profil");
  revalidatePath("/organigramme");
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
  // de profil vers n'importe quel fichier du compte Cloudinary — y compris une
  // photo de rapport, où figurent des mineurs.
  if (!publicIdValide(publicId, "profils")) throw new Error("Image refusée.");

  const avant = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { photoPublicId: true },
  });
  await prisma.user.update({ where: { id: user.id }, data: { photoPublicId: publicId } });
  // L'ancienne ne sert plus à rien : on ne garde pas les portraits périmés.
  if (avant.photoPublicId) await supprimerPhotos([avant.photoPublicId]);

  await journaliser(user.id, "PHOTO_PROFIL_MODIFIEE");
  revalidatePath("/profil");
  revalidatePath("/organigramme");
  return { ok: true };
}

export async function supprimerMaPhoto() {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  const avant = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { photoPublicId: true },
  });
  if (!avant.photoPublicId) return { ok: true };

  await prisma.user.update({ where: { id: user.id }, data: { photoPublicId: null } });
  await supprimerPhotos([avant.photoPublicId]);
  await journaliser(user.id, "PHOTO_PROFIL_RETIREE");
  revalidatePath("/profil");
  revalidatePath("/organigramme");
  return { ok: true };
}

// ---------- Inscription ----------

// Toute inscription attend la validation des coordinateurs principaux : c'est
// ce qui permet de vérifier que la personne fait bien partie de l'encadrement.
export async function sInscrire(
  _prev: { erreur?: string; ok?: boolean } | undefined,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nom = String(formData.get("nom") ?? "").trim();
  const prenom = String(formData.get("prenom") ?? "").trim();
  const telephone = String(formData.get("telephone") ?? "").trim() || null;
  const sexe = String(formData.get("sexe") ?? "");
  const role = String(formData.get("role") ?? "CONSEILLER");
  const motDePasse = String(formData.get("motDePasse") ?? "");

  if (!email.includes("@")) return { erreur: "Adresse électronique invalide." };
  if (!nom || !prenom) return { erreur: "Indiquez votre nom et votre prénom." };
  if (sexe !== "M" && sexe !== "F") return { erreur: "Indiquez si vous êtes un homme ou une femme." };
  if (!["CONSEILLER", "ADJOINT"].includes(role)) return { erreur: "Rôle invalide." };
  if (motDePasse.length < MDP_MINIMUM) {
    return { erreur: `Choisissez un mot de passe d'au moins ${MDP_MINIMUM} caractères.` };
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return {
      erreur:
        "Un compte existe déjà avec cette adresse. Utilisez « mot de passe oublié » auprès d'un coordinateur.",
    };
  }

  const cree = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(motDePasse, 10),
      nom,
      prenom,
      telephone,
      sexe,
      role,
      valide: false,
    },
  });
  await journaliser(cree.id, "INSCRIPTION_DEMANDEE", `${prenom} ${nom} — ${role}`);
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Rattache une inscription à un compte déjà en base : c'est la même personne.
 *
 * Le compte conservé est l'ancien — c'est lui qui porte le rôle issu des listes
 * officielles, la compagnie, le groupe, les rapports déjà remis. On lui
 * transporte ce que l'inscription apporte de neuf : la vraie adresse, le mot de
 * passe choisi par la personne, le téléphone. Puis le doublon disparaît.
 *
 * L'inverse — garder le nouveau compte — perdrait les affectations, et le jeune
 * du groupe se retrouverait sans conseiller la veille du départ.
 */
export async function rattacherInscription(inscriptionId: string, compteId: string) {
  const auteur = await exiger("COORDINATEUR");
  if (inscriptionId === compteId) throw new Error("Un compte ne se rattache pas à lui-même.");

  const [inscription, compte] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: inscriptionId },
      include: {
        _count: {
          select: {
            rapports: true,
            groupesDiriges: true,
            mouvementsValides: true,
            affectationsCars: true,
          },
        },
        attestation: { select: { id: true } },
      },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: compteId } }),
  ]);

  // Le rattachement supprime le compte d'inscription. S'il porte déjà quelque
  // chose — un rapport écrit, un groupe confié, des pointages — le supprimer
  // effacerait du travail. Dans ce cas on refuse, et l'affaire se règle à la
  // main plutôt qu'en perdant des données sans le dire.
  const n = inscription._count;
  const porte = n.rapports + n.groupesDiriges + n.mouvementsValides + n.affectationsCars;
  if (porte > 0 || inscription.attestation) {
    throw new Error(
      "Ce compte a déjà servi (rapports, groupe, pointages ou attestation). " +
        "Rattacher l'effacerait : réglez le doublon à la main."
    );
  }
  if (!compte.valide) throw new Error("Le compte de destination n'est pas validé.");

  await prisma.$transaction(async (tx) => {
    // L'adresse est unique en base : il faut libérer celle de l'inscription
    // avant de la poser sur le compte conservé.
    await tx.auditLog.deleteMany({ where: { userId: inscription.id } });
    await tx.reinitialisationMotDePasse.deleteMany({ where: { userId: inscription.id } });
    await tx.user.delete({ where: { id: inscription.id } });
    await tx.user.update({
      where: { id: compte.id },
      data: {
        email: inscription.email,
        passwordHash: inscription.passwordHash,
        telephone: inscription.telephone ?? compte.telephone,
        // La personne vient de choisir ce mot de passe : rien à lui imposer.
        doitChangerMotDePasse: false,
      },
    });
  });

  await journaliser(
    auteur.id,
    "INSCRIPTION_RATTACHEE",
    `${inscription.prenom} ${inscription.nom} (${inscription.email}) → compte de ${compte.prenom} ${compte.nom} (${compte.email})`
  );
  await envoyer({ a: inscription.email, ...courrielCompteValide(compte.prenom) });
  revalidatePath("/admin");
  return { nom: `${compte.prenom} ${compte.nom}`, email: inscription.email };
}

export async function deciderInscription(userId: string, accepter: boolean) {
  const auteur = await exiger("COORDINATEUR");
  const cible = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (accepter) {
    await prisma.user.update({ where: { id: userId }, data: { valide: true } });
    // La personne attend ce signal : sans lui, elle réessaierait de se
    // connecter au hasard. L'échec de l'envoi ne remet pas la validation en
    // cause — le compte est ouvert de toute façon.
    await envoyer({ a: cible.email, ...courrielCompteValide(cible.prenom) });
  } else {
    // Refus : le compte est supprimé, la personne peut se réinscrire si c'est
    // une erreur. Rien n'y est encore rattaché puisqu'elle n'a pas pu se connecter.
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
  await journaliser(
    auteur.id,
    accepter ? "INSCRIPTION_VALIDEE" : "INSCRIPTION_REFUSEE",
    `${cible.prenom} ${cible.nom} (${cible.email})`
  );
  revalidatePath("/admin");
}

export async function seDeconnecter() {
  await detruireSession();
  redirect("/login");
}

// ---------- Arrivées / départs (cars) ----------

// Qui peut cocher les noms pour un car et une étape ?
// Les personnes affectées à cette étape, et toujours les coordinateurs
// principaux et le couple dirigeant. Si personne n'est affecté, tout encadrant
// peut cocher — pour ne bloquer personne le jour même.
async function verifierDroitDePointage(
  user: { id: string; role: string },
  carId: string,
  etape: string
) {
  if (roleAuMoins(user.role, "COORDINATEUR")) return;
  const affectations = await prisma.affectationCar.findMany({ where: { carId, etape } });
  if (affectations.length === 0) return;
  if (affectations.some((a) => a.userId === user.id)) return;
  throw new Error(
    `Vous n'êtes pas affecté au pointage « ${etapeCar(etape)?.label ?? etape} » de ce car.`
  );
}

export async function validerMouvement(jeuneId: string, carId: string, type: string) {
  const user = await exiger("CONSEILLER");
  if (!ETAPES_VALIDES.includes(type)) throw new Error("Étape invalide");
  await verifierDroitDePointage(user, carId, type);
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
  await verifierDroitDePointage(user, carId, type);
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

// ---------- Affectation du pointage des cars ----------

// Le couple dirigeant et les coordinateurs principaux désignent, pour chaque car
// et chaque étape, qui coche les noms des jeunes.
export async function affecterPointageCar(carId: string, etape: string, userId: string) {
  const user = await exiger("COORDINATEUR");
  if (!ETAPES_VALIDES.includes(etape)) throw new Error("Étape invalide");
  const [car, cible] = await Promise.all([
    prisma.car.findUniqueOrThrow({ where: { id: carId } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
  ]);
  await prisma.affectationCar.upsert({
    where: { carId_etape_userId: { carId, etape, userId } },
    update: {},
    create: { carId, etape, userId },
  });
  await journaliser(
    user.id,
    "POINTAGE_AFFECTE",
    `${cible.prenom} ${cible.nom} → ${etapeCar(etape)?.label} de ${car.nom}`
  );
  revalidatePath(`/cars/${carId}`);
  revalidatePath("/cars");
}

export async function retirerPointageCar(carId: string, etape: string, userId: string) {
  const user = await exiger("COORDINATEUR");
  const [car, cible] = await Promise.all([
    prisma.car.findUniqueOrThrow({ where: { id: carId } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
  ]);
  await prisma.affectationCar.deleteMany({ where: { carId, etape, userId } });
  await journaliser(
    user.id,
    "POINTAGE_RETIRE",
    `${cible.prenom} ${cible.nom} — ${etapeCar(etape)?.label} de ${car.nom}`
  );
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
      publicCible: String(formData.get("publicCible") ?? "TOUS"),
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
    // ou adjoint ayant reçu le droit).
    // Corriger un horaire encore provisoire équivaut à le confirmer : on passe
    // à PLANIFIE plutôt qu'à MODIFIE (qui signale un changement du programme
    // déjà publié).
    const nouveauStatut = annuler
      ? "ANNULE"
      : activite.statut === "A_CONFIRMER"
        ? "PLANIFIE"
        : "MODIFIE";
    await prisma.activite.update({
      where: { id: activiteId },
      data: {
        titre: nouveauTitre ?? activite.titre,
        debut: nouveauDebut ?? activite.debut,
        lieu: nouveauLieu ?? activite.lieu,
        statut: nouveauStatut,
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

// Confirme un horaire provisoire (A_CONFIRMER → PLANIFIE), ou l'inverse.
// Sert à valider le programme importé du manuel officiel, activité par activité.
export async function basculerConfirmation(activiteId: string) {
  const user = await exiger("COORDINATEUR");
  const activite = await prisma.activite.findUniqueOrThrow({ where: { id: activiteId } });
  if (activite.statut === "ANNULE") throw new Error("Cette activité est annulée.");
  const confirme = activite.statut === "A_CONFIRMER";
  await prisma.activite.update({
    where: { id: activiteId },
    data: { statut: confirme ? "PLANIFIE" : "A_CONFIRMER" },
  });
  await journaliser(
    user.id,
    confirme ? "ACTIVITE_CONFIRMEE" : "ACTIVITE_A_CONFIRMER",
    activite.titre
  );
  revalidatePath("/programme");
  revalidatePath("/accueil");
}

// Confirme d'un coup toutes les activités provisoires d'une journée
export async function confirmerJournee(dateISO: string) {
  const user = await exiger("COORDINATEUR");
  const debut = new Date(dateISO);
  debut.setHours(0, 0, 0, 0);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 1);
  const { count } = await prisma.activite.updateMany({
    where: { statut: "A_CONFIRMER", debut: { gte: debut, lt: fin } },
    data: { statut: "PLANIFIE" },
  });
  await journaliser(
    user.id,
    "JOURNEE_CONFIRMEE",
    `${count} activité(s) le ${debut.toLocaleDateString("fr-FR")}`
  );
  revalidatePath("/programme");
  revalidatePath("/accueil");
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
  revalidatePath("/accueil");
}

export async function supprimerAnnonce(annonceId: string) {
  const user = await exiger("COORDINATEUR");
  await prisma.annonce.delete({ where: { id: annonceId } });
  await journaliser(user.id, "ANNONCE_SUPPRIMEE", annonceId);
  revalidatePath("/annonces");
  revalidatePath("/accueil");
}

// ---------- Rapports quotidiens ----------

// Un rapport par encadrant et par journée de conférence. Un renvoi remplace le
// précédent : on corrige son rapport sans en créer un doublon. Les points sont
// recalculés à chaque enregistrement, jamais fournis par le navigateur.
export async function soumettreRapport(formData: FormData) {
  const user = await exiger("CONSEILLER");

  const jour = Number(formData.get("jour"));
  const journee = await prisma.journeeConference.findUnique({ where: { numero: jour } });
  if (!journee) throw new Error("Journée de conférence inconnue.");

  const ambianceChoisie = String(formData.get("ambiance") ?? "");
  if (!AMBIANCES.some((a) => a.cle === ambianceChoisie)) {
    throw new Error("Indiquez d'abord l'ambiance de la journée.");
  }

  const aMarche = String(formData.get("aMarche") ?? "").trim().slice(0, 2000);
  const aAmeliorer = String(formData.get("aAmeliorer") ?? "").trim().slice(0, 2000);
  const besoinAide = formData.get("besoinAide") === "on";
  const detailAide = String(formData.get("detailAide") ?? "").trim().slice(0, 2000) || null;

  // Réponses : on ne conserve que les questions du modèle visibles pour ce rôle,
  // pour qu'un formulaire trafiqué n'introduise pas de champ arbitraire.
  const brut = lireReponses(String(formData.get("reponses") ?? "{}"));
  // Les questions oui/non rangent leur précision sous « <id>_precision » : elle
  // fait partie de la réponse et doit être conservée.
  const autorisees = new Set(
    sectionsPour(user.role)
      .flatMap((s) => s.questions)
      .flatMap((q) => [q.id, `${q.id}_precision`])
  );
  const reponses: Record<string, unknown> = {};
  for (const [cle, valeur] of Object.entries(brut)) {
    if (!autorisees.has(cle)) continue;
    if (Array.isArray(valeur)) reponses[cle] = valeur.map((v) => String(v).slice(0, 300));
    else if (valeur && typeof valeur === "object") {
      reponses[cle] = Object.fromEntries(
        Object.entries(valeur as Record<string, unknown>).map(([k, v]) => [
          k.slice(0, 200),
          String(v).slice(0, 200),
        ])
      );
    } else reponses[cle] = String(valeur ?? "").slice(0, 2000);
  }

  // Photos. Deux formes possibles, selon que Cloudinary est configuré :
  //   - « cloudinary:<publicId>:<largeur>:<hauteur> » quand le navigateur a
  //     envoyé la photo directement à Cloudinary ;
  //   - une data URL, ancien mode conservé comme repli.
  const photos = formData
    .getAll("photos")
    .map((p) => String(p))
    .map((p) => {
      if (p.startsWith("cloudinary:")) {
        const [, publicId, largeur, hauteur] = p.split(":");
        // Un identifiant hors du dossier de l'application est refusé : sinon un
        // formulaire trafiqué ferait pointer une photo vers un autre fichier du
        // compte Cloudinary.
        if (!publicId || !publicIdValide(publicId)) return null;
        return {
          publicId,
          largeur: Number(largeur) || null,
          hauteur: Number(hauteur) || null,
          image: null,
        };
      }
      if (p.startsWith("data:image/") && p.length < 900_000) {
        return { publicId: null, largeur: null, hauteur: null, image: p };
      }
      return null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .slice(0, 2);

  // État avant enregistrement : sert à distinguer un premier envoi d'une
  // correction, et à accorder le bonus de série.
  const [veille, precedent] = await Promise.all([
    jour > 0
      ? prisma.rapportQuotidien.findFirst({
          where: { auteurId: user.id, jour: jour - 1 },
          select: { id: true },
        })
      : null,
    prisma.rapportQuotidien.findUnique({
      where: { auteurId_jour: { auteurId: user.id, jour } },
      select: { points: true },
    }),
  ]);

  const { total } = calculerPoints({
    aMarche,
    aAmeliorer,
    nbPhotos: photos.length,
    reponses,
    heure: new Date().getHours(),
    veilleRemise: Boolean(veille),
  });

  const donnees = {
    jour,
    date: journee.date,
    ambiance: ambianceChoisie,
    reponses: JSON.stringify(reponses),
    aMarche,
    aAmeliorer,
    besoinAide,
    detailAide: besoinAide ? detailAide : null,
    points: total,
  };

  const rapport = await prisma.rapportQuotidien.upsert({
    where: { auteurId_jour: { auteurId: user.id, jour } },
    update: donnees,
    create: { ...donnees, auteurId: user.id },
  });

  // Les photos sont remplacées en bloc : le formulaire renvoie toujours l'état
  // complet de la sélection. Celles qui ne sont plus là sont aussi supprimées
  // chez Cloudinary, pour ne pas y accumuler des fichiers orphelins.
  const avant = await prisma.photoRapport.findMany({
    where: { rapportId: rapport.id },
    select: { publicId: true },
  });
  const gardees = new Set(photos.map((p) => p.publicId).filter(Boolean));
  const aSupprimer = avant
    .map((p) => p.publicId)
    .filter((id): id is string => Boolean(id) && !gardees.has(id));

  await prisma.photoRapport.deleteMany({ where: { rapportId: rapport.id } });
  if (photos.length > 0) {
    await prisma.photoRapport.createMany({
      data: photos.map((p) => ({ rapportId: rapport.id, ...p })),
    });
  }
  await supprimerPhotos(aSupprimer);

  await journaliser(
    user.id,
    "RAPPORT_SOUMIS",
    `Jour ${jour} — ambiance ${ambianceChoisie}, ${total} points${besoinAide ? ", demande d'aide" : ""}`
  );

  const cumul = await prisma.rapportQuotidien.aggregate({
    where: { auteurId: user.id },
    _sum: { points: true },
  });

  revalidatePath("/rapports");
  revalidatePath("/rapports/final");
  revalidatePath("/accueil");
  // Renvoyé au formulaire pour la fenêtre de félicitations : calculé ici, car
  // la revalidation rend les props du composant obsolètes au même instant.
  return {
    points: total,
    jour,
    cree: precedent === null,
    total: cumul._sum.points ?? total,
  };
}

export async function supprimerRapport(rapportId: string) {
  const user = await exiger("CONSEILLER");
  const rapport = await prisma.rapportQuotidien.findUniqueOrThrow({
    where: { id: rapportId },
    include: { photos: { select: { publicId: true } } },
  });
  // Chacun supprime le sien ; les coordinateurs peuvent supprimer un doublon.
  if (rapport.auteurId !== user.id && !roleAuMoins(user.role, "COORDINATEUR")) {
    throw new Error("Vous ne pouvez supprimer que vos propres rapports.");
  }
  await prisma.rapportQuotidien.delete({ where: { id: rapportId } });
  await supprimerPhotos(
    rapport.photos.map((p) => p.publicId).filter((id): id is string => Boolean(id))
  );
  await journaliser(user.id, "RAPPORT_SUPPRIME", `Jour ${rapport.jour}`);
  revalidatePath("/rapports");
  revalidatePath("/rapports/final");
}

// Rattache un coordinateur adjoint à une compagnie. Les listes officielles
// donnent les rôles, pas les affectations : celles-ci se décident dans
// l'application, une fois les présences confirmées.
export async function affecterCompagnie(userId: string, compagnieId: string | null) {
  const user = await exiger("COORDINATEUR");
  const cible = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (cible.role !== "ADJOINT") {
    throw new Error("Seuls les coordinateurs adjoints dirigent une compagnie.");
  }
  const compagnie = compagnieId
    ? await prisma.compagnie.findUniqueOrThrow({ where: { id: compagnieId } })
    : null;
  await prisma.user.update({ where: { id: userId }, data: { compagnieId } });
  await journaliser(
    user.id,
    "AFFECTATION_COMPAGNIE",
    `${cible.prenom} ${cible.nom} → ${compagnie?.nom ?? "aucune compagnie"}`
  );
  revalidatePath("/admin");
  revalidatePath("/organigramme");
}

// Paramètres signés permettant au navigateur d'envoyer une photo directement à
// Cloudinary. La signature est courte (Cloudinary refuse un horodatage trop
// ancien), on la demande donc au moment de choisir la photo.
export async function demanderSignaturePhoto() {
  await exiger("CONSEILLER");
  return signerEnvoi();
}

// ---------- Attestations d'encadrement ----------

// Délivre les attestations à tous ceux que le couple dirigeant encadre :
// coordinateurs principaux, adjoints et conseillers. Le couple lui-même en est
// exclu — il délivre, il ne s'auto-atteste pas.
//
// Les faits sont figés au moment de la délivrance : l'attestation ne doit pas
// changer si les données évoluent ensuite. Quelqu'un qui en a déjà une la garde.
export async function delivrerAttestations() {
  const user = await exiger("DIRIGEANT");

  const candidats = await prisma.user.findMany({
    where: {
      role: { in: [...ROLES_ATTESTABLES] },
      actif: true,
      valide: true,
      attestation: null,
    },
    include: {
      compagnie: { select: { nom: true } },
      groupesDiriges: { select: { nom: true, _count: { select: { jeunes: true } } } },
      rapports: { select: { points: true } },
      affectationsCars: { include: { car: { select: { nom: true } } } },
      _count: { select: { mouvementsValides: true } },
    },
  });

  // Ampleur réelle de la conférence, relevée une fois pour toute la remise.
  const [participants, encadrants, unites] = await Promise.all([
    prisma.jeune.count({ where: { statutInscription: { not: STATUT_ANNULE } } }),
    prisma.user.count({
      where: { role: { in: [...ROLES_ATTESTABLES] }, actif: true, valide: true },
    }),
    prisma.pieu.count(),
  ]);

  let delivrees = 0;
  const parMention: Record<string, number> = { EXCELLENCE: 0, RIGUEUR: 0, SANS: 0 };

  for (const c of candidats) {
    const faits = {
      nomComplet: `${c.prenom} ${c.nom}`,
      groupes: c.groupesDiriges.map((g) => g.nom),
      compagnie: c.compagnie?.nom ?? null,
      jeunesEncadres: c.groupesDiriges.reduce((n, g) => n + g._count.jeunes, 0),
      rapportsRemis: c.rapports.length,
      rapportsPossibles: RAPPORTS_POSSIBLES,
      points: c.rapports.reduce((n, r) => n + r.points, 0),
      pointagesValides: c._count.mouvementsValides,
      responsabilitesCars: c.affectationsCars.map(
        (a) => `${a.car.nom} — ${etapeCar(a.etape)?.label ?? a.etape}`
      ),
      participants,
      encadrants,
      unites,
    };
    const m = calculerMention(faits.rapportsRemis, faits.points);

    // Le code est unique en base. Une collision est très improbable (31^8), mais
    // si elle survenait elle ferait échouer toute la remise : on retire plutôt.
    let code = codeDepuisOctets(randomBytes(8));
    for (let essai = 0; essai < 5; essai++) {
      if (!(await prisma.attestation.findUnique({ where: { code } }))) break;
      code = codeDepuisOctets(randomBytes(8));
    }

    await prisma.attestation.create({
      data: {
        code,
        userId: c.id,
        role: c.role,
        mention: m,
        faits: JSON.stringify(faits),
        delivreeParId: user.id,
      },
    });
    delivrees++;
    parMention[m ?? "SANS"]++;
  }

  await journaliser(
    user.id,
    "ATTESTATIONS_DELIVREES",
    `${delivrees} attestations — ${parMention.EXCELLENCE} excellence, ${parMention.RIGUEUR} rigueur, ${parMention.SANS} sans mention`
  );
  revalidatePath("/attestations");
  revalidatePath("/attestation");
  return { delivrees, parMention };
}

// Une attestation délivrée par erreur est révoquée, jamais effacée : la page de
// vérification doit pouvoir répondre « ce document n'est plus valable » plutôt
// que « code inconnu », qui laisserait croire à une faute de frappe.
export async function revoquerAttestation(id: string, motif: string) {
  const user = await exiger("DIRIGEANT");
  const a = await prisma.attestation.findUniqueOrThrow({
    where: { id },
    include: { user: { select: { prenom: true, nom: true } } },
  });
  await prisma.attestation.update({
    where: { id },
    data: { revoqueeLe: new Date(), motifRevocation: motif.trim() || "Non précisé" },
  });
  await journaliser(
    user.id,
    "ATTESTATION_REVOQUEE",
    `${a.user.prenom} ${a.user.nom} (${a.code}) — ${motif}`
  );
  revalidatePath("/attestations");
}

// ---------- Remise à zéro après les essais ----------


// Réservée au couple dirigeant : c'est une action irréversible. Les comptes, les
// jeunes, les groupes, les compagnies et le programme officiel ne sont jamais
// touchés — seules les données produites pendant les essais le sont.
export async function remiseAZero(choix: string[], confirmation: string) {
  const user = await exiger("DIRIGEANT");
  if (confirmation.trim().toUpperCase() !== "EFFACER") {
    throw new Error("Tapez EFFACER pour confirmer.");
  }
  const valides = choix.filter((c) =>
    CHOSES_A_EFFACER.some((x) => x.cle === c)
  ) as ChoseAEffacer[];
  if (valides.length === 0) throw new Error("Choisissez au moins un élément à effacer.");

  const compte: Record<string, number> = {};
  const a = (c: ChoseAEffacer) => valides.includes(c);

  if (a("rapports")) {
    // Les photos partent avec le rapport (suppression en cascade en base) ;
    // celles qui sont chez Cloudinary sont retirées d'abord.
    const photos = await prisma.photoRapport.findMany({
      where: { publicId: { not: null } },
      select: { publicId: true },
    });
    await supprimerPhotos(photos.map((p) => p.publicId!).filter(Boolean));
    compte.rapports = (await prisma.rapportQuotidien.deleteMany()).count;
  }
  if (a("pointages")) compte.pointages = (await prisma.mouvement.deleteMany()).count;
  if (a("affectationsCars")) {
    compte.affectationsCars = (await prisma.affectationCar.deleteMany()).count;
  }
  if (a("conseillers")) {
    compte.conseillers = (
      await prisma.groupe.updateMany({
        where: { conseillerId: { not: null } },
        data: { conseillerId: null },
      })
    ).count;
  }
  if (a("adjoints")) {
    compte.adjoints = (
      await prisma.user.updateMany({
        where: { compagnieId: { not: null } },
        data: { compagnieId: null },
      })
    ).count;
  }
  if (a("programme")) {
    compte.propositions = (await prisma.modificationProgramme.deleteMany()).count;
    // Seules les activités ajoutées à la main partent ; celles du programme
    // officiel sont marquées à l'amorçage et retrouvent leur statut d'origine.
    const ajoutees = await prisma.activite.findMany({
      where: { officielle: false },
      select: { id: true },
    });
    await prisma.activiteGroupe.deleteMany({
      where: { activiteId: { in: ajoutees.map((x) => x.id) } },
    });
    compte.activitesAjoutees = (
      await prisma.activite.deleteMany({ where: { officielle: false } })
    ).count;
    compte.activitesRetablies = (
      await prisma.activite.updateMany({
        where: { officielle: true, statut: { in: ["MODIFIE", "ANNULE"] } },
        data: { statut: "PLANIFIE" },
      })
    ).count;
  }
  if (a("annonces")) {
    compte.annonces = (await prisma.annonce.deleteMany({ where: { automatique: false } })).count;
  }
  if (a("attestations")) {
    compte.attestations = (await prisma.attestation.deleteMany()).count;
  }
  if (a("audit")) {
    compte.audit = (await prisma.auditLog.deleteMany()).count;
  }

  await journaliser(
    user.id,
    "REMISE_A_ZERO",
    Object.entries(compte)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ") || "aucune donnée"
  );
  for (const chemin of ["/accueil", "/cars", "/groupes", "/programme", "/annonces", "/rapports", "/rapports/final", "/admin", "/organigramme"]) {
    revalidatePath(chemin);
  }
  return compte;
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

/** Accorde ou retire un droit nominatif. Réservé au couple dirigeant. */
export async function basculerDroit(userId: string, droit: Droit) {
  const user = await exiger("DIRIGEANT");
  if (!(droit in DROITS)) throw new Error("Droit inconnu.");

  const cible = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const droits = lireDroits(cible.droitsSupplementaires);
  const avait = droits.includes(droit);
  const apres = avait ? droits.filter((d) => d !== droit) : [...droits, droit];

  await prisma.user.update({
    where: { id: userId },
    data: { droitsSupplementaires: JSON.stringify(apres) },
  });
  await journaliser(
    user.id,
    avait ? "DROIT_RETIRE" : "DROIT_ACCORDE",
    `${droit} pour ${cible.prenom} ${cible.nom}`
  );
  revalidatePath("/admin");
  revalidatePath("/sante");
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
