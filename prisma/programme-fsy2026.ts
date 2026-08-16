// ============================================================================
// PROGRAMME OFFICIEL — FSY 2026 ABIDJAN OUEST
// ============================================================================
//
// Thème de l'année : Moïse 6:34 — « Marche avec moi »
//
// SOURCES
//
//  1. « Manuel du participant — Conférence Jeunes, soyez forts 2026 : Marche
//     avec moi » (PD80053002 140) : programmes des 1er au 5e jours.
//  2. « Manuel de l'encadrant » (PD80049773 140) : emploi du temps des
//     encadrants (jour zéro à 6e jour), réunions d'encadrants, et rôle attendu
//     de chaque niveau hiérarchique pour chaque activité.
//  3. Canevas des réunions spirituelles matinales des jours 2, 3 et 4
//     (PD80061859 140) : thèmes doctrinaux.
//
// DATES : elles ne sont pas écrites ici. Le jour 1 vient de src/lib/theme.ts,
// et tout le reste s'y rapporte — jour zéro = la veille (encadrants uniquement,
// d'où la tenue du dimanche), jour 6 = le dernier.
//
// La conférence a été déplacée du 3-8 août au 24-29 août : trois semaines
// exactement, ce qui a conservé les jours de la semaine. Le premier jour reste
// un lundi, le quatrième un jeudi (vêtements du dimanche), le dernier un
// samedi. Le programme des manuels tient donc tel quel. Un déplacement qui ne
// tomberait pas sur un lundi obligerait à reprendre les tenues et les réunions
// spirituelles du dimanche.
//
// DIVERGENCES ENTRE LES DEUX MANUELS — arbitrages retenus :
//  • Jour 5, message « À emporter chez soi » : le manuel du participant indique
//    20 h 15 - 21 h 45, ce qui chevauche l'activité de 21 h en compagnie. Le
//    manuel de l'encadrant indique 20 h 15 - 20 h 45 : horaire retenu.
//  • Jour 6, réunion de clôture : le tableau récapitulatif du manuel de
//    l'encadrant indique 7 h 30 - 8 h, mais les trois sections détaillées
//    (conseiller, adjoint, coordinateur) indiquent 7 h 30 - 8 h 30 : retenu.
//  • Jour 4 : le canevas ne mentionne la répétition du medley que pour les
//    Jeunes Gens ; le manuel de l'encadrant l'indique pour les deux groupes.
//
// PORTÉE DU PROGRAMME PAR NIVEAU — vérifié sur le manuel de l'encadrant
//   Les quatre sections du manuel (conseiller, coordonnateur adjoint,
//   coordonnateur, couple dirigeant) publient **le même tableau horaire** :
//   la journée entière, à l'identique. Ce qui diffère, ce sont les instructions
//   qui suivent le tableau — ce que chaque niveau est attendu d'y faire.
//
//   Le rôle "AUCUN" efface l'activité du programme de ce niveau — c'est ce qui
//   garde chaque programme lisible le jour même.
//
//   Les cellules de rôle suivent le tableau officiel « Aperçu du programme
//   complet » des fascicules 2026, qui fait foi — y compris là où il donne
//   "AUCUN" au couple dirigeant (appel, extinction) : le manuel ne lui y
//   assigne pas de tâche. Une exception, documentée sur place : le départ du
//   dernier jour, où le tableau met un tiret mais où le fascicule du couple
//   ordonne « Tous les encadrants doivent être en service pour le départ des
//   participants » — le texte l'emporte sur le tiret. Ce que chaque niveau
//   doit concrètement FAIRE à chaque activité est porté par les fiches de
//   src/lib/ordres-du-jour.ts, attachées à l'affichage — c'est là que vivent
//   les instructions détaillées de chaque fascicule.
//
// STATUTS
//   "PLANIFIE"    → horaire officiel des manuels.
//   "A_CONFIRMER" → à préciser par la direction d'Abidjan Ouest (lieux,
//                    horaires du jour zéro laissés libres par le manuel).
// ============================================================================

// Le thème est défini dans src/lib/theme.ts et réexporté ici pour le script de
// peuplement, afin qu'il n'existe qu'une seule version du texte.
export { THEME_FSY } from "../src/lib/theme";

// Jour 1 de la conférence — défini une seule fois, dans src/lib/theme.ts.
export { PREMIER_JOUR as DATE_JOUR_1 } from "../src/lib/theme";

export const JOURNEES = [
  {
    numero: 0,
    tenue: null,
    tenueEncadrants: "Vêtements du dimanche",
    note: "Veille de la conférence — encadrants uniquement",
  },
  { numero: 1, tenue: "Tenue décontractée", tenueEncadrants: "Tee-shirt encadrant FSY", note: "Arrivées et enregistrement" },
  { numero: 2, tenue: "Tenue décontractée", tenueEncadrants: "Tee-shirt encadrant FSY", note: "Premier jour des cours · Bal" },
  { numero: 3, tenue: "Tee-shirt FSY", tenueEncadrants: "Tee-shirt encadrant FSY", note: "Dernier jour des cours · Soirée jeux" },
  { numero: 4, tenue: "Vêtements du dimanche", tenueEncadrants: "Vêtements du dimanche", note: "Réunions séparées JG/JF · Spectacles · Témoignages" },
  { numero: 5, tenue: "Tenue décontractée", tenueEncadrants: "Tee-shirt encadrant FSY", note: "Dernière journée complète · Veille de nuit" },
  { numero: 6, tenue: "Tenue décontractée", tenueEncadrants: "Tee-shirt encadrant FSY", note: "Départs dès 7 h" },
];

