import { cache } from "react";
import { prisma } from "./db";

// Réglages de l'application — un par clé, basculés depuis l'Administration.
//
// En base et non dans le code : c'est l'administrateur qui décide du moment,
// depuis son téléphone, sans déploiement — et qui peut revenir en arrière.

export async function lireReglage(cle: string): Promise<string | null> {
  const r = await prisma.reglage.findUnique({ where: { cle } });
  return r?.valeur ?? null;
}

export async function ecrireReglage(cle: string, valeur: string) {
  await prisma.reglage.upsert({ where: { cle }, update: { valeur }, create: { cle, valeur } });
}

// ---------- Exemple : la lecture seule ----------
//
// Une fois l'événement terminé, l'application cesse d'être un outil de
// travail et devient une archive : tout le monde sauf les administrateurs
// redevient un utilisateur ordinaire, avec l'accueil et son profil.

export const CLE_LECTURE_SEULE = "lecture-seule";

/**
 * `cache` : le gabarit pose la question à chaque page ; une seule lecture par
 * requête. En cas d'ennui de base, on répond « non » — un réglage de confort
 * ne doit jamais empêcher l'application de servir.
 */
export const lectureSeule = cache(async (): Promise<boolean> => {
  try {
    return (await lireReglage(CLE_LECTURE_SEULE)) === "oui";
  } catch {
    return false;
  }
});

/** Ce qu'un compte restreint peut encore ouvrir. `/mot-de-passe` reste passant :
 *  le changement forcé de mot de passe prime sur tout. */
export function cheminAutorise(chemin: string): boolean {
  const base = ["/accueil", "/profil", "/mot-de-passe"];
  return base.some((b) => chemin === b || chemin.startsWith(`${b}/`));
}
