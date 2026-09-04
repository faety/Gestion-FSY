"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";
import {
  creerSession,
  detruireSession,
  getUtilisateur,
  poserApercu,
  retirerApercu,
  ROLES_APERCU,
  type RoleApercu,
} from "./auth";
import { journaliser } from "./audit";
import {
  DROITS,
  lireDroits,
  peutModifierDirectement,
  roleAuMoins,
  voitToutesLesAlertes,
  type Droit,
  type Role,
} from "./roles";
import { ETAPES_VALIDES, etapeCar } from "./etapes-car";
import {
  AMBIANCES,
  LIBELLE_CLOTURE,
  calculerPoints,
  lireReponses,
  rapportsClos,
  sectionsPour,
} from "./rapports";
import { publicIdValide, signerEnvoi, supprimerPhotos } from "./cloudinary";
import { CHOSES_A_EFFACER, type ChoseAEffacer } from "./remise-a-zero";
import { STATUT_ANNULE } from "./criteres";
import { candidats, rapprochementBloquant } from "./rapprochement";
import { rapprocherJeunes } from "./rapprochement-jeunes";
import { renseignementUtile } from "./renseignements";
import { JOURNEES, PROGRAMME, type ActiviteSeed } from "../../prisma/programme-fsy2026";
import { dateDuJour } from "./theme";
import { CLE_ACCES_RESTREINTS } from "./reglages";
import {
  LIMITES_NOM,
  etatDemandeNom,
  nomComplet,
  verifierDemandeNom,
  type SaisieNom,
} from "./noms";
import {
  apparier,
  extraireFiches,
  lireClasseur,
  reconnaitreColonnes,
  type Champ,
  type Correspondance,
} from "./import-inscriptions";
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
import { transfererReferences } from "./fusion";
import { calculerPlan, type ParametresReorganisation } from "./reorganisation";
import {
  ROLES_ATTESTABLES,
  RAPPORTS_POSSIBLES,
  SIGNATAIRES,
  calculerMention,
  codeDepuisOctets,
  lireFaits,
  modeleValide,
} from "./attestations";
import {
  EFFECTIFS_FINAUX,
  chiffresPropres,
  genreValide,
  lignesPrecisions,
  lireFaitsTiers,
  natureValide,
  objetEnChaine as objetEnChaineTiers,
  objetPropose as objetProposeTiers,
} from "./attestations-tierces";

async function exiger(minimum: "DIRIGEANT" | "COORDINATEUR" | "ADJOINT" | "CONSEILLER") {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  // En mode aperçu, on regarde — on n'agit pas : une action passée pendant
  // l'aperçu serait attribuée au dirigeant en train d'observer, pas au rôle
  // qu'il incarne, et fausserait rapports et journaux.
  if (user.apercu) {
    throw new Error("Mode aperçu : l'application est en lecture seule.");
  }
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
    // Le même interrupteur porte deux gestes très différents : « marquer
    // absent » à la réorganisation, et la désactivation d'un compte dans
    // l'administration. Le premier est de loin le plus fréquent, et le message
    // d'origine — « ce compte a été désactivé » — envoyait la personne croire
    // qu'on lui avait retiré son accès. Il dit maintenant les deux causes, et
    // surtout où l'on répare : la fiche de la personne, page Administration.
    return {
      erreur:
        "Ce compte est marqué absent ou désactivé — c'est pourquoi la connexion est refusée. " +
        "Demandez à un coordinateur principal de vous rechercher dans Administration " +
        "(par votre nom ou cette adresse) et de « Rétablir l'accès ».",
    };
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

// ---------- Préparation de la conférence ----------
//
// Le guide de planification fixe des jalons et un comité logistique que
// l'application ne portait pas. Elle ne connaissait que les six jours ; or ce
// qui se joue maintenant, c'est ce qui précède — d'autant que la conférence est
// reportée et que tout le travail de préparation reprend.

/** Cocher ou décocher un jalon du calendrier de préparation. */
export async function basculerTachePreparation(cle: string, note?: string | null) {
  const auteur = await exiger("COORDINATEUR");
  const avant = await prisma.tachePreparation.findUnique({ where: { cle } });
  const faite = !avant?.faite;
  await prisma.tachePreparation.upsert({
    where: { cle },
    create: {
      cle,
      faite,
      faitLe: faite ? new Date() : null,
      faitParId: faite ? auteur.id : null,
      note: note ?? null,
    },
    update: {
      faite,
      faitLe: faite ? new Date() : null,
      faitParId: faite ? auteur.id : null,
      ...(note === undefined ? {} : { note }),
    },
  });
  await journaliser(auteur.id, faite ? "PREPARATION_FAITE" : "PREPARATION_ROUVERTE", cle);
  revalidatePath("/preparation");
  return { ok: true as const, faite };
}

/** Note libre attachée à un jalon : où en est-on, qui a été relancé. */
export async function noterTachePreparation(cle: string, note: string) {
  const auteur = await exiger("COORDINATEUR");
  const propre = note.trim() || null;
  await prisma.tachePreparation.upsert({
    where: { cle },
    create: { cle, note: propre },
    update: { note: propre },
  });
  await journaliser(auteur.id, "PREPARATION_ANNOTEE", cle);
  revalidatePath("/preparation");
  return { ok: true as const };
}

/**
 * Confier une responsabilité du comité logistique.
 *
 * La personne n'a pas forcément de compte : l'administrateur des repas peut
 * être le gestionnaire de la cafétéria du site. Un nom et un téléphone libres
 * suffisent donc, et c'est souvent tout ce qu'on a.
 */
export async function confierResponsabilite(
  cle: string,
  donnees: { userId?: string | null; nom?: string | null; telephone?: string | null; note?: string | null }
) {
  const auteur = await exiger("COORDINATEUR");
  const userId = donnees.userId?.trim() || null;
  const valeurs = {
    userId,
    // Un compte lié porte déjà le nom et le numéro : les redoubler ferait deux
    // vérités possibles, dont une périmée.
    nom: userId ? null : donnees.nom?.trim() || null,
    telephone: userId ? null : donnees.telephone?.trim() || null,
    note: donnees.note?.trim() || null,
  };
  await prisma.responsabilite.upsert({
    where: { cle },
    create: { cle, ...valeurs },
    update: valeurs,
  });
  await journaliser(auteur.id, "RESPONSABILITE_CONFIEE", `${cle} → ${valeurs.nom ?? userId ?? "personne"}`);
  revalidatePath("/preparation");
  revalidatePath("/organigramme");
  return { ok: true as const };
}

// ---------- Programme officiel : rôles attendus par niveau ----------
//
// Le programme est semé une fois, à la création de la base. Corriger le fichier
// de référence ne change donc rien à une base déjà remplie — et c'est le cas de
// la production. Cette action rejoue la référence sur les activités officielles
// déjà présentes : les quatre rôles attendus, et les horaires. Ni les titres,
// ni les lieux, ni les activités ajoutées sur place n'y sont touchés.
//
// Les horaires comptent autant que les rôles depuis que la conférence a été
// déplacée du 3-8 août au 24-29 août : la base gardait les anciennes dates, et
// le programme affichait une conférence qui n'aurait pas lieu.
//
// L'appariement se fait par titre puis par ordre chronologique, et non par
// horodatage : quatorze activités s'appellent « Rassemblement en compagnie |
// Appel », les deux listes sont dans le même ordre, et comparer des dates
// construites en heure locale à des dates relues ailleurs serait fragile.

export type BilanProgramme = {
  ok: true;
  misAJour: number;
  datesDeplacees: number;
  inchangees: number;
  details: { titre: string; jour: number; heure: string; avant: string; apres: string }[];
  ignores: string[];
};

export async function resynchroniserProgramme(): Promise<BilanProgramme | Refus> {
  const auteur = await exiger("COORDINATEUR");

  const enBase = await prisma.activite.findMany({
    where: { officielle: true },
    orderBy: { debut: "asc" },
    select: {
      id: true,
      titre: true,
      debut: true,
      fin: true,
      roleConseiller: true,
      roleAdjoint: true,
      roleCoordinateur: true,
      roleDirigeant: true,
    },
  });
  if (enBase.length === 0) {
    return { ok: false, motif: "Aucune activité officielle en base : le programme n'a pas été semé." };
  }

  const parTitre = new Map<string, typeof enBase>();
  for (const a of enBase) {
    const l = parTitre.get(a.titre) ?? [];
    l.push(a);
    parTitre.set(a.titre, l);
  }
  const attendues = new Map<string, ActiviteSeed[]>();
  for (const a of PROGRAMME) {
    const l = attendues.get(a.titre) ?? [];
    l.push(a);
    attendues.set(a.titre, l);
  }

  const details: BilanProgramme["details"] = [];
  const ignores: string[] = [];
  let inchangees = 0;
  let datesDeplacees = 0;
  const jourFr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

  for (const [titre, reference] of attendues) {
    const trouvees = parTitre.get(titre);
    // Un titre dont le nombre d'occurrences ne correspond plus a été modifié
    // sur place : on n'y touche pas, et on le dit plutôt que de deviner.
    if (!trouvees || trouvees.length !== reference.length) {
      ignores.push(`${titre} (${reference.length} attendues, ${trouvees?.length ?? 0} en base)`);
      continue;
    }
    for (let i = 0; i < reference.length; i++) {
      const ref = reference[i];
      const r = ref.r ?? ["ASSISTER", "ASSISTER", "ASSISTER", "FACULTATIF"];
      const a = trouvees[i];
      const avant = [a.roleConseiller, a.roleAdjoint, a.roleCoordinateur, a.roleDirigeant];
      const rolesAChanger = avant.join("|") !== r.join("|");

      const debut = dateDuJour(ref.jour, ref.debut);
      const fin = ref.fin ? dateDuJour(ref.jour, ref.fin) : null;
      const datesAChanger =
        a.debut.getTime() !== debut.getTime() ||
        (a.fin?.getTime() ?? null) !== (fin?.getTime() ?? null);

      if (!rolesAChanger && !datesAChanger) {
        inchangees++;
        continue;
      }
      await prisma.activite.update({
        where: { id: a.id },
        data: {
          roleConseiller: r[0],
          roleAdjoint: r[1],
          roleCoordinateur: r[2],
          roleDirigeant: r[3],
          debut,
          fin,
        },
      });
      if (datesAChanger) datesDeplacees++;
      details.push({
        titre,
        jour: ref.jour,
        heure: ref.debut,
        avant: datesAChanger ? jourFr.format(a.debut) : avant.join(" / "),
        apres: datesAChanger ? jourFr.format(debut) : r.join(" / "),
      });
    }
  }

  // Les journées portent les tenues et servent de repère au programme : elles
  // doivent suivre le même décalage, sinon le jour 1 s'affiche à une date et
  // ses activités à une autre.
  for (const j of JOURNEES) {
    const date = dateDuJour(j.numero);
    await prisma.journeeConference.upsert({
      where: { numero: j.numero },
      update: { date },
      create: {
        numero: j.numero,
        date,
        tenue: j.tenue,
        tenueEncadrants: j.tenueEncadrants,
        note: j.note,
      },
    });
  }

  if (details.length > 0) {
    await journaliser(
      auteur.id,
      "PROGRAMME_RESYNCHRONISE",
      `${details.length} activités remises sur la référence (${datesDeplacees} horaires déplacés)`
    );
  }
  revalidatePath("/programme");
  revalidatePath("/accueil");
  return {
    ok: true,
    misAJour: details.length,
    datesDeplacees,
    inchangees,
    details: details.slice(0, 40),
    ignores,
  };
}

// ---------- Renseignements médicaux et alimentaires ----------
//
// Ces renseignements viennent normalement du fichier d'inscription, chargé par
// scripts/importer-sensibles.ts depuis data/ — un dossier qui n'est ni versionné
// ni déployé, parce qu'il concerne la santé de mineurs. Conséquence : sur une
// base de production toute neuve, ils n'y sont pas, et la page Santé reste vide
// alors que l'encadrement les attend.
//
// D'où cette saisie depuis l'application. Elle ne remplace pas l'import — qui
// reste la voie normale pour six cents fiches — mais elle permet d'entrer les
// quelques dizaines de cas connus sans machine, sans fichier et sans accès à la
// base, ce qui est exactement la situation la veille d'une conférence.

async function exigerBienEtre() {
  const user = await getUtilisateur();
  if (!user) redirect("/login");
  if (!voitToutesLesAlertes(user)) {
    throw new Error("Réservé au bien-être, aux coordinateurs principaux et au couple dirigeant.");
  }
  return user;
}

/** Un refus dit pourquoi. En production, une exception ne le dirait pas. */
export type Refus = { ok: false; motif: string };

export type ApercuImport = {
  ok: true;
  applique: boolean;
  feuille: string;
  entetes: string[];
  colonnes: { champ: Champ; libelle: string | null }[];
  lues: number;
  apparies: number;
  parLaDate: number;
  ambigus: { nom: string; concurrents: string[] }[];
  introuvables: string[];
  aEcrire: { medical: number; alimentaire: number; contacts: number; telephone: number };
  ecrits: number;
  echantillon: { nom: string; medical: string | null; alimentaire: string | null }[];
};

const LIBELLES_CHAMPS: Record<Champ, string> = {
  prenom: "Prénom",
  nom: "Nom",
  naissance: "Date de naissance",
  telephone: "Téléphone du jeune",
  email: "Adresse e-mail",
  medical: "Renseignement médical",
  alimentaire: "Contrainte alimentaire",
  contactNom: "Contact d'urgence — nom",
  contactTelephone: "Contact d'urgence — téléphone",
};

// Un fichier "use server" ne peut exporter que des fonctions asynchrones :
// cette liste reste interne, et le formulaire porte la sienne.
const CHAMPS_IMPORT = (Object.keys(LIBELLES_CHAMPS) as Champ[]).map((c) => ({
  champ: c,
  libelle: LIBELLES_CHAMPS[c],
}));

/**
 * Verser le fichier d'inscription dans la base.
 *
 * Le fichier est lu en mémoire et n'est écrit nulle part : ni sur le disque du
 * serveur, ni dans le dépôt. Seules les colonnes reconnues sont reprises, et un
 * premier passage montre ce qui serait fait avant que quoi que ce soit le soit —
 * six cent cinquante fiches médicales de mineurs ne s'écrasent pas à l'aveugle.
 *
 * Rien n'est jamais effacé : une cellule vide laisse en place ce que la base
 * contenait déjà. Un export partiel ne peut donc pas faire disparaître une
 * allergie connue.
 */
export async function importerInscriptions(donnees: FormData): Promise<ApercuImport | Refus> {
  const auteur = await exigerBienEtre();
  const fichier = donnees.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { ok: false, motif: "Choisissez le fichier d'inscription (.xlsx ou .csv)." };
  }
  if (fichier.size > 11 * 1024 * 1024) {
    return { ok: false, motif: "Fichier trop lourd (11 Mo au maximum)." };
  }

  let tableau;
  try {
    tableau = await lireClasseur(Buffer.from(await fichier.arrayBuffer()), fichier.name);
  } catch (e) {
    return {
      ok: false,
      motif:
        "Fichier illisible : " +
        (e instanceof Error ? e.message : "format inattendu") +
        ". Enregistrez-le au format .xlsx ou .csv et réessayez.",
    };
  }

  // La reconnaissance automatique se laisse corriger : un en-tête inattendu ne
  // doit pas bloquer la veille du départ.
  const colonnes: Correspondance = reconnaitreColonnes(tableau.entetes);
  for (const { champ } of CHAMPS_IMPORT) {
    const choisi = donnees.get(`col_${champ}`);
    if (typeof choisi === "string" && choisi !== "") {
      const i = Number(choisi);
      if (i === -1) delete colonnes[champ];
      else if (Number.isInteger(i) && i >= 0 && i < tableau.entetes.length) colonnes[champ] = i;
    }
  }
  if (colonnes.prenom === undefined && colonnes.nom === undefined) {
    return {
      ok: false,
      motif:
        "Aucune colonne de nom reconnue dans ce fichier. Désignez-la ci-dessous, " +
        "ou vérifiez que la première ligne du tableau porte bien les intitulés.",
    };
  }
  if (colonnes.medical === undefined && colonnes.alimentaire === undefined) {
    return {
      ok: false,
      motif:
        "Aucune colonne de santé ni d'alimentation reconnue : verser ce fichier " +
        "n'apporterait rien. Désignez-la ci-dessous si elle porte un intitulé inattendu.",
    };
  }

  const fiches = extraireFiches(tableau, colonnes);
  const jeunes = await prisma.jeune.findMany({
    where: { statutInscription: { not: STATUT_ANNULE } },
    select: { id: true, prenom: true, nom: true, dateNaissance: true, dateNaissanceBrute: true },
  });
  const appariements = apparier(
    fiches,
    jeunes.map((j) => ({
      id: j.id,
      prenom: j.prenom,
      nom: j.nom,
      naissance: j.dateNaissance?.toISOString().slice(0, 10) ?? j.dateNaissanceBrute,
    }))
  );

  const retenus = appariements.filter((a) => a.jeuneId);
  const porteurs = retenus.filter(
    (a) =>
      a.fiche.medical ||
      a.fiche.alimentaire ||
      a.fiche.contactNom ||
      a.fiche.contactTelephone ||
      a.fiche.telephone
  );

  const applique = donnees.get("appliquer") === "1";
  let ecrits = 0;
  if (applique) {
    for (const a of porteurs) {
      const f = a.fiche;
      // Une cellule vide n'efface rien : on ne retire jamais un renseignement
      // parce qu'il manquait dans un export.
      const data = {
        ...(f.medical ? { medical: f.medical } : {}),
        ...(f.alimentaire ? { alimentaire: f.alimentaire } : {}),
        ...(f.telephone ? { telephone: f.telephone } : {}),
        ...(f.email ? { email: f.email } : {}),
        ...(f.contactNom ? { contactNom: f.contactNom } : {}),
        ...(f.contactTelephone ? { contactTelephone: f.contactTelephone } : {}),
      };
      if (Object.keys(data).length === 0) continue;
      await prisma.jeune.update({ where: { id: a.jeuneId! }, data });
      ecrits++;
    }
    // Le journal compte, il ne détaille pas : ni les noms, ni les pathologies
    // n'ont leur place dans une liste que tous les coordinateurs peuvent lire.
    await journaliser(
      auteur.id,
      "IMPORT_RENSEIGNEMENTS",
      `${ecrits} fiches complétées sur ${fiches.length} lignes lues`
    );
    revalidatePath("/sante");
    revalidatePath("/jeunes");
    revalidatePath("/cars");
  }

  return {
    ok: true,
    applique,
    feuille: tableau.feuille,
    entetes: tableau.entetes,
    colonnes: CHAMPS_IMPORT.map(({ champ }) => ({
      champ,
      libelle: colonnes[champ] === undefined ? null : (tableau.entetes[colonnes[champ]!] ?? `colonne ${colonnes[champ]! + 1}`),
    })),
    lues: fiches.length,
    apparies: retenus.length,
    parLaDate: retenus.filter((a) => a.sur === "date").length,
    ambigus: appariements
      .filter((a) => a.sur === "ambigu")
      .slice(0, 10)
      .map((a) => ({
        nom: `${a.fiche.prenom} ${a.fiche.nom}`.trim(),
        concurrents: a.concurrents ?? [],
      })),
    introuvables: appariements
      .filter((a) => a.sur === "introuvable")
      .slice(0, 15)
      .map((a) => `${a.fiche.prenom} ${a.fiche.nom}`.trim()),
    aEcrire: {
      medical: retenus.filter((a) => a.fiche.medical).length,
      alimentaire: retenus.filter((a) => a.fiche.alimentaire).length,
      contacts: retenus.filter((a) => a.fiche.contactNom || a.fiche.contactTelephone).length,
      telephone: retenus.filter((a) => a.fiche.telephone).length,
    },
    ecrits,
    echantillon: retenus
      .filter((a) => a.fiche.medical || a.fiche.alimentaire)
      .slice(0, 12)
      .map((a) => ({
        nom: a.jeuneNom ?? "",
        medical: a.fiche.medical,
        alimentaire: a.fiche.alimentaire,
      })),
  };
}