type Role =
  | "DIRIGER"
  | "ENSEIGNER"
  | "SUPERVISER"
  | "AIDER"
  | "ASSISTER"
  | "RECEVOIR"
  | "FACULTATIF"
  | "SI_ATTRIBUE"
  | "AUCUN";

// Rôles par niveau : [conseiller, adjoint, coordinateur, couple dirigeant]
type Roles = [Role, Role, Role, Role];

// Combinaisons récurrentes du manuel de l'encadrant
const R = {
  // L'appel remonte : le conseiller compte, l'adjoint reçoit, le coordinateur
  // reçoit. Le tableau officiel laisse le couple dirigeant à « AUCUN » — un
  // jeune manquant lui parvient par les coordinateurs, immédiatement (fiche
  // de l'appel dans ordres-du-jour.ts).
  APPEL: ["DIRIGER", "RECEVOIR", "RECEVOIR", "AUCUN"] as Roles,
  REPAS: ["ASSISTER", "SI_ATTRIBUE", "ASSISTER", "ASSISTER"] as Roles,
  CONSEILLER_DIRIGE: ["DIRIGER", "FACULTATIF", "FACULTATIF", "FACULTATIF"] as Roles,
  CONSEILLER_SEUL: ["DIRIGER", "AUCUN", "FACULTATIF", "FACULTATIF"] as Roles,
  TRANQUILLITE: ["SUPERVISER", "AUCUN", "FACULTATIF", "FACULTATIF"] as Roles,
  // Extinction des feux et veille de nuit : le conseiller surveille, l'adjoint
  // et le coordinateur aident — conforme au tableau officiel, qui n'y assigne
  // rien au couple dirigeant.
  EXTINCTION: ["SUPERVISER", "AIDER", "AIDER", "AUCUN"] as Roles,
  REUNION_COORD_ADJOINTS: ["AUCUN", "ASSISTER", "DIRIGER", "FACULTATIF"] as Roles,
  REUNION_COORD_CONSEILLERS: ["ASSISTER", "DIRIGER", "FACULTATIF", "AUCUN"] as Roles,
  SPIRITUELLE: ["ASSISTER", "ASSISTER", "DIRIGER", "ENSEIGNER"] as Roles,
  SPECTACLE: ["SI_ATTRIBUE", "SI_ATTRIBUE", "ASSISTER", "ASSISTER"] as Roles,
  REPETITION: ["SI_ATTRIBUE", "SI_ATTRIBUE", "FACULTATIF", "FACULTATIF"] as Roles,
  COURS: ["SI_ATTRIBUE", "SI_ATTRIBUE", "ASSISTER", "ASSISTER"] as Roles,
  TEMPS_LIBRE: ["SI_ATTRIBUE", "SI_ATTRIBUE", "ASSISTER", "FACULTATIF"] as Roles,
  BAL: ["SI_ATTRIBUE", "SI_ATTRIBUE", "SI_ATTRIBUE", "SI_ATTRIBUE"] as Roles,
};

export type ActiviteSeed = {
  jour: number;
  debut: string; // "07:15"
  fin?: string;
  titre: string;
  lieu?: string;
  description?: string;
  type?: "GENERAL" | "PAR_GROUPE" | "PAR_COMPAGNIE" | "COMPAGNIE" | "GROUPE" | "MULTI_GROUPE";
  publicCible?: "TOUS" | "GARCONS" | "FILLES";
  statut?: "PLANIFIE" | "A_CONFIRMER";
  encadrants?: boolean; // réunion réservée aux encadrants
  r?: Roles;
};

