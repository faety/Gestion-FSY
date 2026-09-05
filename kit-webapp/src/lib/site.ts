// Adresse publique de l'application, en un seul endroit.
//
// Elle part dans les e-mails, les QR et les documents imprimés — que personne
// ne pourra corriger après coup. Si le domaine change, c'est une variable
// d'environnement à modifier, pas une chaîne à retrouver dans huit fichiers.
//
// SITE_URL doit désigner un nom qui résout VRAIMENT. Leçon apprise : un
// sous-domaine servi par un enregistrement générique (*.domaine) disparaît du
// DNS dès qu'on crée quelque chose en dessous (send.sous.domaine pour un
// service d'e-mail, par exemple) — RFC 4592. Voir docs/lecons.md.
import { APP } from "./app";

export const SITE_URL = (process.env.SITE_URL?.trim() || APP.siteParDefaut).replace(/\/+$/, "");

/** Sans le protocole, pour l'afficher : « exemple.ci ». */
export const SITE_AFFICHE = SITE_URL.replace(/^https?:\/\//, "");