/** Corriger — ou effacer — le renseignement d'un seul jeune. */
export async function modifierRenseignementJeune(
  jeuneId: string,
  medical: string | null,
  alimentaire: string | null
) {
  const auteur = await exigerBienEtre();
  const avant = await prisma.jeune.findUniqueOrThrow({
    where: { id: jeuneId },
    select: { prenom: true, nom: true },
  });
  await prisma.jeune.update({
    where: { id: jeuneId },
    data: {
      medical: renseignementUtile(medical),
      alimentaire: renseignementUtile(alimentaire),
    },
  });
  await journaliser(
    auteur.id,
    "RENSEIGNEMENT_CORRIGE",
    `${avant.prenom} ${avant.nom}`
  );
  revalidatePath("/sante");
  revalidatePath("/jeunes");
  return { ok: true as const };
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
  const motDePasse = String(formData.get("motDePasse") ?? "");

  // L'appel ne se déclare pas soi-même. Plusieurs personnes se sont inscrites
  // comme coordinateur adjoint sans l'être — de bonne foi, le formulaire le
  // proposait. Chacun entre donc comme conseiller, et les coordinateurs
  // principaux corrigent depuis l'administration ceux qui exercent un autre
  // appel. Un rôle qu'on s'attribue soi-même n'est pas un rôle.
  const role = "CONSEILLER";

  if (!email.includes("@")) return { erreur: "Adresse électronique invalide." };
  if (!nom || !prenom) return { erreur: "Indiquez votre nom et votre prénom." };
  if (sexe !== "M" && sexe !== "F") return { erreur: "Indiquez si vous êtes un homme ou une femme." };
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
  // Comme pour la fusion : un refus se renvoie, pour que son motif parvienne
  // jusqu'à l'écran au lieu d'être effacé par le mode production.
  const refus = (motif: string) => ({ ok: false as const, motif });
  if (inscriptionId === compteId) return refus("Un compte ne se rattache pas à lui-même.");

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
    return refus(
      "Ce compte a déjà servi (rapports, groupe, pointages ou attestation). " +
        "Rattacher l'effacerait : utilisez plutôt « doublons possibles » plus bas, " +
        "qui réunit deux comptes sans rien perdre."
    );
  }
  if (!compte.valide) return refus("Le compte de destination n'est pas validé.");

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
  return { ok: true as const, nom: `${compte.prenom} ${compte.nom}`, email: inscription.email };
}

/**
 * Fondre deux comptes qui désignent la même personne.
 *
 * Le rattachement ne vaut que pour une inscription encore en attente, vide de
 * tout. Une fois la validation faite, le second compte vit sa vie : il reçoit
 * une photo, un téléphone, parfois un rapport — et il apparaît une deuxième
 * fois dans l'organigramme. Il faut alors non plus supprimer, mais réunir.
 *
 * Tout ce que porte le compte absorbé rejoint celui qu'on garde — groupes,
 * rapports, pointages, journal — et l'identifiant de connexion conservé est la
 * vraie adresse, d'où qu'elle vienne. Rien n'est effacé en silence : quand la
 * réunion ferait perdre quelque chose (deux rapports pour le même jour, deux
 * attestations délivrées), on refuse et on le dit.
 */
