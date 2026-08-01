// Report de la conférence.
//
// ════════════════════════════════════════════════════════════════════════════
//  C'EST LE SEUL FICHIER À MODIFIER quand la situation change :
//
//   • Nouvelle date connue  → renseigner NOUVELLE_DATE, redéployer.
//   • Conférence maintenue  → passer REPORTEE à false, redéployer.
//
//  Tout le reste — le bandeau du site public, la barre en tête de chaque page
//  de l'espace encadrant, l'annonce épinglée, les avertissements du programme
//  et des cars — se met à jour tout seul.
// ════════════════════════════════════════════════════════════════════════════
//
// Pourquoi dans le code et non en base : une annonce se crée depuis
// l'application, mais elle ne s'affiche que sur la page des annonces, derrière
// la connexion. Or la nouvelle doit atteindre d'abord ceux qui n'ont pas de
// compte — les jeunes et leurs familles, qui arrivent par le site public — et
// elle doit rester visible partout, tout le temps, sans dépendre de ce que
// quelqu'un pense à consulter.

export const REPORTEE = true;

/** Date de la décision, telle qu'elle est annoncée. */
export const ANNONCE_LE = "1er août 2026";

/** Renseigner dès que la date est arrêtée ; laisser null en attendant. */
export const NOUVELLE_DATE: string | null = null;

/** Ce qui tenait en une ligne, pour les bandeaux étroits. */
export const TITRE = "La conférence FSY 2026 est reportée";

export const RAISON =
  "le site qui devait nous accueillir n'est finalement pas disponible";

export const RESUME =
  `Prévue du 3 au 8 août, la conférence est reportée à une date ultérieure : ${RAISON}.`;

export const QUAND = NOUVELLE_DATE
  ? `Nouvelle date : ${NOUVELLE_DATE}.`
  : "La nouvelle date sera communiquée ici dès qu'elle sera arrêtée.";

/**
 * Le message, tel qu'il doit être lu.
 *
 * Simple, court, et il présente des excuses — beaucoup de familles avaient
 * réservé ces journées, et plusieurs centaines de jeunes attendaient ce
 * moment depuis des mois. Une nouvelle pareille se donne sans détour et sans
 * se cacher derrière l'administration.
 */
export const MESSAGE = [
  "Chers jeunes, chers parents, chers encadrants,",
  `La conférence FSY 2026 d'Abidjan Ouest, prévue du 3 au 8 août, est reportée à une date ultérieure : ${RAISON}.`,
  "Nous mesurons la déception que cette nouvelle apporte. Beaucoup d'entre vous s'étaient préparés, avaient pris des dispositions et réservé ces journées. Nous vous prions de bien vouloir nous en excuser.",
  "Les inscriptions restent valables : personne n'a à se réinscrire, et rien n'est perdu de ce qui a été préparé.",
  `${QUAND} Elle vous sera également transmise par vos dirigeants de pieu et de district.`,
  "Merci de votre compréhension et de votre patience. Nous vous portons dans nos prières, et nous nous réjouissons de vous retrouver.",
];

export const SIGNATURE_DEFAUT = "Le couple dirigeant la conférence";
export const SIGNATURE_ROLE = "FSY 2026 — Abidjan Ouest";
