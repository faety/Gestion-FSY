import { cache } from "react";
import { prisma } from "./db";

// Réglages de l'application — un par clé, basculés depuis l'Administration.
//
// Le premier réglage est né de la fin de la conférence : une fois les cars
// partis, l'application cesse d'être un outil de travail et devient une
// archive. Les conseillers n'ont plus de jeunes à pointer ni de rapports à
// rendre ; ce qui leur reste, c'est leur attestation. Mais les données, elles,
// restent : listes de jeunes, alertes médicales, téléphones des familles.
// Moins de gens y ont accès, moins elles risquent — c'est le même principe qui
// a restreint le rapport du fournisseur ou l'archive photo.
//
// Un réglage en base et non dans le code : c'est le couple dirigeant qui
// décide du moment, depuis son téléphone, sans déploiement — et qui peut
// revenir en arrière si un coordinateur doit reprendre la main un jour.

export const CLE_ACCES_RESTREINTS = "acces-restreints";

/**
 * Les accès d'après conférence sont-ils en vigueur ?
 *
 * `cache` : le gabarit pose la question à chaque page ; une seule lecture par
 * requête. En cas d'ennui de base, on répond « non » — un réglage de confort
 * ne doit jamais empêcher l'application de servir.
 */
export const accesRestreints = cache(async (): Promise<boolean> => {
  try {
    const r = await prisma.reglage.findUnique({ where: { cle: CLE_ACCES_RESTREINTS } });
    return r?.valeur === "oui";
  } catch {
    return false;
  }
});

/**
 * Ce qu'un compte restreint peut encore ouvrir.
 *
 * L'accueil (les annonces, dont les remerciements), le profil (sa photo, son
 * numéro, son mot de passe), et — si la sienne existe — son attestation.
 * `/mot-de-passe` reste passant : le changement forcé de mot de passe prime
 * sur tout, restriction comprise.
 */
export function cheminAutorise(chemin: string, aUneAttestation: boolean): boolean {
  const base = ["/accueil", "/profil", "/mot-de-passe", "/annonces"];
  if (aUneAttestation) base.push("/attestation");
  return base.some((b) => chemin === b || chemin.startsWith(`${b}/`));
}