export async function fusionnerComptes(garderId: string, absorberId: string) {
  const auteur = await exiger("COORDINATEUR");
  // Les refus se renvoient, ils ne se lancent pas : en production, Next efface
  // le message d'une exception venue d'une action serveur, et l'écran
  // n'afficherait qu'« une erreur est survenue ». Or ici le message *est* la
  // réponse — il dit quoi faire avant de recommencer.
  const refus = (motif: string) => ({ ok: false as const, motif });
  if (garderId === absorberId) return refus("Un compte ne se fusionne pas avec lui-même.");

  const avec = {
    include: {
      groupesDiriges: { select: { nom: true } },
      rapports: { select: { jour: true } },
      attestation: { select: { id: true, code: true } },
      _count: { select: { mouvementsValides: true, affectationsCars: true } },
    },
  } as const;
  const [garde, absorbe] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: garderId }, ...avec }),
    prisma.user.findUniqueOrThrow({ where: { id: absorberId }, ...avec }),
  ]);

  // On ne scie pas la branche sur laquelle on est assis : absorber le compte
  // avec lequel on est connecté couperait la session en cours au milieu de
  // l'opération. Le sens inverse fait exactement la même chose, sans le risque.
  if (absorberId === auteur.id) {
    return refus("Vous êtes connecté avec ce compte : gardez celui-ci et absorbez l'autre.");
  }
  // Réunir deux comptes d'encadrement supérieur revient à décider qui dirige :
  // cela appartient au couple dirigeant.
  if (
    (roleAuMoins(garde.role, "COORDINATEUR") || roleAuMoins(absorbe.role, "COORDINATEUR")) &&
    auteur.role !== "DIRIGEANT"
  ) {
    return refus("Seul le couple dirigeant peut fusionner les comptes des coordinateurs principaux.");
  }

  const joursEnDouble = absorbe.rapports
    .map((r) => r.jour)
    .filter((j) => garde.rapports.some((r) => r.jour === j));
  if (joursEnDouble.length > 0) {
    return refus(
      `Les deux comptes ont un rapport pour ${
        joursEnDouble.length > 1 ? "les jours" : "le jour"
      } ${joursEnDouble.sort().join(", ")}. Fusionner en effacerait un : ` +
        "supprimez d'abord celui qui fait doublon, puis recommencez."
    );
  }
  if (garde.attestation && absorbe.attestation) {
    return refus(
      `Deux attestations ont été délivrées (${garde.attestation.code} et ` +
        `${absorbe.attestation.code}). Révoquez celle qui est en trop avant de fusionner.`
    );
  }

  // Quelle adresse permettra de se connecter ensuite ? La vraie, toujours : un
  // identifiant d'attente ne reçoit aucun message, donc pas même un lien de
  // mot de passe oublié. Avec elle vient son mot de passe — celui que la
  // personne a effectivement choisi.
  const reprendreIdentifiants =
    estAdresseDAttente(garde.email) && !estAdresseDAttente(absorbe.email);

  const droits = [
    ...new Set([...lireDroits(garde.droitsSupplementaires), ...lireDroits(absorbe.droitsSupplementaires)]),
  ];
  // On garde l'appel le plus élevé des deux : la fusion ne doit jamais faire
  // perdre un accès que la personne exerçait déjà sur l'un de ses comptes.
  const plusHaut = roleAuMoins(absorbe.role, garde.role as Role) ? absorbe.role : garde.role;

  await prisma.$transaction(async (tx) => {
    await transfererReferences(tx, absorberId, garderId);

    // Le compte absorbé disparaît avant la mise à jour : son adresse est unique
    // en base, et c'est peut-être elle qu'on va poser sur le compte gardé.
    await tx.user.delete({ where: { id: absorberId } });
    await tx.user.update({
      where: { id: garderId },
      data: {
        ...(reprendreIdentifiants
          ? {
              email: absorbe.email,
              passwordHash: absorbe.passwordHash,
              doitChangerMotDePasse: absorbe.doitChangerMotDePasse,
            }
          : {}),
        role: plusHaut,
        droitsSupplementaires: JSON.stringify(droits),
        // Ce que l'un a renseigné et l'autre pas se récupère : c'est du travail
        // déjà fait par la personne, il n'y a pas de raison de le perdre.
        telephone: garde.telephone ?? absorbe.telephone,
        photoPublicId: garde.photoPublicId ?? absorbe.photoPublicId,
        dateNaissance: garde.dateNaissance ?? absorbe.dateNaissance,
        pieuId: garde.pieuId ?? absorbe.pieuId,
        compagnieId: garde.compagnieId ?? absorbe.compagnieId,
        valide: true,
        actif: garde.actif || absorbe.actif,
      },
    });
  });

  const emailFinal = reprendreIdentifiants ? absorbe.email : garde.email;
  const consequences = [
    `connexion conservée : ${emailFinal}`,
    ...(reprendreIdentifiants ? ["avec le mot de passe choisi par la personne"] : []),
    ...(absorbe.groupesDiriges.length > 0
      ? [`groupe${absorbe.groupesDiriges.length > 1 ? "s" : ""} repris : ${absorbe.groupesDiriges.map((g) => g.nom).join(", ")}`]
      : []),
    ...(absorbe.rapports.length > 0 ? [`${absorbe.rapports.length} rapport(s) repris`] : []),
    ...(plusHaut !== garde.role ? [`appel relevé : ${plusHaut}`] : []),
    ...(!garde.photoPublicId && absorbe.photoPublicId ? ["photo reprise"] : []),
    ...(!garde.telephone && absorbe.telephone ? ["téléphone repris"] : []),
  ];

  await journaliser(
    auteur.id,
    "COMPTES_FUSIONNES",
    `${absorbe.prenom} ${absorbe.nom} (${absorbe.email}) fondu dans ${garde.prenom} ${garde.nom} — ${consequences.join(" ; ")}`
  );
  revalidatePath("/admin");
  revalidatePath("/organigramme");
  revalidatePath("/encadrement");
  return { ok: true as const, nom: `${garde.prenom} ${garde.nom}`, email: emailFinal, consequences };
}

/**
 * Valider ou refuser une inscription.
 *
 * Valider crée un accès de plus. Quand la personne figure déjà dans
 * l'encadrement — et c'est le cas le plus fréquent, puisque les listes
 * officielles ont été chargées avant que quiconque s'inscrive — ce n'est pas
 * ce qu'il faut faire : il faut rattacher, sinon elle se retrouve avec deux
 * comptes et son groupe reste sur l'ancien.
 *
 * Le conseil ne suffisait pas : il était écrit à l'écran, et les doublons sont
 * arrivés quand même. La validation refuse donc désormais d'elle-même tant
 * qu'un rapprochement net n'a pas été écarté explicitement. On ne bloque
 * personne — on demande de dire « ce n'est pas la même personne » plutôt que
 * de le supposer.
 */
export async function deciderInscription(
  userId: string,
  accepter: boolean,
  { malgreLeDoublon = false }: { malgreLeDoublon?: boolean } = {}
) {
  const auteur = await exiger("COORDINATEUR");
  const cible = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (accepter) {
    if (!malgreLeDoublon) {
      const equipe = await prisma.user.findMany({
        where: { valide: true },
        select: { id: true, prenom: true, nom: true, email: true, sexe: true, role: true },
      });
      const proches = candidats(cible, equipe).filter(rapprochementBloquant);
      if (proches.length > 0) {
        const noms = proches
          .slice(0, 3)
          .map((c) => `${c.compte.prenom} ${c.compte.nom} (${c.compte.email})`)
          .join(", ");
        return {
          ok: false as const,
          motif:
            `Un compte existe déjà pour ce nom : ${noms}. Rattachez l'inscription à ce compte ` +
            "— la personne garde son rôle et son groupe. S'il s'agit vraiment de quelqu'un " +
            "d'autre, dites-le explicitement ci-dessous.",
        };
      }
    }
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
    `${cible.prenom} ${cible.nom} (${cible.email})` +
      (accepter && malgreLeDoublon ? " — homonyme écarté, compte distinct assumé" : "")
  );
  revalidatePath("/admin");
  return { ok: true as const };
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
): Promise<string | null> {
  if (roleAuMoins(user.role, "COORDINATEUR")) return null;
  const affectations = await prisma.affectationCar.findMany({ where: { carId, etape } });
  if (affectations.length === 0) return null;
  if (affectations.some((a) => a.userId === user.id)) return null;
  return `Le pointage « ${etapeCar(etape)?.label ?? etape} » de ce car est confié à quelqu'un d'autre.`;
}

// Les refus se renvoient, ils ne se lancent pas : en production, Next efface
// le message d'une exception d'action serveur, et le pointeur lirait « une
// erreur est survenue » au lieu de « l'étape est clôturée ».
export type ResultatPointage = { ok: true } | { ok: false; motif: string };

async function etapeCloturee(carId: string, etape: string) {
  return prisma.clotureEtapeCar.findUnique({
    where: { carId_etape: { carId, etape } },
  });
}

export async function validerMouvement(
  jeuneId: string,
  carId: string,
  type: string
): Promise<ResultatPointage> {
  const user = await exiger("CONSEILLER");
  if (!ETAPES_VALIDES.includes(type)) return { ok: false, motif: "Étape invalide." };
  const refus = await verifierDroitDePointage(user, carId, type);
  if (refus) return { ok: false, motif: refus };
  if (await etapeCloturee(carId, type)) {
    return {
      ok: false,
      motif: "Cette étape est clôturée : plus rien ne s'y enregistre. Un coordinateur peut la rouvrir.",
    };
  }
  const jeune = await prisma.jeune.findUniqueOrThrow({ where: { id: jeuneId } });
  // Un double appui ne compte pas deux fois : un jeune n'a qu'un pointage par
  // étape et par car.
  const deja = await prisma.mouvement.findFirst({ where: { jeuneId, carId, type } });
  if (!deja) {
    await prisma.mouvement.create({
      data: { type, jeuneId, carId, valideParId: user.id },
    });
    await journaliser(
      user.id,
      `MOUVEMENT_${type}`,
      `${jeune.prenom} ${jeune.nom} (car ${carId})`
    );
  }
  revalidatePath(`/cars/${carId}`);
  revalidatePath("/cars");
  return { ok: true };
}

export async function annulerDernierMouvement(
  jeuneId: string,
  carId: string,
  type: string
): Promise<ResultatPointage> {
  const user = await exiger("CONSEILLER");
  const refus = await verifierDroitDePointage(user, carId, type);
  if (refus) return { ok: false, motif: refus };
  if (await etapeCloturee(carId, type)) {
    return {
      ok: false,
      motif: "Cette étape est clôturée : plus rien ne s'y modifie. Un coordinateur peut la rouvrir.",
    };
  }
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
  return { ok: true };
}

// ---------- Clôture d'une étape de pointage ----------

/**
 * Le pointeur affecté — ou un coordinateur — déclare l'étape terminée. Le
 * compte des jeunes pointés est figé à cet instant : c'est le résultat
 * officiel. Après clôture, plus aucun pointage ni annulation sur l'étape.
 */
export async function cloturerEtapeCar(carId: string, etape: string): Promise<ResultatPointage> {
  const user = await exiger("CONSEILLER");
  if (!ETAPES_VALIDES.includes(etape)) return { ok: false, motif: "Étape invalide." };
  const refus = await verifierDroitDePointage(user, carId, etape);
  if (refus) return { ok: false, motif: refus };
  if (await etapeCloturee(carId, etape)) {
    return { ok: false, motif: "Cette étape est déjà clôturée." };
  }
  const [car, distincts] = await Promise.all([
    prisma.car.findUniqueOrThrow({ where: { id: carId } }),
    prisma.mouvement.findMany({
      where: { carId, type: etape },
      distinct: ["jeuneId"],
      select: { jeuneId: true },
    }),
  ]);
  await prisma.clotureEtapeCar.create({
    data: { carId, etape, clotureParId: user.id, pointes: distincts.length },
  });
  await journaliser(
    user.id,
    "POINTAGE_CLOTURE",
    `${etapeCar(etape)?.label} de ${car.nom} — ${distincts.length} jeunes pointés`
  );
  revalidatePath(`/cars/${carId}`);
  revalidatePath("/cars");
  return { ok: true };
}

/** Rouvrir une étape clôturée : coordinateurs principaux et couple dirigeant. */
export async function rouvrirEtapeCar(carId: string, etape: string): Promise<ResultatPointage> {
  const user = await exiger("COORDINATEUR");
  const cloture = await etapeCloturee(carId, etape);
  if (!cloture) return { ok: false, motif: "Cette étape n'est pas clôturée." };
  const car = await prisma.car.findUniqueOrThrow({ where: { id: carId } });
  await prisma.clotureEtapeCar.delete({ where: { id: cloture.id } });
  await journaliser(
    user.id,
    "POINTAGE_ROUVERT",
    `${etapeCar(etape)?.label} de ${car.nom} — était clôturée à ${cloture.pointes} pointés`
  );
  revalidatePath(`/cars/${carId}`);
  revalidatePath("/cars");
  return { ok: true };
}

