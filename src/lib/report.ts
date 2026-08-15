// Ce qui a changé depuis l'annonce initiale.
//
// ════════════════════════════════════════════════════════════════════════════
//  C'EST LE SEUL FICHIER À MODIFIER quand la situation change :
//
//   • Nouvelle période annoncée → NOUVELLE_PERIODE à true (les dates elles-mêmes
//     se règlent dans src/lib/theme.ts).
//   • Tout le monde est au courant → NOUVELLE_PERIODE à false, et l'application
//     retrouve son affichage ordinaire.
//   • Un nouveau report → REPORTEE à true.
//
//  Tout le reste — le bandeau du site public, la barre en tête de chaque page
//  de l'espace encadrant, l'annonce épinglée, les avertissements du programme
//  et des cars — se met à jour tout seul.
// ════════════════════════════════════════════════════════════════════════════
//
// Pourquoi dans le code et non en base : une annonce se crée depuis
// l'application, mais elle ne s'affiche que sur la page des annonces, derrière
// la connexion. Or ces nouvelles-là doivent atteindre d'abord ceux qui n'ont
// pas de compte — les jeunes et leurs familles, qui arrivent par le site
// public — et rester visibles partout, sans dépendre de ce que quelqu'un pense
// à consulter.

import { CONFERENCE, LIEU } from "./theme";

/** La conférence est-elle reportée sans date ? */
export const REPORTEE = false;

/**
 * Une nouvelle période vient d'être annoncée.
 *
 * On ne se contente pas de retirer le report : ceux qui ont lu « reportée »
 * doivent lire la suite au même endroit. Une annonce qui disparaît sans être
 * remplacée laisse chacun croire ce qu'il veut.
 *
 * Éteinte mi-août 2026, l'annonce ayant tourné deux semaines : les dates du
 * 24-29 août sont actées et affichées partout dans le contenu ordinaire —
 * les bannières ne faisaient plus que prendre de la place.
 */
export const NOUVELLE_PERIODE = false;

/** Date de l'annonce, telle qu'elle est donnée. */
export const ANNONCE_LE = "1er août 2026";

export const TITRE = REPORTEE
  ? "La conférence FSY 2026 est reportée"
  : "Nouvelles dates et nouveau lieu";

export const RAISON = "le site qui devait nous accueillir n'était pas disponible";

export const RESUME = REPORTEE
  ? `La conférence est reportée à une date ultérieure : ${RAISON}.`
  : `La conférence se tiendra ${CONFERENCE.duAuComplet}, au ${LIEU.nom}.`;

export const QUAND = REPORTEE
  ? "La nouvelle date sera communiquée ici dès qu'elle sera arrêtée."
  : `${CONFERENCE.duAuComplet} · ${LIEU.nom}, ${LIEU.ville}.`;

/**
 * Le message, tel qu'il doit être lu.
 *
 * Simple et court. Il dit d'abord ce qui a changé, puis ce que chacun veut
 * savoir tout de suite : faut-il refaire quelque chose ? Il remercie de la
 * patience, parce que le report a coûté à beaucoup de familles qui avaient
 * réservé les premières dates.
 */
export const MESSAGE = REPORTEE
  ? [
      "Chers jeunes, chers parents, chers encadrants,",
      `La conférence FSY 2026 d'Abidjan Ouest est reportée à une date ultérieure : ${RAISON}.`,
      "Nous mesurons la déception que cette nouvelle apporte et vous prions de bien vouloir nous en excuser.",
      "Les inscriptions restent valables : personne n'a à se réinscrire.",
      "La nouvelle date sera communiquée ici dès qu'elle sera arrêtée.",
    ]
  : [
      "Chers jeunes, chers parents, chers encadrants,",
      `La conférence FSY 2026 d'Abidjan Ouest se tiendra ${CONFERENCE.duAuComplet}, au ${LIEU.nom}, à ${LIEU.ville}.`,
      `Le report annoncé début août tenait à l'indisponibilité du premier site. Un lieu a été trouvé, et ces dates-ci sont fermes : notez-les, et prévenez autour de vous.`,
      "Les inscriptions faites pour les premières dates restent valables — personne n'a à se réinscrire, et rien n'est perdu de ce qui a été préparé. Les groupes, les compagnies et les affectations sont conservés.",
      "Merci de votre patience pendant ces semaines d'attente. Nous nous réjouissons de vous retrouver.",
    ];

export const SIGNATURE_DEFAUT = "Le couple dirigeant la conférence";
export const SIGNATURE_ROLE = "FSY 2026 — Abidjan Ouest";

/** Y a-t-il quelque chose à annoncer, quelle qu'en soit la nature ? */
export const A_ANNONCER = REPORTEE || NOUVELLE_PERIODE;