export const PROGRAMME: ActiviteSeed[] = [
  // ══════════ JOUR ZÉRO — dimanche : encadrants uniquement ══════════
  {
    jour: 0,
    debut: "16:00",
    titre: "Visite du lieu de la conférence",
    description:
      "Tous les encadrants découvrent les locaux : salles, logements, réfectoire, terrains et zones de temps libre. Horaire à fixer localement.",
    encadrants: true,
    statut: "A_CONFIRMER",
    r: ["ASSISTER", "ASSISTER", "DIRIGER", "FACULTATIF"],
  },
  {
    jour: 0,
    debut: "17:30",
    titre: "Réunion d'accueil des conseillers",
    description:
      "Formation sur le rôle et les responsabilités des conseillers. Horaire à fixer localement.",
    encadrants: true,
    statut: "A_CONFIRMER",
    r: ["ASSISTER", "ASSISTER", "DIRIGER", "FACULTATIF"],
  },
  {
    jour: 0,
    debut: "19:00",
    fin: "20:00",
    titre: "Message du couple dirigeant",
    description:
      "Réunion obligatoire pour tous les encadrants. Tenue du dimanche, ponctualité et prise de notes.",
    encadrants: true,
    r: R.SPIRITUELLE,
  },
  {
    jour: 0,
    debut: "20:00",
    fin: "20:45",
    titre: "Répartition des coordinateurs adjoints et des conseillers",
    description:
      "Chaque adjoint rencontre les conseillers qu'il supervise : attentes, buts de la semaine, questions.",
    encadrants: true,
    r: ["ASSISTER", "DIRIGER", "AUCUN", "AUCUN"],
  },
  {
    jour: 0,
    debut: "20:00",
    fin: "20:45",
    titre: "Réunion couple dirigeant / coordinateurs",
    encadrants: true,
    r: ["AUCUN", "AUCUN", "DIRIGER", "ASSISTER"],
  },
  {
    jour: 0,
    debut: "20:45",
    fin: "21:45",
    titre: "Entretiens avec les conseillers et planification",
    description:
      "Attribution des groupes et des compagnies, choix du lieu de rassemblement, répartition des enseignements de la semaine (étude de l'Évangile, buts, recueillement, « À emporter chez soi »).",
    encadrants: true,
    r: ["DIRIGER", "ASSISTER", "ASSISTER", "FACULTATIF"],
  },

  // ══════════════ JOUR 1 — lundi : arrivées ══════════════
  { jour: 1, debut: "07:30", fin: "08:20", titre: "Petit-déjeuner des encadrants", encadrants: true, r: ["ASSISTER", "ASSISTER", "ASSISTER", "ASSISTER"] },
  { jour: 1, debut: "08:00", fin: "08:25", titre: "Réunion coordinateurs / adjoints", encadrants: true, r: R.REUNION_COORD_ADJOINTS },
  {
    jour: 1,
    debut: "08:30",
    fin: "09:15",
    titre: "Réunion des encadrants",
    description:
      "Dernière réunion avant l'arrivée des jeunes : changements d'emploi du temps, annonces, procédures d'urgence. Le couple dirigeant donne un message de cinq minutes.",
    encadrants: true,
    r: ["ASSISTER", "ASSISTER", "DIRIGER", "ENSEIGNER"],
  },
  {
    jour: 1,
    debut: "09:15",
    fin: "10:00",
    titre: "Réunion de planification des conseillers",
    description:
      "Préparation de « Rencontre ta compagnie », du nom et du cri de compagnie, de la soirée au foyer et des enseignements des jours 2 à 5.",
    encadrants: true,
    r: R.CONSEILLER_SEUL,
  },
  {
    jour: 1,
    debut: "09:15",
    fin: "10:50",
    titre: "Distribution du matériel | Auditions des chanteurs | Répétition des danseurs",
    encadrants: true,
    r: ["AIDER", "SI_ATTRIBUE", "SUPERVISER", "FACULTATIF"],
  },
  {
    jour: 1,
    debut: "11:00",
    fin: "13:00",
    titre: "Arrivée et enregistrement",
    description:
      "Accueil des jeunes par pieu/district : badge, bracelet, tee-shirt et manuel. Les conseillers valident les arrivées dans l'application (module Cars).",
    r: ["AIDER", "SI_ATTRIBUE", "SUPERVISER", "ASSISTER"],
  },
  {
    jour: 1,
    debut: "13:15",
    fin: "13:30",
    titre: "Vérification des chambres",
    description: "Le cas échéant. Signaler immédiatement toute détérioration au coordinateur adjoint.",
    type: "PAR_GROUPE",
    r: ["DIRIGER", "AIDER", "FACULTATIF", "FACULTATIF"],
  },
  {
    jour: 1,
    debut: "13:30",
    fin: "14:20",
    titre: "Rencontre ton conseiller",
    description:
      "Règles de conduite, sécurité, usage du téléphone, tenue vestimentaire, procédures d'appel, puis signature de l'engagement. Attribution des réunions spirituelles des participants des jours 2 à 5.",
    type: "PAR_GROUPE",
    r: R.CONSEILLER_DIRIGE,
  },
  {
    jour: 1,
    debut: "14:30",
    fin: "15:05",
    titre: "Rencontre ta compagnie",
    description: "Jeux pour faire connaissance (30 min), puis nom et Écriture de la compagnie (10 min).",
    type: "PAR_COMPAGNIE",
    r: R.CONSEILLER_DIRIGE,
  },
  {
    jour: 1,
    debut: "15:05",
    fin: "15:15",
    titre: "Nom et cri de la compagnie",
    type: "PAR_COMPAGNIE",
    r: ["DIRIGER", "FACULTATIF", "FACULTATIF", "FACULTATIF"],
  },
  {
    jour: 1,
    debut: "15:30",
    fin: "16:30",
    titre: "Réunion d'accueil",
    description:
      "Présentation des encadrants et du couple dirigeant, règles de conduite, annonces du spectacle de variétés (auditions jours 2-3) et du spectacle musical (répétitions jours 2-4).",
    r: ["ASSISTER", "AIDER", "DIRIGER", "AIDER"],
  },
  { jour: 1, debut: "16:45", fin: "17:15", titre: "Réunion coordinateurs / adjoints", encadrants: true, r: R.REUNION_COORD_ADJOINTS },
  { jour: 1, debut: "16:45", fin: "17:45", titre: "Dîner", r: R.REPAS },
  { jour: 1, debut: "17:45", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  {
    jour: 1,
    debut: "18:00",
    fin: "18:45",
    titre: "Leçon de la soirée au foyer",
    description: "Le couple dirigeant présente le thème de l'année « Marche avec moi » (Moïse 6:34).",
    r: R.SPIRITUELLE,
  },
  {
    jour: 1,
    debut: "19:00",
    fin: "20:00",
    titre: "Jeux de la soirée au foyer",
    description:
      "Jeux en compagnie suivis d'un bilan de 5 à 10 minutes reliant le jeu aux principes de l'Évangile.",
    type: "PAR_COMPAGNIE",
    r: ["DIRIGER", "ASSISTER", "ASSISTER", "FACULTATIF"],
  },
  {
    jour: 1,
    debut: "20:00",
    fin: "20:45",
    titre: "Se fixer des buts pendant la soirée au foyer",
    description:
      "Introduction (10 min), buts de compagnie (15 min), buts personnels (15 min), conclusion (5 min), selon le modèle Découvrir · Planifier · Agir · Réfléchir · Se réjouir. Passés en revue le 5e jour.",
    type: "PAR_COMPAGNIE",
    r: ["DIRIGER", "FACULTATIF", "FACULTATIF", "FACULTATIF"],
  },
  { jour: 1, debut: "21:00", titre: "Appel", type: "PAR_GROUPE", r: R.APPEL },
  {
    jour: 1,
    debut: "21:00",
    fin: "21:45",
    titre: "Moment de tranquillité | Préparation au coucher",
    description: "Les jeunes désignés préparent la réunion spirituelle matinale des participants du lendemain.",
    type: "PAR_GROUPE",
    r: R.TRANQUILLITE,
  },
  {
    jour: 1,
    debut: "21:45",
    fin: "22:15",
    titre: "Réfléchir et revoir",
    description:
      "Réflexion silencieuse et écrite (5 min), échanges (15 min), « À emporter chez soi » (5 min), annonces et prière (5 min).",
    type: "PAR_GROUPE",
    r: R.CONSEILLER_DIRIGE,
  },
  { jour: 1, debut: "22:30", titre: "Extinction des feux", r: R.EXTINCTION },
  { jour: 1, debut: "22:30", titre: "Réunion coordinateurs / adjoints", encadrants: true, r: R.REUNION_COORD_ADJOINTS },

  // ══════════════ JOUR 2 — mardi 4 août : premier jour des cours ══════════════
  {
    jour: 2,
    debut: "07:00",
    fin: "07:10",
    titre: "Réunion coordinateurs adjoints / conseillers",
    description: "Prière, pensée spirituelle, besoins des conseillers et annonces du jour. Venir habillé et prêt.",
    encadrants: true,
    r: R.REUNION_COORD_CONSEILLERS,
  },
  {
    jour: 2,
    debut: "07:15",
    fin: "07:30",
    titre: "Réunion spirituelle matinale des participants",
    type: "PAR_GROUPE",
    description:
      "Sujet du jour : Aimer Dieu (guide FSY, p. 150-154). Dirigée par un jeune du groupe, suivie des annonces du conseiller.",
    r: ["DIRIGER", "FACULTATIF", "FACULTATIF", "FACULTATIF"],
  },
  { jour: 2, debut: "07:30", fin: "08:30", titre: "Petit-déjeuner", r: R.REPAS },
  {
    jour: 2,
    debut: "08:30",
    fin: "09:30",
    titre: "Étude de l'Évangile",
    type: "PAR_COMPAGNIE",
    description:
      "Enseignement et discussion (20 min), étude personnelle (30 min), échanges (10 min). Thème du jour : la révélation personnelle.",
    r: R.CONSEILLER_DIRIGE,
  },
  {
    jour: 2,
    debut: "08:45",
    fin: "09:15",
    titre: "Réunion couple dirigeant / instructeurs",
    encadrants: true,
    r: ["AUCUN", "AUCUN", "FACULTATIF", "DIRIGER"],
  },
  {
    jour: 2,
    debut: "09:45",
    fin: "10:30",
    titre: "Réunion spirituelle avec le couple dirigeant",
    description:
      "Canevas officiel jour 2 — « Les montagnes fuiront, les fleuves se détourneront » : Dieu peut faire concourir toutes choses à notre bien ; rechercher et attendre des miracles.",
    r: R.SPIRITUELLE,
  },
  {
    jour: 2,
    debut: "10:45",
    fin: "11:30",
    titre: "Cours — 1re session",
    description: "Premier jour des cours ; présentation des instructeurs.",
    r: R.COURS,
  },
  { jour: 2, debut: "11:45", fin: "12:30", titre: "Cours — 2e session", r: R.COURS },
  { jour: 2, debut: "12:30", fin: "13:30", titre: "Déjeuner", r: R.REPAS },
  {
    jour: 2,
    debut: "12:30",
    fin: "13:30",
    titre: "Répétition du spectacle musical",
    description: "Les participants concernés se placent en début de file au réfectoire.",
    r: R.REPETITION,
  },
  { jour: 2, debut: "13:30", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  { jour: 2, debut: "13:45", fin: "14:30", titre: "Cours ou activité — 3e session", r: R.COURS },
  { jour: 2, debut: "13:50", fin: "14:30", titre: "Réunion coordinateurs / adjoints", encadrants: true, r: R.REUNION_COORD_ADJOINTS },
  { jour: 2, debut: "14:45", fin: "15:30", titre: "Cours ou activité — 4e session", r: R.COURS },
  { jour: 2, debut: "15:30", fin: "16:30", titre: "Temps libre des participants", r: R.TEMPS_LIBRE },
  { jour: 2, debut: "15:30", fin: "17:00", titre: "Auditions du spectacle de variétés", r: R.REPETITION },
  { jour: 2, debut: "15:30", fin: "17:00", titre: "Répétition du spectacle musical", r: R.REPETITION },
  {
    jour: 2,
    debut: "16:30",
    fin: "17:00",
    titre: "Réunion coordinateurs adjoints / conseillers",
    description:
      "Obligatoire, sauf pour les conseillers affectés au spectacle musical ou de variétés. Formation et distribution du matériel des bannières.",
    encadrants: true,
    r: ["ASSISTER", "DIRIGER", "ASSISTER", "FACULTATIF"],
  },
  { jour: 2, debut: "16:30", fin: "18:00", titre: "Dîner", r: R.REPAS },
  { jour: 2, debut: "18:00", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  {
    jour: 2,
    debut: "18:00",
    fin: "18:30",
    titre: "Préparation de la bannière et du cri de ralliement",
    type: "PAR_COMPAGNIE",
    description:
      "Les jeunes seuls réalisent bannière et cri ; les conseillers encouragent sans participer. Cri d'une minute maximum, sans accessoire, sans salto ni porté, sans nom de la Divinité ni Écriture.",
    r: ["DIRIGER", "SI_ATTRIBUE", "FACULTATIF", "FACULTATIF"],
  },
  {
    jour: 2,
    debut: "18:30",
    fin: "18:45",
    titre: "Directives pour le bal",
    type: "PAR_COMPAGNIE",
    r: R.CONSEILLER_SEUL,
  },
  { jour: 2, debut: "18:45", fin: "20:45", titre: "Bal", r: R.BAL },
  { jour: 2, debut: "21:00", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  { jour: 2, debut: "21:00", fin: "21:45", titre: "Moment de tranquillité | Préparation au coucher", type: "PAR_GROUPE", r: R.TRANQUILLITE },
  { jour: 2, debut: "21:45", fin: "22:15", titre: "Réfléchir et revoir", type: "PAR_GROUPE", r: R.CONSEILLER_DIRIGE },
  { jour: 2, debut: "22:30", titre: "Extinction des feux", r: R.EXTINCTION },
  { jour: 2, debut: "22:30", titre: "Réunion coordinateurs / adjoints", encadrants: true, r: R.REUNION_COORD_ADJOINTS },

  // ══════════════ JOUR 3 — mercredi 5 août : dernier jour des cours ══════════════
  { jour: 3, debut: "07:00", fin: "07:10", titre: "Réunion coordinateurs adjoints / conseillers", encadrants: true, r: R.REUNION_COORD_CONSEILLERS },
  {
    jour: 3,
    debut: "07:15",
    fin: "07:30",
    titre: "Réunion spirituelle matinale des participants",
    type: "PAR_GROUPE",
    description: "Sujet du jour : Marche dans la lumière de Dieu (guide FSY, p. 156-161).",
    r: ["DIRIGER", "FACULTATIF", "FACULTATIF", "FACULTATIF"],
  },
  { jour: 3, debut: "07:30", fin: "08:30", titre: "Petit-déjeuner", r: R.REPAS },
  {
    jour: 3,
    debut: "08:30",
    fin: "09:30",
    titre: "Étude de l'Évangile",
    type: "PAR_COMPAGNIE",
    description: "Enseignement (15 min), étude personnelle (35 min), échanges (10 min). Se régaler de la parole (2 Néphi 32:3).",
    r: R.CONSEILLER_DIRIGE,
  },
  {
    jour: 3,
    debut: "09:45",
    fin: "10:30",
    titre: "Réunion spirituelle avec le couple dirigeant",
    description:
      "Canevas officiel jour 3 — « Demeure en moi et je demeurerai en toi » : choisir d'entrer et de rester dans une relation d'alliance. Un ou deux jeunes témoignent de ce qu'ils ont appris la veille.",
    r: R.SPIRITUELLE,
  },
  { jour: 3, debut: "10:45", fin: "11:30", titre: "Cours ou activité — 1re session", r: R.COURS },
  { jour: 3, debut: "11:45", fin: "12:30", titre: "Cours ou activité — 2e session", r: R.COURS },
  { jour: 3, debut: "12:30", fin: "13:30", titre: "Déjeuner", r: R.REPAS },
  { jour: 3, debut: "12:30", fin: "13:30", titre: "Répétition du spectacle musical", r: R.REPETITION },
  { jour: 3, debut: "13:30", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  { jour: 3, debut: "13:45", fin: "14:30", titre: "Cours ou activité — 3e session", r: R.COURS },
  { jour: 3, debut: "13:50", fin: "14:30", titre: "Réunion coordinateurs / adjoints", encadrants: true, r: R.REUNION_COORD_ADJOINTS },
  {
    jour: 3,
    debut: "14:45",
    fin: "15:30",
    titre: "Cours ou activité — 4e session (dernière)",
    description: "Dernier cours de la conférence : remerciements aux instructeurs.",
    r: R.COURS,
  },
  { jour: 3, debut: "15:30", fin: "17:00", titre: "Auditions du spectacle de variétés", description: "Sélection finale ce soir.", r: R.REPETITION },
  { jour: 3, debut: "15:30", fin: "17:00", titre: "Répétition du spectacle musical", r: R.REPETITION },
  { jour: 3, debut: "15:30", fin: "16:30", titre: "Temps libre des participants", description: "Mettre le tee-shirt FSY pour la soirée jeux.", r: R.TEMPS_LIBRE },
  { jour: 3, debut: "16:30", fin: "17:00", titre: "Réunion coordinateurs adjoints / conseillers", encadrants: true, r: ["ASSISTER", "DIRIGER", "ASSISTER", "FACULTATIF"] },
  { jour: 3, debut: "16:30", fin: "18:00", titre: "Dîner", description: "Mettre le tee-shirt FSY.", r: R.REPAS },
  { jour: 3, debut: "18:00", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  {
    jour: 3,
    debut: "18:00",
    fin: "18:30",
    titre: "Préparation à la soirée jeux",
    type: "PAR_COMPAGNIE",
    description: "Démonstration des règles de chaque jeu, puis dernière répétition du cri de ralliement.",
    r: ["DIRIGER", "SI_ATTRIBUE", "AIDER", "FACULTATIF"],
  },
  {
    jour: 3,
    debut: "18:45",
    fin: "20:00",
    titre: "Soirée jeux et cris de ralliement",
    description:
      "Jeux inter-compagnies (arbres-troncs-ponts, cris d'animaux, entrée et sortie) dirigés par les coordinateurs adjoints. Les juges passent voir chaque cri de ralliement. Apporter une bouteille d'eau.",
    r: R.SPECTACLE,
  },
  { jour: 3, debut: "20:15", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  {
    jour: 3,
    debut: "20:15",
    fin: "21:00",
    titre: "Soirée plat préféré",
    type: "PAR_COMPAGNIE",
    description: "Petit rassemblement en compagnie, si possible près des logements. Ramener le calme avant « Réfléchir et revoir ».",
    r: ["DIRIGER", "SI_ATTRIBUE", "FACULTATIF", "FACULTATIF"],
  },
  { jour: 3, debut: "21:00", fin: "21:45", titre: "Moment de tranquillité | Préparation au coucher", type: "PAR_GROUPE", r: R.TRANQUILLITE },
  { jour: 3, debut: "21:45", fin: "22:15", titre: "Réfléchir et revoir", type: "PAR_GROUPE", r: R.CONSEILLER_DIRIGE },
  { jour: 3, debut: "22:30", titre: "Extinction des feux", r: R.EXTINCTION },
  { jour: 3, debut: "22:30", titre: "Réunion coordinateurs / adjoints", encadrants: true, r: R.REUNION_COORD_ADJOINTS },

  // ══════════════ JOUR 4 — jeudi 6 août : vêtements du dimanche ══════════════
  { jour: 4, debut: "07:00", fin: "07:10", titre: "Réunion coordinateurs adjoints / conseillers", encadrants: true, r: R.REUNION_COORD_CONSEILLERS },
  {
    jour: 4,
    debut: "07:15",
    fin: "07:30",
    titre: "Réunion spirituelle matinale des participants",
    type: "PAR_GROUPE",
    description: "Sujet du jour : Ton corps est sacré (guide FSY, p. 162-169).",
    r: ["DIRIGER", "FACULTATIF", "FACULTATIF", "FACULTATIF"],
  },
  { jour: 4, debut: "07:30", fin: "08:30", titre: "Petit-déjeuner", r: R.REPAS },
  {
    jour: 4,
    debut: "08:30",
    fin: "09:30",
    titre: "Étude de l'Évangile",
    type: "PAR_COMPAGNIE",
    description: "Enseignement (15 min), étude personnelle (35 min), échanges (10 min).",
    r: R.CONSEILLER_DIRIGE,
  },
  {
    jour: 4,
    debut: "09:45",
    fin: "11:00",
    titre: "Réunion spirituelle des Jeunes Gens | Medley FSY",
    publicCible: "GARCONS",
    description:
      "Canevas officiel jour 4 — le rôle unique d'un jeune homme dans le plan de Dieu (9 h 45 - 10 h 45), récitation du thème des collèges de la Prêtrise d'Aaron, puis répétition du medley de la conférence.",
    r: R.SPIRITUELLE,
  },
  {
    jour: 4,
    debut: "09:45",
    fin: "11:00",
    titre: "Activité des Jeunes Filles",
    publicCible: "FILLES",
    description:
      "« Le Livre de Mormon : un autre témoignage de Jésus-Christ ». Présentation par l'adjoint (20 min), groupes (10 min), discussion et activité (30 min), mise en pratique (10 min), témoignages et prière (5 min).",
    r: ["DIRIGER", "SI_ATTRIBUE", "ASSISTER", "FACULTATIF"],
  },
  {
    jour: 4,
    debut: "11:15",
    fin: "12:30",
    titre: "Réunion spirituelle des Jeunes Filles | Medley FSY",
    publicCible: "FILLES",
    description:
      "Canevas officiel jour 4 — le rôle unique d'une jeune fille dans le plan de Dieu, récitation du thème des Jeunes Filles, puis répétition du medley de la conférence.",
    r: R.SPIRITUELLE,
  },
  {
    jour: 4,
    debut: "11:15",
    fin: "12:30",
    titre: "Activité des Jeunes Gens",
    publicCible: "GARCONS",
    description: "« Le Livre de Mormon : un autre témoignage de Jésus-Christ ».",
    r: ["DIRIGER", "SI_ATTRIBUE", "ASSISTER", "FACULTATIF"],
  },
  { jour: 4, debut: "12:30", fin: "13:30", titre: "Déjeuner", r: R.REPAS },
  {
    jour: 4,
    debut: "12:30",
    fin: "13:45",
    titre: "Répétition générale du spectacle de variétés",
    description: "Les artistes viennent en costume, avec accessoires et instruments accordés.",
    r: ["SI_ATTRIBUE", "SI_ATTRIBUE", "AIDER", "FACULTATIF"],
  },
  { jour: 4, debut: "12:30", fin: "13:30", titre: "Répétition du spectacle musical", r: R.REPETITION },
  { jour: 4, debut: "13:45", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  { jour: 4, debut: "13:45", fin: "14:00", titre: "Directives pour le spectacle de variétés", type: "PAR_COMPAGNIE", r: R.CONSEILLER_SEUL },
  {
    jour: 4,
    debut: "14:15",
    fin: "15:30",
    titre: "Spectacle de variétés",
    description: "Les jeunes s'assoient avec leur compagnie et applaudissent chaque numéro. Environ quinze numéros.",
    r: R.SPECTACLE,
  },
  { jour: 4, debut: "15:30", fin: "16:00", titre: "Réunion coordinateurs / adjoints", encadrants: true, r: R.REUNION_COORD_ADJOINTS },
  { jour: 4, debut: "15:30", fin: "16:30", titre: "Temps libre des participants", r: R.TEMPS_LIBRE },
  { jour: 4, debut: "15:30", fin: "17:00", titre: "Répétition générale du spectacle musical", r: R.REPETITION },
  { jour: 4, debut: "16:30", fin: "17:50", titre: "Dîner", description: "Les participants du spectacle musical dînent rapidement.", r: R.REPAS },
  { jour: 4, debut: "17:50", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  {
    jour: 4,
    debut: "17:50",
    fin: "18:05",
    titre: "Discussion sur le recueillement et le témoignage",
    type: "PAR_COMPAGNIE",
    description:
      "Cantique, lecture de Doctrine et Alliances 88:67-68, puis discussion : le recueillement n'est pas le silence mais un état qui favorise la révélation. Ce qu'est — et n'est pas — un témoignage.",
    r: R.CONSEILLER_SEUL,
  },
  { jour: 4, debut: "18:20", fin: "18:55", titre: "Spectacle musical", r: ["ASSISTER", "SI_ATTRIBUE", "DIRIGER", "ENSEIGNER"] },
  {
    jour: 4,
    debut: "18:55",
    fin: "19:30",
    titre: "Veillée spirituelle du couple dirigeant",
    description: "Message centré sur l'expiation de Jésus-Christ.",
    r: R.SPIRITUELLE,
  },
  { jour: 4, debut: "19:30", fin: "19:40", titre: "Rédaction du témoignage | Medley FSY", r: ["ASSISTER", "SI_ATTRIBUE", "DIRIGER", "ASSISTER"] },
  {
    jour: 4,
    debut: "19:50",
    fin: "20:50",
    titre: "Réunions de témoignage",
    type: "PAR_COMPAGNIE",
    description:
      "Cantique et prière, sièges réservés à l'avant, témoignages simples et sincères centrés sur le Sauveur. Terminer à l'heure ; ceux qui n'ont pas pu témoigner le feront à « Réfléchir et revoir ».",
    r: ["DIRIGER", "FACULTATIF", "FACULTATIF", "FACULTATIF"],
  },
  { jour: 4, debut: "21:00", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  { jour: 4, debut: "21:00", fin: "21:45", titre: "Moment de tranquillité | Préparation au coucher", type: "PAR_GROUPE", r: R.TRANQUILLITE },
  { jour: 4, debut: "21:45", fin: "22:15", titre: "Réfléchir et revoir", type: "PAR_GROUPE", r: R.CONSEILLER_DIRIGE },
  { jour: 4, debut: "22:30", titre: "Extinction des feux", r: R.EXTINCTION },
  { jour: 4, debut: "22:30", titre: "Réunion coordinateurs / adjoints", encadrants: true, r: R.REUNION_COORD_ADJOINTS },

  // ══════════════ JOUR 5 — vendredi 7 août : dernière journée complète ══════════════
  { jour: 5, debut: "07:00", fin: "07:10", titre: "Réunion coordinateurs adjoints / conseillers", encadrants: true, r: R.REUNION_COORD_CONSEILLERS },
  {
    jour: 5,
    debut: "07:15",
    fin: "07:30",
    titre: "Réunion spirituelle matinale des participants",
    type: "PAR_GROUPE",
    description: "Sujet du jour : La vérité t'affranchira (guide FSY, p. 169-173).",
    r: ["DIRIGER", "FACULTATIF", "FACULTATIF", "FACULTATIF"],
  },
  { jour: 5, debut: "07:30", fin: "08:30", titre: "Petit-déjeuner", r: R.REPAS },
  {
    jour: 5,
    debut: "08:30",
    fin: "09:30",
    titre: "Étude de l'Évangile",
    type: "PAR_COMPAGNIE",
    description: "Reconnaître les murmures du Saint-Esprit, cette « petite voix douce » (1 Rois 19:11-12).",
    r: R.CONSEILLER_DIRIGE,
  },
  {
    jour: 5,
    debut: "09:30",
    fin: "10:00",
    titre: "Passer en revue les objectifs fixés",
    type: "PAR_COMPAGNIE",
    description:
      "Leçon de choses (10 min), bilan (15 min), conclusion (5 min) : mesurer les progrès sur les buts du 1er jour et préparer ceux du retour à la maison.",
    r: R.CONSEILLER_DIRIGE,
  },
  { jour: 5, debut: "10:15", fin: "11:00", titre: "Réunion spirituelle avec le couple dirigeant", r: R.SPIRITUELLE },
  {
    jour: 5,
    debut: "11:15",
    fin: "12:30",
    titre: "Activité du guide « Jeunes, soyez forts »",
    description:
      "Présentation par un coordinateur adjoint (20-25 min), puis en compagnie : jeu « bateaux et marins » (20 min), découverte du guide (15 min), histoires et discussion (15 min).",
    r: ["ENSEIGNER", "DIRIGER", "FACULTATIF", "FACULTATIF"],
  },
  { jour: 5, debut: "12:30", fin: "13:30", titre: "Déjeuner", r: R.REPAS },
  { jour: 5, debut: "13:30", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  {
    jour: 5,
    debut: "13:45",
    fin: "15:00",
    titre: "Activité « Vivre l'Évangile »",
    type: "PAR_COMPAGNIE",
    description:
      "Rassembler Israël par l'histoire familiale : introduction (10 min), raconte ton histoire en équipe (20 min), jeu du blob (20 min), découvre et préserve ton histoire (20 min), conclusion (5 min).",
    r: ["ENSEIGNER", "SI_ATTRIBUE", "FACULTATIF", "FACULTATIF"],
  },
  { jour: 5, debut: "15:00", fin: "15:15", titre: "Diaporama", r: ["ASSISTER", "SI_ATTRIBUE", "ASSISTER", "ASSISTER"] },
  {
    jour: 5,
    debut: "15:15",
    fin: "16:30",
    titre: "Temps libre des participants",
    description: "À utiliser pour rassembler ses affaires et se préparer au retour à la maison.",
    r: R.TEMPS_LIBRE,
  },
  { jour: 5, debut: "16:30", fin: "18:00", titre: "Dîner", r: R.REPAS },
  { jour: 5, debut: "18:00", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  { jour: 5, debut: "18:00", fin: "18:15", titre: "Photos", type: "PAR_COMPAGNIE", description: "Échange des coordonnées entre jeunes.", r: R.CONSEILLER_SEUL },
  { jour: 5, debut: "18:15", fin: "20:00", titre: "Bal", r: R.BAL },
  {
    jour: 5,
    debut: "20:15",
    fin: "20:45",
    titre: "Message « À emporter chez soi »",
    description:
      "Invitation « Agir et devenir » : étudier les Écritures et prier chaque jour, être digne d'une recommandation pour le temple, participer aux réunions du sabbat et au séminaire, aimer et servir autrui.",
    r: R.SPIRITUELLE,
  },
  {
    jour: 5,
    debut: "21:00",
    fin: "21:30",
    titre: "« À emporter chez soi » en compagnie",
    type: "PAR_COMPAGNIE",
    description:
      "Discussion (10 min), fixation des buts (5 min), échange des buts (10 min), conclusion et témoignage des conseillers (5 min).",
    r: R.CONSEILLER_DIRIGE,
  },
  { jour: 5, debut: "21:45", titre: "Rassemblement en compagnie | Appel", type: "PAR_COMPAGNIE", r: R.APPEL },
  { jour: 5, debut: "21:45", fin: "22:25", titre: "Moment de tranquillité | Journal", type: "PAR_GROUPE", r: R.TRANQUILLITE },
  { jour: 5, debut: "22:25", titre: "Prière", type: "PAR_GROUPE", r: R.CONSEILLER_SEUL },
  {
    jour: 5,
    debut: "22:30",
    titre: "Extinction des feux | Veille de nuit",
    description:
      "Extinction stricte le dernier soir : des conseillers sont postés aux sorties, cages d'escalier et bâtiments pour surveiller les logements, par rotations.",
    r: R.EXTINCTION,
  },
  { jour: 5, debut: "22:30", titre: "Réunion coordinateurs / adjoints", encadrants: true, r: R.REUNION_COORD_ADJOINTS },

  // ══════════════ JOUR 6 — samedi : départs ══════════════
  {
    jour: 6,
    debut: "06:30",
    fin: "07:00",
    titre: "Préparation au départ",
    type: "PAR_GROUPE",
    // Tableau officiel, sauf le couple : son fascicule ordonne « Tous les
    // encadrants doivent être en service pour le départ des participants » —
    // il supervise, le départ ne peut pas disparaître de son programme.
    // Instructions par niveau : fiche « Préparation au départ ».
    r: ["DIRIGER", "SI_ATTRIBUE", "SUPERVISER", "SUPERVISER"],
  },
  {
    jour: 6,
    debut: "07:00",
    fin: "07:30",
    titre: "Vérification des chambres | Départ des participants",
    type: "PAR_GROUPE",
    description:
      "Inspection de chaque chambre avec les jeunes, récupération des clés, vérification des placards et tiroirs. Les conseillers valident les départs dans l'application (module Cars) et restent avec les jeunes jusqu'à leur prise en charge.",
    // Même arbitrage que « Préparation au départ » : le fascicule du couple
    // le met en service jusqu'au départ du dernier jeune.
    r: ["DIRIGER", "SI_ATTRIBUE", "SUPERVISER", "SUPERVISER"],
  },
  {
    jour: 6,
    debut: "07:30",
    fin: "08:30",
    titre: "Réunion de clôture des encadrants | Remise des clés",
    description:
      "Obligatoire pour tous les encadrants. Bilan de la conférence, remise des clés et rapports de détérioration.",
    encadrants: true,
    r: ["ASSISTER", "ASSISTER", "DIRIGER", "ENSEIGNER"],
  },
];