// ---------- Affectation du pointage des cars ----------

// Le couple dirigeant et les coordinateurs principaux désignent, pour chaque car
// et chaque étape, qui coche les noms des jeunes.
//
// Un seul pointeur à la fois : deux personnes qui cochent en même temps le même
// car, c'est un jeune compté deux fois ou zéro. Affecter quelqu'un d'autre
// REMPLACE donc le titulaire — l'ancien perd la main à l'instant, le nouveau
// continue le pointage là où il en est. Le journal garde la passation.
export async function affecterPointageCar(carId: string, etape: string, userId: string) {
  const user = await exiger("COORDINATEUR");
  if (!ETAPES_VALIDES.includes(etape)) throw new Error("Étape invalide");
  const [car, cible, anciens] = await Promise.all([
    prisma.car.findUniqueOrThrow({ where: { id: carId } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.affectationCar.findMany({ where: { carId, etape }, include: { user: true } }),
  ]);
  await prisma.$transaction([
    prisma.affectationCar.deleteMany({ where: { carId, etape, userId: { not: userId } } }),
    prisma.affectationCar.upsert({
      where: { carId_etape_userId: { carId, etape, userId } },
      update: {},
      create: { carId, etape, userId },
    }),
  ]);
  const remplaces = anciens.filter((a) => a.userId !== userId);
  await journaliser(
    user.id,
    "POINTAGE_AFFECTE",
    `${cible.prenom} ${cible.nom} → ${etapeCar(etape)?.label} de ${car.nom}` +
      (remplaces.length > 0
        ? ` (remplace ${remplaces.map((a) => `${a.user.prenom} ${a.user.nom}`).join(", ")})`
        : "")
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

// ---------- Réorganisation du jour 1 ----------
//
// La réalité du premier jour ne colle jamais au plan : moins de jeunes que
// prévu, des conseillers absents. Ces actions permettent au couple dirigeant
// et aux coordinateurs principaux de constater qui est là, puis de recomposer
// groupes et compagnies automatiquement (calcul dans lib/reorganisation.ts,
// stabilité d'abord), avec un instantané pris avant toute application pour
// pouvoir revenir en arrière.

// Présence d'un encadrant : l'interrupteur « présent / absent ». Jamais de
// suppression — un absent est masqué partout et ne peut plus se connecter,
// mais tout revient s'il arrive finalement.
export async function basculerPresenceEncadrant(cibleId: string) {
  const user = await exiger("COORDINATEUR");
  const cible = await prisma.user.findUnique({ where: { id: cibleId } });
  if (!cible) return { ok: false as const, motif: "Compte introuvable." };
  if (cible.role === "DIRIGEANT") {
    return { ok: false as const, motif: "Le compte du couple dirigeant ne se désactive pas ici." };
  }
  if (cible.id === user.id) {
    return { ok: false as const, motif: "On ne se marque pas soi-même absent." };
  }
  // Un coordinateur principal marque la présence de ceux qu'il encadre —
  // conseillers et adjoints. La présence d'un collègue coordinateur relève du
  // couple dirigeant.
  if (user.role !== "DIRIGEANT" && cible.role === "COORDINATEUR") {
    return {
      ok: false as const,
      motif: "La présence d'un coordinateur principal est réservée au couple dirigeant.",
    };
  }
  const actif = !cible.actif;
  await prisma.user.update({ where: { id: cibleId }, data: { actif } });
  await journaliser(
    user.id,
    actif ? "ENCADRANT_PRESENT" : "ENCADRANT_ABSENT",
    `${cible.prenom} ${cible.nom} (${cible.role})`
  );
  for (const p of ["/reorganisation", "/organigramme", "/groupes", "/admin", "/attestations"]) {
    revalidatePath(p);
  }
  return { ok: true as const, actif };
}

// Présence d'un jeune constatée à la main — pour ceux arrivés par leurs
// propres moyens, sans pointage de car.
export async function marquerPresenceJeune(jeuneId: string, present: boolean) {
  const user = await exiger("COORDINATEUR");
  const jeune = await prisma.jeune.findUnique({ where: { id: jeuneId } });
  if (!jeune) return { ok: false as const, motif: "Jeune introuvable." };
  await prisma.jeune.update({ where: { id: jeuneId }, data: { presenceManuelle: present } });
  await journaliser(
    user.id,
    present ? "PRESENCE_MANUELLE" : "PRESENCE_MANUELLE_RETIREE",
    `${jeune.prenom} ${jeune.nom}`
  );
  revalidatePath("/reorganisation");
  return { ok: true as const };
}

// ════════════════════════════════════════════════════════════════════════════
//  L'appel du conseiller : son groupe, sur place
// ════════════════════════════════════════════════════════════════════════════

const PAGES_APPEL = ["/jeunes", "/reorganisation", "/groupes", "/accueil"];

// Le groupe dans lequel un conseiller agit. Un conseiller ne touche qu'aux
// siens ; s'il dirige plusieurs groupes, il précise lequel.
function groupeDuConseiller(
  user: { groupesDiriges: { id: string; sexe: string }[] },
  groupeId?: string
) {
  const groupes = user.groupesDiriges;
  if (groupes.length === 0) return null;
  if (groupeId) return groupes.find((g) => g.id === groupeId) ?? null;
  return groupes.length === 1 ? groupes[0] : null;
}

/**
 * L'appel : le conseiller marque chaque jeune de son groupe présent ou absent.
 *
 * L'absent apparaît barré — rien n'est supprimé, et cela se défait d'une
 * pression : l'enfant peut arriver le lendemain. Le constat du conseiller
 * prime sur le pointage du car : il est plus récent, et fait sur place.
 */
export async function constaterAppelJeune(jeuneId: string, present: boolean) {
  const user = await exiger("CONSEILLER");
  const jeune = await prisma.jeune.findUnique({ where: { id: jeuneId } });
  if (!jeune) return { ok: false as const, motif: "Jeune introuvable." };
  // Son groupe seulement — sauf pour la direction, qui peut corriger partout.
  const direction = roleAuMoins(user.role, "COORDINATEUR");
  if (!direction && !user.groupesDiriges.some((g) => g.id === jeune.groupeId)) {
    return { ok: false as const, motif: "Ce jeune n'est pas dans votre groupe." };
  }
  await prisma.jeune.update({
    where: { id: jeuneId },
    data: { absenceConstatee: !present, presenceManuelle: present },
  });
  await journaliser(
    user.id,
    present ? "APPEL_PRESENT" : "APPEL_ABSENT",
    `${jeune.prenom} ${jeune.nom}`
  );
  for (const p of PAGES_APPEL) revalidatePath(p);
  return { ok: true as const };
}

export type SaisieJeune = {
  prenom: string;
  nom: string;
  pieuId: string;
  paroisse: string;
  dateNaissance?: string;
  groupeId?: string;
};

// La fiche montrée au conseiller quand un nom ressemble à un enfant déjà en
// base : de quoi décider « c'est lui » ou « non, c'est un autre », rien de plus.
export type JeuneRessemblant = {
  id: string;
  prenom: string;
  nom: string;
  pieu: string;
  paroisse: string | null;
  groupe: string | null;
  sexe: string;
  annule: boolean;
  memeSexe: boolean;
  dejaChezMoi: boolean;
};

const saisieValide = (s: SaisieJeune) =>
  s.prenom.trim().length >= 2 && s.nom.trim().length >= 2 && s.pieuId && s.paroisse.trim();

async function chercherRessemblants(
  saisie: SaisieJeune,
  groupe: { id: string; sexe: string }
): Promise<JeuneRessemblant[]> {
  const tous = await prisma.jeune.findMany({
    select: {
      id: true,
      prenom: true,
      nom: true,
      sexe: true,
      paroisse: true,
      statutInscription: true,
      groupeId: true,
      pieu: { select: { nom: true } },
      groupe: { select: { nom: true } },
    },
  });
  return rapprocherJeunes({ prenom: saisie.prenom, nom: saisie.nom }, tous).map((j) => ({
    id: j.id,
    prenom: j.prenom,
    nom: j.nom,
    pieu: j.pieu.nom,
    paroisse: j.paroisse,
    groupe: j.groupe?.nom ?? null,
    sexe: j.sexe,
    annule: j.statutInscription === STATUT_ANNULE,
    memeSexe: j.sexe === groupe.sexe,
    dejaChezMoi: j.groupeId === groupe.id,
  }));
}

/**
 * Un enfant arrivé sans être sur la liste, ajouté par son conseiller.
 *
 * L'ajout se fait en deux temps : le premier appel cherche d'abord, dans toute
 * la base, les enfants dont le nom ressemble — et s'il en trouve, il les rend
 * SANS créer. Le conseiller tranche : « c'est lui » passe par
 * adopterJeuneExistant, « c'est bien un autre enfant » rappelle cette action
 * avec confirmerCreation. On ne crée jamais un doublon en silence.
 *
 * L'enfant créé va dans le groupe du conseiller, du sexe de ce groupe (les
 * groupes ne sont pas mixtes : c'est le seul sexe possible), marqué présent —
 * il est debout devant lui — et badgé « ajouté sur place » pour la
 * régularisation du soir par la direction.
 */
export async function ajouterJeuneSurPlace(saisie: SaisieJeune, confirmerCreation = false) {
  const user = await exiger("CONSEILLER");
  const groupe = groupeDuConseiller(user, saisie.groupeId);
  if (!groupe) {
    return {
      ok: false as const,
      motif: "Aucun groupe ne vous est attribué : voyez un coordinateur principal.",
    };
  }
  if (!saisieValide(saisie)) {
    return { ok: false as const, motif: "Nom, prénoms, pieu et paroisse sont nécessaires." };
  }
  const pieu = await prisma.pieu.findUnique({ where: { id: saisie.pieuId } });
  if (!pieu) return { ok: false as const, motif: "Pieu inconnu." };

  if (!confirmerCreation) {
    const ressemblants = await chercherRessemblants(saisie, groupe);
    if (ressemblants.length > 0) {
      return { ok: false as const, ressemblants };
    }
  }

  // La date est facultative : on n'arrête pas un enfant à la porte pour une
  // date de naissance — les coordinateurs complèteront. Une date invalide est
  // gardée en brut, comme à l'import.
  let dateNaissance: Date | null = null;
  let dateNaissanceBrute: string | null = null;
  if (saisie.dateNaissance?.trim()) {
    const d = new Date(saisie.dateNaissance);
    if (Number.isNaN(d.getTime()) || d.getFullYear() < 1990) {
      dateNaissanceBrute = saisie.dateNaissance.trim();
    } else {
      dateNaissance = d;
    }
  }

  const jeune = await prisma.jeune.create({
    data: {
      prenom: saisie.prenom.trim(),
      nom: saisie.nom.trim(),
      sexe: groupe.sexe,
      pieuId: pieu.id,
      paroisse: saisie.paroisse.trim(),
      dateNaissance,
      dateNaissanceBrute,
      groupeId: groupe.id,
      presenceManuelle: true,
      ajouteSurPlace: true,
    },
  });
  await journaliser(
    user.id,
    "JEUNE_AJOUTE_SUR_PLACE",
    `${jeune.prenom} ${jeune.nom} (${pieu.nom} · ${jeune.paroisse}) → son groupe`
  );
  for (const p of PAGES_APPEL) revalidatePath(p);
  return { ok: true as const, prenom: jeune.prenom, nom: jeune.nom };
}

/**
 * « C'est lui » : l'enfant existait déjà — on le déplace dans le groupe du
 * conseiller au lieu d'en créer un deuxième. Une inscription annulée qui se
 * présente quand même est réactivée : l'enfant est là.
 */
export async function adopterJeuneExistant(jeuneId: string, groupeId?: string) {
  const user = await exiger("CONSEILLER");
  const groupe = groupeDuConseiller(user, groupeId);
  if (!groupe) {
    return { ok: false as const, motif: "Aucun groupe ne vous est attribué." };
  }
  const jeune = await prisma.jeune.findUnique({
    where: { id: jeuneId },
    include: { groupe: { select: { nom: true } } },
  });
  if (!jeune) return { ok: false as const, motif: "Jeune introuvable." };
  if (jeune.sexe !== groupe.sexe) {
    return {
      ok: false as const,
      motif:
        jeune.sexe === "F"
          ? "Cette jeune fille ne peut pas rejoindre un groupe de garçons — voyez sa conseillère."
          : "Ce jeune homme ne peut pas rejoindre un groupe de filles — voyez son conseiller.",
    };
  }
  const reactive = jeune.statutInscription === STATUT_ANNULE;
  await prisma.jeune.update({
    where: { id: jeuneId },
    data: {
      groupeId: groupe.id,
      presenceManuelle: true,
      absenceConstatee: false,
      ...(reactive ? { statutInscription: "Approuvée" } : {}),
    },
  });
  await journaliser(
    user.id,
    "JEUNE_DEPLACE_SUR_PLACE",
    `${jeune.prenom} ${jeune.nom} : ${jeune.groupe?.nom ?? "sans groupe"} → mon groupe` +
      (reactive ? " (inscription réactivée)" : "")
  );
  for (const p of PAGES_APPEL) revalidatePath(p);
  return { ok: true as const, prenom: jeune.prenom, nom: jeune.nom, reactive };
}

// L'état réel, assemblé pour l'algorithme : présent = pointé à l'arrivée d'un
// car OU marqué présent à la main.
async function chargerDonneesReorganisation() {
  const [jeunes, arrives, groupes, conseillers, adjoints, compagnies] = await Promise.all([
    prisma.jeune.findMany({
      where: { statutInscription: { not: STATUT_ANNULE } },
      select: { id: true, sexe: true, groupeId: true, presenceManuelle: true, absenceConstatee: true },
    }),
    prisma.mouvement.findMany({
      where: { type: "ARRIVEE" },
      select: { jeuneId: true },
      distinct: ["jeuneId"],
    }),
    prisma.groupe.findMany({
      select: { id: true, nom: true, sexe: true, conseillerId: true, compagnieId: true },
    }),
    prisma.user.findMany({
      where: { role: "CONSEILLER", actif: true, valide: true },
      select: { id: true, prenom: true, nom: true, sexe: true },
    }),
    prisma.user.findMany({
      where: { role: "ADJOINT", actif: true, valide: true },
      select: { id: true, prenom: true, nom: true, sexe: true, compagnieId: true },
    }),
    prisma.compagnie.findMany({ select: { id: true, nom: true, numero: true } }),
  ]);
  const pointes = new Set(arrives.map((a) => a.jeuneId));
  return {
    donnees: {
      // Le constat d'absence du conseiller prime sur le pointage du car : il
      // est plus récent, et fait sur place.
      jeunesPresents: jeunes
        .filter((j) => (pointes.has(j.id) || j.presenceManuelle) && !j.absenceConstatee)
        .map((j) => ({ id: j.id, sexe: j.sexe, groupeId: j.groupeId })),
      groupes,
      conseillersPresents: conseillers.map((c) => ({
        id: c.id,
        nom: `${c.prenom} ${c.nom}`,
        sexe: c.sexe,
      })),
      adjointsPresents: adjoints.map((a) => ({
        id: a.id,
        nom: `${a.prenom} ${a.nom}`,
        sexe: a.sexe,
        compagnieId: a.compagnieId,
      })),
      compagnies,
    },
    nbPointes: pointes.size,
    nbManuels: jeunes.filter((j) => j.presenceManuelle && !pointes.has(j.id)).length,
    nbBarres: jeunes.filter((j) => j.absenceConstatee).length,
  };
}

export async function simulerReorganisation(params: ParametresReorganisation) {
  await exiger("COORDINATEUR");
  const { donnees } = await chargerDonneesReorganisation();
  const plan = calculerPlan(donnees, params);
  // Les noms, pour que l'écran de proposition soit lisible sans re-requête.
  const noms: Record<string, string> = {};
  for (const c of donnees.conseillersPresents) noms[c.id] = c.nom;
  for (const a of donnees.adjointsPresents) noms[a.id] = a.nom;
  return { ok: true as const, plan, noms };
}

// Application : on RECALCULE côté serveur avec les mêmes paramètres plutôt que
// de faire confiance à un plan envoyé par le navigateur — même résultat si
// rien n'a bougé, résultat plus juste si quelque chose a bougé entre-temps.
export async function appliquerReorganisation(params: ParametresReorganisation) {
  const user = await exiger("COORDINATEUR");
  const { donnees } = await chargerDonneesReorganisation();
  const plan = calculerPlan(donnees, params);
  if (plan.groupes.length === 0) {
    return { ok: false as const, motif: "Aucun groupe à composer : vérifiez les présences." };
  }

  const [jeunesTous, groupesTous, compagniesToutes, adjointsTous] = await Promise.all([
    prisma.jeune.findMany({
      where: { statutInscription: { not: STATUT_ANNULE } },
      select: { id: true, groupeId: true },
    }),
    prisma.groupe.findMany({
      select: { id: true, nom: true, sexe: true, conseillerId: true, compagnieId: true },
    }),
    prisma.compagnie.findMany({ select: { id: true, nom: true, numero: true } }),
    prisma.user.findMany({ where: { role: "ADJOINT" }, select: { id: true, compagnieId: true } }),
  ]);

  // L'instantané d'abord : c'est lui qui rend le bouton « revenir en arrière »
  // possible. Autoportant, sans clé étrangère.
  const instantane = await prisma.instantaneOrganisation.create({
    data: {
      motif: `Avant réorganisation (${plan.stats.presents} présents, ${plan.groupes.length} groupes)`,
      creeParId: user.id,
      donnees: JSON.stringify({
        jeunes: jeunesTous,
        groupes: groupesTous,
        compagnies: compagniesToutes,
        adjoints: adjointsTous,
      }),
    },
  });

  await prisma.$transaction(async (tx) => {
    // 1. Les lignes de groupe : celles conservées gardent tout ; les plans
    //    « nouveaux » logent dans les lignes libérées du même sexe (elles
    //    gardent leur nom réel) ; à défaut, une ligne est créée.
    const prises = new Set(plan.groupes.filter((g) => g.groupeId).map((g) => g.groupeId!));
    const coquilles = new Map<string, string[]>();
    for (const g of groupesTous) {
      if (prises.has(g.id)) continue;
      coquilles.set(g.sexe, [...(coquilles.get(g.sexe) ?? []), g.id]);
    }
    const idsFinaux: string[] = [];
    for (const g of plan.groupes) {
      if (g.groupeId) {
        idsFinaux.push(g.groupeId);
        await tx.groupe.update({ where: { id: g.groupeId }, data: { conseillerId: g.conseillerId } });
        continue;
      }
      const coquille = coquilles.get(g.sexe)?.shift();
      if (coquille) {
        idsFinaux.push(coquille);
        await tx.groupe.update({ where: { id: coquille }, data: { conseillerId: g.conseillerId } });
        continue;
      }
      let nom = g.nom;
      for (let n = 2; await tx.groupe.findUnique({ where: { nom } }); n++) nom = `${g.nom} (${n})`;
      const cree = await tx.groupe.create({
        data: { nom, sexe: g.sexe, conseillerId: g.conseillerId },
      });
      idsFinaux.push(cree.id);
    }

    // 2. Les lignes non utilisées deviennent des coquilles vides.
    const restantes = [...coquilles.values()].flat();
    if (restantes.length > 0) {
      await tx.groupe.updateMany({
        where: { id: { in: restantes } },
        data: { conseillerId: null, compagnieId: null },
      });
      // Leurs jeunes non arrivés retournent au vivier.
      await tx.jeune.updateMany({
        where: { groupeId: { in: restantes } },
        data: { groupeId: null },
      });
    }

    // 3. Les jeunes présents rejoignent leur groupe du plan.
    for (let i = 0; i < plan.groupes.length; i++) {
      await tx.jeune.updateMany({
        where: { id: { in: plan.groupes[i].jeuneIds } },
        data: { groupeId: idsFinaux[i] },
      });
    }

    // 4. Les compagnies : conservées telles quelles, ou logées dans les lignes
    //    libérées, ou créées. Les adjoints du plan y sont rattachés.
    const compagniesPrises = new Set(
      plan.compagnies.filter((c) => c.compagnieId).map((c) => c.compagnieId!)
    );
    const compagniesLibres = compagniesToutes
      .filter((c) => !compagniesPrises.has(c.id))
      .map((c) => c.id);
    for (const c of plan.compagnies) {
      let compagnieId = c.compagnieId ?? compagniesLibres.shift() ?? null;
      if (!compagnieId) {
        let nom = c.nom;
        for (let n = 2; await tx.compagnie.findUnique({ where: { nom } }); n++) nom = `${c.nom} (${n})`;
        compagnieId = (await tx.compagnie.create({ data: { nom } })).id;
      }
      await tx.groupe.updateMany({
        where: { id: { in: c.groupesIdx.map((i) => idsFinaux[i]) } },
        data: { compagnieId },
      });
      if (c.dirigeantIds.length > 0) {
        await tx.user.updateMany({
          where: { id: { in: c.dirigeantIds } },
          data: { compagnieId },
        });
      }
    }
  });

  await journaliser(
    user.id,
    "REORGANISATION_APPLIQUEE",
    `${plan.stats.presents} présents · ${plan.groupes.length} groupes · ${plan.compagnies.length} compagnies · ` +
      `${plan.stats.gardentConseiller} gardent leur conseiller · instantané ${instantane.id}`
  );
  for (const p of ["/reorganisation", "/groupes", "/organigramme", "/jeunes", "/accueil"]) {
    revalidatePath(p);
  }
  return { ok: true as const, stats: plan.stats, instantaneId: instantane.id };
}

// Revenir à l'état photographié juste avant une application. Les lignes créées
// depuis sont vidées, jamais supprimées — les activités qui les référencent ne
// doivent pas casser.
export async function restaurerOrganisation(instantaneId: string) {
  const user = await exiger("COORDINATEUR");
  const instantane = await prisma.instantaneOrganisation.findUnique({ where: { id: instantaneId } });
  if (!instantane) return { ok: false as const, motif: "Instantané introuvable." };
  const donnees = JSON.parse(instantane.donnees) as {
    jeunes: { id: string; groupeId: string | null }[];
    groupes: { id: string; nom: string; sexe: string; conseillerId: string | null; compagnieId: string | null }[];
    compagnies: { id: string; nom: string; numero: number | null }[];
    adjoints: { id: string; compagnieId: string | null }[];
    coordinations?: { id: string; coordonnateurIds: string[] }[];
  };

  await prisma.$transaction(async (tx) => {
    const connus = new Set(donnees.groupes.map((g) => g.id));
    await tx.groupe.updateMany({
      where: { id: { notIn: [...connus] } },
      data: { conseillerId: null, compagnieId: null },
    });
    for (const g of donnees.groupes) {
      await tx.groupe.update({
        where: { id: g.id },
        data: { conseillerId: g.conseillerId, compagnieId: g.compagnieId },
      }).catch(() => {});
    }
    for (const j of donnees.jeunes) {
      await tx.jeune.update({ where: { id: j.id }, data: { groupeId: j.groupeId } }).catch(() => {});
    }
    for (const a of donnees.adjoints) {
      await tx.user.update({ where: { id: a.id }, data: { compagnieId: a.compagnieId } }).catch(() => {});
    }
    // Les liens de coordination, si l'instantané les connaissait : remis tels
    // quels, et retirés des compagnies créées depuis.
    if (donnees.coordinations) {
      const connues = new Set(donnees.coordinations.map((c) => c.id));
      const toutes = await tx.compagnie.findMany({ select: { id: true } });
      for (const c of toutes) {
        if (!connues.has(c.id)) {
          await tx.compagnie.update({ where: { id: c.id }, data: { coordonnateurs: { set: [] } } }).catch(() => {});
        }
      }
      for (const c of donnees.coordinations) {
        await tx.compagnie
          .update({ where: { id: c.id }, data: { coordonnateurs: { set: c.coordonnateurIds.map((id) => ({ id })) } } })
          .catch(() => {});
      }
    }
  });

  await journaliser(user.id, "REORGANISATION_RESTAUREE", `instantané ${instantaneId}`);
  for (const p of ["/reorganisation", "/groupes", "/organigramme", "/jeunes", "/accueil"]) {
    revalidatePath(p);
  }
  return { ok: true as const };
}

// ---------- Les fiches papier des conseillers ----------

// L'état réel, tel que la page d'aperçu et l'application le lisent tous deux.
export async function chargerPlanFichesPapier() {
  const { construirePlanFiches } = await import("./fiches-papier");
  const fichesJson = (await import("../../prisma/fiches-papier.json")).default;
  const [jeunes, conseillers] = await Promise.all([
    prisma.jeune.findMany({
      select: {
        id: true,
        prenom: true,
        nom: true,
        sexe: true,
        statutInscription: true,
        ajouteSurPlace: true,
      },
    }),
    prisma.user.findMany({
      where: { valide: true, role: { in: ["CONSEILLER", "ADJOINT"] } },
      select: { id: true, prenom: true, nom: true, sexe: true },
    }),
  ]);
  const plan = construirePlanFiches(
    fichesJson as { compagnie: number; sexe: "F" | "M"; conseiller: string | null; coordonnateurs: string[]; jeunes: string[] }[],
    jeunes.map((j) => ({
      id: j.id,
      prenom: j.prenom,
      nom: j.nom,
      sexe: j.sexe,
      annule: j.statutInscription === STATUT_ANNULE,
      ajouteSurPlace: j.ajouteSurPlace,
    })),
    conseillers
  );
  return { plan, nbJeunesBase: jeunes.filter((j) => j.statutInscription !== STATUT_ANNULE).length };
}

/**
 * Applique l'organisation des fiches papier : 34 compagnies, un groupe filles
 * et un groupe garçons chacune, les conseillers des fiches, et chaque enfant
 * rapproché placé dans son groupe — marqué présent, puisqu'un conseiller a
 * écrit son nom sur place.
 *
 * Les enfants qu'aucune fiche ne réclame perdent leur affectation : ils
 * passent « sans groupe », visibles dans l'onglet du même nom, et chaque
 * conseiller peut les reprendre depuis son téléphone. Le plan est recalculé
 * ici même, au moment du clic — jamais reçu du navigateur — et un instantané
 * est pris d'abord : tout cela se défait d'un geste.
 */
export async function appliquerFichesPapier() {
  const user = await exiger("COORDINATEUR");
  const { plan } = await chargerPlanFichesPapier();
  if (plan.stats.places === 0) {
    return { ok: false as const, motif: "Aucun placement à appliquer." };
  }

  const [jeunesTous, groupesTous, compagniesToutes, adjointsTous] = await Promise.all([
    prisma.jeune.findMany({ select: { id: true, groupeId: true } }),
    prisma.groupe.findMany({
      select: { id: true, nom: true, sexe: true, conseillerId: true, compagnieId: true, numeroDansCompagnie: true },
    }),
    prisma.compagnie.findMany({
      select: { id: true, nom: true, numero: true, coordonnateurs: { select: { id: true } } },
    }),
    prisma.user.findMany({ where: { role: "ADJOINT" }, select: { id: true, compagnieId: true } }),
  ]);

  const instantane = await prisma.instantaneOrganisation.create({
    data: {
      motif: `Avant application des fiches papier (${plan.stats.places} placés, ${plan.fiches.length} fiches)`,
      creeParId: user.id,
      donnees: JSON.stringify({
        jeunes: jeunesTous.map((j) => ({ id: j.id, groupeId: j.groupeId })),
        groupes: groupesTous.map(({ numeroDansCompagnie, ...g }) => (void numeroDansCompagnie, g)),
        compagnies: compagniesToutes.map((c) => ({ id: c.id, nom: c.nom, numero: c.numero })),
        adjoints: adjointsTous,
        coordinations: compagniesToutes.map((c) => ({
          id: c.id,
          coordonnateurIds: c.coordonnateurs.map((u) => u.id),
        })),
      }),
    },
  });

  await prisma.$transaction(
    async (tx) => {
      // 1. Les 34 compagnies des fiches : retrouvées par leur numéro, sinon
      //    par leur nom, sinon créées. Rien n'est supprimé.
      const numeros = [...new Set(plan.fiches.map((f) => f.compagnie))].sort((a, b) => a - b);
      const compagnieParNumero = new Map<number, string>();
      for (const n of numeros) {
        const nom = `Compagnie ${n}`;
        const existante =
          compagniesToutes.find((c) => c.numero === n) ??
          compagniesToutes.find((c) => c.nom === nom);
        if (existante) {
          compagnieParNumero.set(n, existante.id);
        } else {
          const creee = await tx.compagnie.create({ data: { nom, numero: n } });
          compagnieParNumero.set(n, creee.id);
        }
      }

      // 2. Un groupe par fiche : la ligne (compagnie, 1|2) si elle existe,
      //    sinon une ligne du bon nom, sinon une création.
      const groupeParFiche = new Map<string, string>();
      for (const f of plan.fiches) {
        const numeroDans = f.sexe === "F" ? 1 : 2;
        const compagnieId = compagnieParNumero.get(f.compagnie)!;
        const nomVoulu = `Groupe ${f.compagnie}.${numeroDans}`;
        const existant =
          groupesTous.find(
            (g) => g.compagnieId === compagnieId && g.numeroDansCompagnie === numeroDans
          ) ?? groupesTous.find((g) => g.nom === nomVoulu);
        let groupeId: string;
        if (existant) {
          groupeId = existant.id;
          await tx.groupe.update({
            where: { id: existant.id },
            data: {
              sexe: f.sexe,
              numeroDansCompagnie: numeroDans,
              compagnieId,
              conseillerId: f.conseillerId,
            },
          });
        } else {
          const cree = await tx.groupe.create({
            data: {
              nom: nomVoulu,
              sexe: f.sexe,
              numeroDansCompagnie: numeroDans,
              compagnieId,
              conseillerId: f.conseillerId,
            },
          });
          groupeId = cree.id;
        }
        groupeParFiche.set(`${f.compagnie}-${f.sexe}`, groupeId);
      }

      // 3. Tout le monde repart de zéro : les fiches sont LA référence.
      //    Qui n'y figure pas devient « sans groupe » — et se reprend d'un
      //    geste, par le conseiller lui-même ou par la direction.
      await tx.jeune.updateMany({ data: { groupeId: null } });
      for (const f of plan.fiches) {
        const groupeId = groupeParFiche.get(`${f.compagnie}-${f.sexe}`)!;
        const ids = f.placements.map((p) => p.jeuneId);
        if (ids.length === 0) continue;
        // Sur la fiche = vu sur place : présent, et plus barré. Une
        // inscription annulée qui y figure est réactivée — l'enfant est là.
        await tx.jeune.updateMany({
          where: { id: { in: ids } },
          data: {
            groupeId,
            presenceManuelle: true,
            absenceConstatee: false,
            statutInscription: "Approuvée",
          },
        });
      }

      // 4. Les groupes hors fiches deviennent des coquilles vides — jamais
      //    supprimés, des activités peuvent les référencer.
      const gardes = new Set(groupeParFiche.values());
      await tx.groupe.updateMany({
        where: { id: { notIn: [...gardes] } },
        data: { conseillerId: null, compagnieId: null },
      });

      // 5. Les binômes de coordonnateurs adjoints, rattachés à leur secteur :
      //    chaque compagnie reçoit les comptes retrouvés de ses deux noms. Le
      //    rattachement un-à-un d'avant la réorganisation s'efface — il ne
      //    décrit plus rien, et l'instantané sait le rendre.
      await tx.user.updateMany({ where: { role: "ADJOINT" }, data: { compagnieId: null } });
      const parCompagnie = new Map<number, string[]>();
      for (const c of plan.coordinations) {
        if (!c.userId) continue;
        for (const n of c.compagnies) {
          parCompagnie.set(n, [...(parCompagnie.get(n) ?? []), c.userId]);
        }
      }
      for (const n of numeros) {
        await tx.compagnie.update({
          where: { id: compagnieParNumero.get(n)! },
          data: { coordonnateurs: { set: (parCompagnie.get(n) ?? []).map((id) => ({ id })) } },
        });
      }
    },
    { timeout: 60_000 }
  );

  await journaliser(
    user.id,
    "FICHES_PAPIER_APPLIQUEES",
    `${plan.stats.places} jeunes placés sur ${plan.stats.noms} noms · ${plan.fiches.length} fiches · ` +
      `${plan.stats.introuvables} introuvables · ${plan.stats.ambigus} ambigus · instantané ${instantane.id}`
  );
  for (const p of ["/reorganisation", "/groupes", "/organigramme", "/jeunes", "/accueil"]) {
    revalidatePath(p);
  }
  return { ok: true as const, stats: plan.stats, instantaneId: instantane.id };
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

export type ResultatModification = { ok: true } | { ok: false; motif: string };

// Pose une heure « HH:MM » sur le jour d'une date existante : le formulaire ne
// modifie que les heures, jamais le jour — déplacer une activité de journée est
// un autre geste, plus rare, qui mérite d'être fait en pleine conscience.
function heureSurJour(reference: Date, heure: string): Date | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(heure.trim());
  if (!m) return null;
  const d = new Date(reference);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

export async function modifierActivite(
  activiteId: string,
  formData: FormData
): Promise<ResultatModification> {
  const user = await exiger("CONSEILLER");
  const activite = await prisma.activite.findUniqueOrThrow({ where: { id: activiteId } });

  const brutTitre = String(formData.get("titre") ?? "").trim();
  const brutLieu = String(formData.get("lieu") ?? "").trim();
  const brutDebut = String(formData.get("heureDebut") ?? "").trim();
  const brutFin = String(formData.get("heureFin") ?? "").trim();
  const annuler = formData.get("annuler") === "on";
  const motif = String(formData.get("motif") ?? "").trim() || null;

  // Les champs arrivent préremplis : n'est un changement que ce qui diffère
  // de l'existant. Ainsi « Enregistrer » sans avoir rien touché ne marque pas
  // l'activité « Modifiée » pour rien.
  const nouveauDebut = brutDebut ? heureSurJour(activite.debut, brutDebut) : null;
  if (brutDebut && !nouveauDebut) return { ok: false, motif: "Heure de début illisible." };
  const nouvelleFin = brutFin ? heureSurJour(activite.debut, brutFin) : null;
  if (brutFin && !nouvelleFin) return { ok: false, motif: "Heure de fin illisible." };

  const changeTitre = brutTitre && brutTitre !== activite.titre ? brutTitre : null;
  const changeLieu = brutLieu && brutLieu !== (activite.lieu ?? "") ? brutLieu : null;
  const changeDebut =
    nouveauDebut && nouveauDebut.getTime() !== activite.debut.getTime() ? nouveauDebut : null;
  const changeFin =
    nouvelleFin && nouvelleFin.getTime() !== (activite.fin?.getTime() ?? -1) ? nouvelleFin : null;

  const debutFinal = changeDebut ?? activite.debut;
  const finFinale = changeFin ?? activite.fin;
  if (finFinale && finFinale.getTime() <= debutFinal.getTime()) {
    return { ok: false, motif: "L'heure de fin doit venir après l'heure de début." };
  }

  if (!changeTitre && !changeLieu && !changeDebut && !changeFin && !annuler) {
    return { ok: false, motif: "Rien n'a été changé — fermez simplement le formulaire." };
  }

  if (peutModifierDirectement(user)) {
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
        titre: changeTitre ?? activite.titre,
        debut: debutFinal,
        fin: finFinale,
        lieu: changeLieu ?? activite.lieu,
        statut: nouveauStatut,
      },
    });
    await journaliser(user.id, "ACTIVITE_MODIFIEE", `${activite.titre}${annuler ? " (annulée)" : ""}`);
  } else if (user.role === "ADJOINT") {
    // Proposition soumise à validation — seuls les champs réellement changés.
    await prisma.modificationProgramme.create({
      data: {
        activiteId,
        nouveauTitre: changeTitre,
        nouveauDebut: changeDebut,
        nouvelleFin: changeFin,
        nouveauLieu: changeLieu,
        nouveauStatut: annuler ? "ANNULE" : null,
        motif,
        proposeParId: user.id,
      },
    });
    await journaliser(user.id, "MODIFICATION_PROPOSEE", activite.titre);
  } else {
    return { ok: false, motif: "Les conseillers ne peuvent pas modifier le programme." };
  }
  revalidatePath("/programme");
  return { ok: true };
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
        fin: modif.nouvelleFin ?? modif.activite.fin,
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

  // La remise est close pour les conseillers et les adjoints : les
  // attestations ont figé le nombre de rapports, et un rapport de plus ferait
  // mentir un document déjà signé. Le contrôle est ici et pas seulement dans
  // le formulaire — une page restée ouverte depuis la veille enverrait encore.
  //
  // Refus retourné, jamais jeté : en production, Next remplace le message
  // d'une erreur lancée par un texte générique, et c'est précisément dans ce
  // cas-là — une page ouverte depuis des heures — qu'il faut expliquer.
  if (rapportsClos(user.role)) {
    return {
      ok: false as const,
      motif:
        `La remise des rapports est close depuis le ${LIBELLE_CLOTURE}. ` +
        `Les attestations sont établies à partir des rapports reçus avant cette heure. ` +
        `Adressez-vous à la coordination si quelque chose doit être corrigé.`,
    };
  }

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
    sectionsPour(user.role, jour)
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
    ok: true as const,
    points: total,
    jour,
    cree: precedent === null,
    total: cumul._sum.points ?? total,
  };
}

export async function supprimerRapport(rapportId: string) {
  const user = await exiger("CONSEILLER");
  // Symétrique de la remise : après la clôture, un rapport ne disparaît pas
  // plus qu'il n'apparaît. Retirer le sien ferait tomber le compte imprimé sur
  // une attestation déjà remise.
  if (rapportsClos(user.role)) {
    throw new Error(
      `La remise des rapports est close depuis le ${LIBELLE_CLOTURE} : ` +
        `ils ne peuvent plus être supprimés. Adressez-vous à la coordination.`
    );
  }
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

// ---------- Photobooth souvenir ----------
//
// L'iPad de l'événement : les jeunes se prennent en selfie dans un cadre FSY.
// La tablette reste connectée sur un compte encadrant ; les photos partent
// chez Cloudinary (dossier dédié, livraison signée — des mineurs y figurent),
// avec un repli en base quand Cloudinary n'est pas configuré.

export async function demanderSignatureSouvenir() {
  await exiger("CONSEILLER");
  return signerEnvoi("souvenirs");
}

export async function enregistrerPhotoSouvenir(donnee: {
  publicId?: string;
  image?: string;
  cadre: string;
}) {
  const user = await exiger("CONSEILLER");
  const cadre = String(donnee.cadre).slice(0, 40);
  if (donnee.publicId) {
    if (!publicIdValide(donnee.publicId, "souvenirs")) {
      return { ok: false as const, motif: "Image refusée." };
    }
    await prisma.photoSouvenir.create({
      data: { publicId: donnee.publicId, cadre, priseParId: user.id },
    });
  } else if (donnee.image) {
    // Repli sans Cloudinary : une image réduite, jamais plus.
    if (!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(donnee.image)) {
      return { ok: false as const, motif: "La photo n'a pas pu être lue." };
    }
    if (donnee.image.length > 900_000) {
      return { ok: false as const, motif: "Photo trop lourde." };
    }
    await prisma.photoSouvenir.create({
      data: { image: donnee.image, cadre, priseParId: user.id },
    });
  } else {
    return { ok: false as const, motif: "Aucune image reçue." };
  }
  revalidatePath("/souvenir/galerie");
  return { ok: true as const };
}

export async function supprimerPhotoSouvenir(id: string) {
  const user = await exiger("COORDINATEUR");
  const photo = await prisma.photoSouvenir.findUnique({ where: { id } });
  if (!photo) return { ok: false as const, motif: "Photo introuvable." };
  await prisma.photoSouvenir.delete({ where: { id } });
  if (photo.publicId) await supprimerPhotos([photo.publicId]);
  await journaliser(user.id, "PHOTO_SOUVENIR_SUPPRIMEE", photo.publicId ?? photo.id);
  revalidatePath("/souvenir/galerie");
  return { ok: true as const };
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
      // La photo est figée avec le reste : c'est elle que verra un recruteur
      // sur la page de vérification, à comparer au visage devant lui.
      photoPublicId: c.photoPublicId,
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

// Signature manuscrite d'un membre du couple dirigeant, tracée au doigt ou au
// stylet. Chacun des deux peut signer depuis n'importe quel compte DIRIGEANT
// (une même tablette qui passe de main en main) : le pad porte le nom du
// signataire, pas celui du compte connecté. Elle s'appose sur toutes les
// vraies attestations ; le spécimen garde sa signature de police.
export async function enregistrerSignature(nom: string, image: string) {
  const user = await exiger("DIRIGEANT");
  if (!SIGNATAIRES.some((s) => s.nom === nom)) {
    return { ok: false as const, motif: "Signataire inconnu." };
  }
  // Un PNG en data URL, et rien d'autre : la chaîne est réaffichée telle
  // quelle dans une balise image, sur les attestations imprimées.
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)) {
    return { ok: false as const, motif: "Le tracé n'a pas pu être lu. Réessayez." };
  }
  if (image.length > 300_000) {
    return { ok: false as const, motif: "Tracé trop lourd — signez d'un trait plus simple." };
  }
  await prisma.signatureDirigeant.upsert({
    where: { nom },
    create: { nom, image, misAJourParId: user.id },
    update: { image, misAJourParId: user.id },
  });
  await journaliser(user.id, "SIGNATURE_ENREGISTREE", `Signature de ${nom}`);
  revalidatePath("/attestations");
  revalidatePath("/attestation");
  revalidatePath("/attestations/impression");
  return { ok: true as const };
}

export async function effacerSignature(nom: string) {
  const user = await exiger("DIRIGEANT");
  await prisma.signatureDirigeant.deleteMany({ where: { nom } });
  await journaliser(user.id, "SIGNATURE_EFFACEE", `Signature de ${nom}`);
  revalidatePath("/attestations");
  revalidatePath("/attestation");
  revalidatePath("/attestations/impression");
}

// Chacun choisit l'habillage de son attestation — présentation pure : le code
// et le QR authentifient quel que soit le modèle, et c'est ce choix qui sort
// à l'impression du lot de la clôture.
export async function choisirModeleAttestation(modele: string) {
  const user = await exiger("CONSEILLER");
  if (!modeleValide(modele)) throw new Error("Modèle d'attestation inconnu.");
  await prisma.user.update({ where: { id: user.id }, data: { modeleAttestation: modele } });
  revalidatePath("/attestation");
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

// ---------- Attestations des fournisseurs et des bénévoles ----------
//
// Rien ici ne se calcule : l'application n'a jamais vu le camion du
// transporteur ni les marmites du traiteur. Le couple dirigeant déclare ce
// qu'il a constaté, et le document le dit — « le couple dirigeant atteste
// que ». C'est exactement ce qu'est une attestation de bonne exécution : la
// parole du donneur d'ordre, vérifiable auprès de lui.
//
// D'où la seule règle de fond appliquée ici : ne jamais fabriquer un fait que
// le couple n'a pas écrit. Un objet vide reprend la phrase générique de la
// nature choisie, jamais une louange inventée.

export type SaisieAttestationTierce = {
  genre: string;
  nature: string;
  beneficiaire: string;
  representant?: string;
  fonction?: string;
  objet?: string;
  /** Un fait constaté par ligne, tel que saisi dans le champ libre. */
  precisions?: string;
  /** Période réellement couverte ; vide = celle de la conférence. */
  periode?: string;
  /** Les trois cartouches du bas ; vides = l'ampleur de la conférence. */
  chiffres?: { valeur?: string; label?: string }[];
};

const LIMITES = { beneficiaire: 120, court: 120, objet: 400, periode: 80, precision: 120 };

const coupe = (v: string | undefined | null, max: number) =>
  (v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Contrôle et mise en forme communes à la délivrance et à la correction. */
function preparerFaitsTiers(saisie: SaisieAttestationTierce) {
  if (!genreValide(saisie.genre)) {
    return { ok: false as const, motif: "Choisissez un fournisseur ou une personne." };
  }
  if (!natureValide(saisie.nature)) {
    return { ok: false as const, motif: "Choisissez la nature de la prestation." };
  }
  const beneficiaire = coupe(saisie.beneficiaire, LIMITES.beneficiaire);
  if (beneficiaire.length < 2) {
    return {
      ok: false as const,
      motif:
        saisie.genre === "PERSONNE"
          ? "Le nom de la personne est indispensable — c'est lui qui figurera sur le document."
          : "La raison sociale du fournisseur est indispensable.",
    };
  }

  // Sans objet saisi, la phrase générique de la nature choisie — celle qui
  // convient au genre : un fournisseur met à disposition, un bénévole prête
  // main-forte. « Autre prestation » n'en a pas : là, il faut écrire quelque
  // chose.
  const objet = objetEnChaineTiers(
    coupe(saisie.objet, LIMITES.objet) || objetProposeTiers(saisie.genre, saisie.nature)
  );
  if (!objet) {
    return {
      ok: false as const,
      motif: "Décrivez la prestation en une phrase — elle s'écrira après « a assuré ».",
    };
  }

  return {
    ok: true as const,
    genre: saisie.genre,
    nature: saisie.nature,
    faits: {
      beneficiaire,
      representant: coupe(saisie.representant, LIMITES.court) || null,
      fonction: coupe(saisie.fonction, LIMITES.court) || null,
      objet,
      precisions: lignesPrecisions(saisie.precisions ?? "").map((l) =>
        l.slice(0, LIMITES.precision)
      ),
      // Vide le plus souvent : la prestation couvre la conférence entière, et
      // le document n'a alors pas à répéter des dates qu'il donne déjà.
      periode: coupe(saisie.periode, LIMITES.periode),
      // Vides le plus souvent aussi : c'est alors l'ampleur de la conférence
      // qui s'affiche. Renseignés, ils la remplacent — voir FaitsTiers.
      chiffres: chiffresPropres(saisie.chiffres ?? []),
    },
  };
}

export async function delivrerAttestationTierce(saisie: SaisieAttestationTierce) {
  const user = await exiger("DIRIGEANT");
  const prepare = preparerFaitsTiers(saisie);
  if (!prepare.ok) return prepare;

  let code = codeDepuisOctets(randomBytes(8));
  for (let essai = 0; essai < 5; essai++) {
    const [a, b] = await Promise.all([
      prisma.attestation.findUnique({ where: { code }, select: { id: true } }),
      prisma.attestationTierce.findUnique({ where: { code }, select: { id: true } }),
    ]);
    if (!a && !b) break;
    code = codeDepuisOctets(randomBytes(8));
  }

  const cree = await prisma.attestationTierce.create({
    data: {
      code,
      genre: prepare.genre,
      nature: prepare.nature,
      // L'effectif définitif est figé avec le reste : si le couple corrigeait
      // plus tard le chiffre de référence, les documents déjà remis ne
      // changeraient pas d'un mot.
      faits: JSON.stringify({ ...prepare.faits, ...EFFECTIFS_FINAUX }),
      delivreeParId: user.id,
    },
  });

  await journaliser(
    user.id,
    "ATTESTATION_TIERCE_DELIVREE",
    `${prepare.faits.beneficiaire} — ${prepare.nature} (${code})`
  );
  for (const p of ["/attestations", "/attestations/tierces", "/attestations/tierces/impression"]) {
    revalidatePath(p);
  }
  return { ok: true as const, id: cree.id, code };
}

// Corriger plutôt que révoquer : une raison sociale mal orthographiée n'est pas
// une fraude. La correction laisse une trace visible sur la page publique et
// dans le journal — c'est ce qui la distingue d'une réécriture silencieuse.
export async function corrigerAttestationTierce(id: string, saisie: SaisieAttestationTierce) {
  const user = await exiger("DIRIGEANT");
  const prepare = preparerFaitsTiers(saisie);
  if (!prepare.ok) return prepare;

  const avant = await prisma.attestationTierce.findUnique({ where: { id } });
  if (!avant) return { ok: false as const, motif: "Cette attestation n'existe plus." };
  if (avant.revoqueeLe) {
    return {
      ok: false as const,
      motif: "Cette attestation est révoquée : elle ne peut plus être corrigée. Délivrez-en une nouvelle.",
    };
  }

  // La correction reprend aussi l'effectif de référence en vigueur : c'est ce
  // qui permet de rattraper une attestation délivrée avant que le couple
  // n'arrête les chiffres définitifs, sans la révoquer.
  const ancien = lireFaitsTiers(avant.faits);
  await prisma.attestationTierce.update({
    where: { id },
    data: {
      genre: prepare.genre,
      nature: prepare.nature,
      faits: JSON.stringify({ ...prepare.faits, ...EFFECTIFS_FINAUX }),
      modifieeLe: new Date(),
    },
  });

  await journaliser(
    user.id,
    "ATTESTATION_TIERCE_CORRIGEE",
    `${avant.code} — « ${ancien.beneficiaire} » devient « ${prepare.faits.beneficiaire} »`
  );
  for (const p of ["/attestations", "/attestations/tierces", "/attestations/tierces/impression"]) {
    revalidatePath(p);
  }
  return { ok: true as const, id, code: avant.code };
}

export async function revoquerAttestationTierce(id: string, motif: string) {
  const user = await exiger("DIRIGEANT");
  const a = await prisma.attestationTierce.findUnique({ where: { id } });
  if (!a) return { ok: false as const, motif: "Cette attestation n'existe plus." };

  await prisma.attestationTierce.update({
    where: { id },
    data: { revoqueeLe: new Date(), motifRevocation: motif.trim() || "Non précisé" },
  });
  await journaliser(
    user.id,
    "ATTESTATION_TIERCE_REVOQUEE",
    `${lireFaitsTiers(a.faits).beneficiaire} (${a.code}) — ${motif}`
  );
  for (const p of ["/attestations", "/attestations/tierces", "/attestations/tierces/impression"]) {
    revalidatePath(p);
  }
  return { ok: true as const };
}

// ---------- Correction du nom sur une attestation ----------
//
// Voir noms.ts pour les règles et leur raison d'être. Ici, les deux gestes :
// la personne demande, le couple dirigeant tranche.

export async function demanderCorrectionNom(saisie: SaisieNom) {
  const user = await exiger("CONSEILLER");

  const mesDemandes = await prisma.demandeNom.findMany({
    where: { userId: user.id },
    select: { statut: true, motifRefus: true, creeLe: true },
  });
  const etat = etatDemandeNom(mesDemandes);
  if (!etat.peutDemander) {
    return {
      ok: false as const,
      motif:
        etat.raison === "EN_ATTENTE"
          ? "Votre demande est déjà partie : le couple dirigeant doit la regarder avant que vous puissiez en faire une autre."
          : "Votre nom a déjà été corrigé une fois. Pour une nouvelle correction, adressez-vous directement au couple dirigeant.",
    };
  }

  const verdict = verifierDemandeNom(saisie, user);
  if (!verdict.ok) return { ok: false as const, motif: verdict.motif };

  await prisma.demandeNom.create({
    data: {
      userId: user.id,
      ancienPrenom: user.prenom,
      ancienNom: user.nom,
      prenom: verdict.prenom,
      nom: verdict.nom,
      motif: verdict.motif,
    },
  });
  await journaliser(
    user.id,
    "NOM_CORRECTION_DEMANDEE",
    `« ${nomComplet(user)} » → « ${verdict.prenom} ${verdict.nom} »`
  );
  for (const p of ["/attestation", "/attestations", "/accueil"]) revalidatePath(p);
  return { ok: true as const };
}

// La décision du couple. Acceptée, la correction touche deux endroits : le
// compte (ce que l'application affiche partout) et les faits figés de
// l'attestation (ce que porte le document imprimé et sa page de vérification).
// Corriger l'un sans l'autre laisserait le document et l'écran se contredire.
export async function traiterCorrectionNom(
  id: string,
  decision: "ACCEPTEE" | "REFUSEE",
  motifRefus?: string
) {
  const user = await exiger("DIRIGEANT");

  const demande = await prisma.demandeNom.findUnique({
    where: { id },
    include: { user: { select: { id: true, prenom: true, nom: true, attestation: true } } },
  });
  if (!demande) return { ok: false as const, motif: "Cette demande n'existe plus." };
  if (demande.statut !== "EN_ATTENTE") {
    return { ok: false as const, motif: "Cette demande a déjà été traitée." };
  }

  if (decision === "REFUSEE") {
    const raison = (motifRefus ?? "").trim().slice(0, LIMITES_NOM.motif);
    if (raison.length < 3) {
      return {
        ok: false as const,
        motif: "Dites en un mot pourquoi vous refusez : la personne le lira et pourra corriger.",
      };
    }
    await prisma.demandeNom.update({
      where: { id },
      data: {
        statut: "REFUSEE",
        motifRefus: raison,
        traiteeParId: user.id,
        traiteeLe: new Date(),
      },
    });
    await journaliser(
      user.id,
      "NOM_CORRECTION_REFUSEE",
      `${nomComplet(demande.user)} — ${raison}`
    );
  } else {
    const nouveau = nomComplet({ prenom: demande.prenom, nom: demande.nom });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: demande.userId },
        data: { prenom: demande.prenom, nom: demande.nom },
      });
      // Les faits de l'attestation sont un JSON figé : on n'en réécrit que le
      // nom, tout le reste (rapports, groupes, effectifs) doit rester intact.
      if (demande.user.attestation) {
        const faits = lireFaits(demande.user.attestation.faits);
        await tx.attestation.update({
          where: { id: demande.user.attestation.id },
          data: { faits: JSON.stringify({ ...faits, nomComplet: nouveau }) },
        });
      }
      await tx.demandeNom.update({
        where: { id },
        data: { statut: "ACCEPTEE", traiteeParId: user.id, traiteeLe: new Date() },
      });
    });
    await journaliser(
      user.id,
      "NOM_CORRECTION_ACCEPTEE",
      `« ${nomComplet(demande.user)} » devient « ${nouveau} »` +
        (demande.user.attestation ? ` — attestation ${demande.user.attestation.code}` : "")
    );
  }

  for (const p of [
    "/attestation",
    "/attestations",
    "/attestations/impression",
    "/accueil",
    "/admin",
    "/organigramme",
  ]) {
    revalidatePath(p);
  }
  return {
    ok: true as const,
    // De quoi proposer la réimpression de la seule feuille concernée.
    attestationId: demande.user.attestation?.id ?? null,
  };
}

