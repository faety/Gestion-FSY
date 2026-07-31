// Adresse publique de l'application, en un seul endroit.
//
// Elle est imprimée sur les attestations, sous forme de QR et de texte. Ces
// documents circuleront pendant des années et personne ne pourra les corriger :
// si le domaine devait changer, il faut que ce soit une variable
// d'environnement à modifier, pas une chaîne à retrouver dans huit fichiers.
//
// L'adresse officielle est **fsy.ci**. Le sous-domaine 2026.fsy.ci a d'abord
// été envisagé, puis abandonné : en branchant Resend dessus, la création de
// send.2026.fsy.ci en a fait un nœud vide de la zone, et le caractère générique
// *.fsy.ci a cessé de le servir (RFC 4592) — le sous-domaine a disparu du DNS
// du jour au lendemain. fsy.ci, lui, a son propre enregistrement.
//
// SITE_URL doit toujours désigner un nom qui résout vraiment : cette adresse
// part sur les attestations, en QR et en toutes lettres, et un document
// imprimé ne se corrige plus.

const defaut = "https://fsy.ci";

export const SITE_URL = (process.env.SITE_URL?.trim() || defaut).replace(/\/+$/, "");

/** Sans le protocole, pour l'afficher : « fsy.ci ». */
export const SITE_AFFICHE = SITE_URL.replace(/^https?:\/\//, "");

export const lienVerification = (code: string) => `${SITE_URL}/verification/${code}`;