// ---------- Accès d'après conférence ----------

// Basculer les accès restreints : hors du couple dirigeant, chacun ne garde
// que l'accueil, son profil, les annonces et — s'il en a une — son
// attestation. Réversible d'un geste, journalisé dans les deux sens.
export async function basculerAccesRestreints(actif: boolean) {
  const user = await exiger("DIRIGEANT");
  await prisma.reglage.upsert({
    where: { cle: CLE_ACCES_RESTREINTS },
    create: { cle: CLE_ACCES_RESTREINTS, valeur: actif ? "oui" : "non" },
    update: { valeur: actif ? "oui" : "non" },
  });
  await journaliser(
    user.id,
    "ACCES_RESTREINTS",
    actif ? "Accès d'après conférence activés" : "Accès complets rétablis"
  );
  revalidatePath("/", "layout");
  return { ok: true as const, actif };
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

/**
 * Change l'appel d'un encadrant.
 *
 * Plusieurs personnes se sont inscrites comme coordinateur adjoint sans l'être :
 * le formulaire le proposait, elles ont coché de bonne foi. Les coordinateurs
 * principaux corrigent ici.
 *
 * Deux garde-fous. On ne touche qu'aux conseillers et aux adjoints, et l'on ne
 * peut attribuer que ces deux appels : sans cela, un coordinateur pourrait se
 * hisser lui-même — ou hisser quelqu'un — au rang de couple dirigeant. Et le
 * changement emporte ce qui n'a plus de sens : un conseiller devenu adjoint
 * rend ses groupes, un adjoint redevenu conseiller rend sa compagnie et les
 * droits nominatifs qui allaient avec sa charge.
 */
export async function changerAppel(userId: string, nouveauRole: "CONSEILLER" | "ADJOINT") {
  const auteur = await exiger("COORDINATEUR");
  if (!["CONSEILLER", "ADJOINT"].includes(nouveauRole)) throw new Error("Appel invalide.");

  const cible = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { groupesDiriges: { select: { id: true, nom: true } } },
  });
  if (!["CONSEILLER", "ADJOINT"].includes(cible.role)) {
    throw new Error(
      "Seul l'appel d'un conseiller ou d'un coordinateur adjoint se change ici."
    );
  }
  if (cible.role === nouveauRole) return { ok: true, inchange: true };

  const consequences: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (nouveauRole === "ADJOINT") {
      // Un adjoint dirige une compagnie, pas des groupes.
      if (cible.groupesDiriges.length > 0) {
        await tx.groupe.updateMany({
          where: { conseillerId: cible.id },
          data: { conseillerId: null },
        });
        consequences.push(
          `${cible.groupesDiriges.length} groupe(s) rendus : ${cible.groupesDiriges
            .map((g) => g.nom)
            .join(", ")}`
        );
      }
    } else {
      // Redevenu conseiller : la compagnie et les droits liés à la charge
      // d'adjoint tombent. Un conseiller qui garderait « Bien-être » verrait
      // les alertes de tous les jeunes sans que personne l'ait voulu.
      if (cible.compagnieId) consequences.push("compagnie rendue");
      if (lireDroits(cible.droitsSupplementaires).length > 0) {
        consequences.push("droits nominatifs retirés");
      }
      await tx.user.update({
        where: { id: cible.id },
        data: { compagnieId: null, droitsSupplementaires: "[]" },
      });
    }
    await tx.user.update({ where: { id: cible.id }, data: { role: nouveauRole } });
  });

  await journaliser(
    auteur.id,
    "APPEL_MODIFIE",
    `${cible.prenom} ${cible.nom} : ${cible.role} → ${nouveauRole}` +
      (consequences.length ? ` (${consequences.join(" ; ")})` : "")
  );
  revalidatePath("/admin");
  revalidatePath("/organigramme");
  revalidatePath("/sante");
  return { ok: true, consequences };
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

// ---------- Mode aperçu : voir l'application comme un autre appel ----------

/**
 * Le couple dirigeant regarde l'application avec les yeux d'un coordinateur,
 * d'un adjoint ou d'un conseiller. Personne n'est incarné : l'appel est
 * simplement abaissé, sans droits ni affectations, et tout est en lecture
 * seule le temps de l'aperçu.
 */
export async function demarrerApercu(role: string) {
  const user = await getUtilisateur();
  // Le vrai appel seul compte : déjà en aperçu, il reste DIRIGEANT dessous —
  // on peut donc passer d'un aperçu à l'autre sans repasser par la sortie.
  if (!user || (!user.apercu && user.role !== "DIRIGEANT")) redirect("/accueil");
  if (!(ROLES_APERCU as readonly string[]).includes(role)) {
    throw new Error("Appel inconnu pour l'aperçu.");
  }
  await poserApercu(role as RoleApercu);
  await journaliser(user.id, "APERCU_DEMARRE", `Voit l'application comme ${role}`);
  redirect("/accueil");
}

export async function quitterApercu() {
  const user = await getUtilisateur();
  await retirerApercu();
  if (user?.apercu) {
    await journaliser(user.id, "APERCU_TERMINE", `Fin de l'aperçu ${user.apercu}`);
  }
  redirect("/admin");
}
