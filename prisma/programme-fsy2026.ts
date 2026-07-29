// ============================================================================
// PROGRAMME OFFICIEL — FSY 2026 ABIDJAN OUEST (3 au 8 août 2026)
// ============================================================================
//
// Thème de l'année : Moïse 6:34 — « Marche avec moi »
//
// SOURCES ET NIVEAU DE CERTITUDE
//
// Deux statuts sont utilisés pour distinguer ce qui est officiel de ce qui
// reste à valider par les coordinateurs :
//
//   statut: "PLANIFIE"    → horaire ET contenu confirmés par les canevas
//                            officiels des réunions spirituelles FSY 2026.
//   statut: "A_CONFIRMER" → structure standard d'une journée FSY ; l'horaire
//                            doit être confirmé avec le manuel du personnel
//                            (« 2026 FSY International Staff Handbook »).
//
// Éléments explicitement documentés dans les canevas officiels reçus :
//   • Jour 2 = premier jour des cours ; réunion spirituelle
//     « Les montagnes fuiront, les fleuves se détourneront ».
//   • Jour 3 = dernier jour des cours ; réunion spirituelle
//     « Demeure en moi et je demeurerai en toi » (relation d'alliance).
//   • Jour 4 = réunions spirituelles SÉPARÉES Jeunes Gens / Jeunes Filles,
//     de 9 h 45 à 10 h 45 (60 min), puis répétition du medley de la
//     conférence de 10 h 45 à 11 h 00.  ← seuls horaires officiels connus
//   • Réunion « Réfléchir et revoir » en compagnie à la fin de chaque journée.
//
// L'heure de 9 h 45 pour les réunions spirituelles matinales des autres jours
// est alignée sur le seul horaire officiel connu (jour 4), et reste à
// confirmer.
// ============================================================================

export const THEME_FSY = {
  reference: "Moïse 6:34",
  titre: "Marche avec moi",
  texte:
    "Voici, mon Esprit est sur toi, c'est pourquoi je justifierai toutes tes paroles. " +
    "Les montagnes fuiront devant toi et les fleuves se détourneront de leur cours. " +
    "Tu demeureras en moi et moi en toi ; c'est pourquoi, marche avec moi.",
};

export type ActiviteSeed = {
  jour: number; // 1 à 6
  h: number;
  m?: number;
  finH?: number;
  finM?: number;
  titre: string;
  lieu?: string;
  description?: string;
  type?: "GENERAL" | "COMPAGNIE" | "GROUPE" | "MULTI_GROUPE";
  publicCible?: "TOUS" | "GARCONS" | "FILLES";
  statut?: "PLANIFIE" | "A_CONFIRMER";
};

// Jour 1 = lundi 3 août 2026 … Jour 6 = samedi 8 août 2026
export const DATE_JOUR_1 = { annee: 2026, mois: 7 /* août */, jour: 3 };

export const PROGRAMME: ActiviteSeed[] = [
  // ─────────────────────── JOUR 1 — lundi 3 août : arrivées ───────────────
  {
    jour: 1,
    h: 10,
    titre: "Arrivée des cars et enregistrement",
    lieu: "Entrée principale",
    description:
      "Accueil des jeunes par pieu/district. Les conseillers valident les arrivées dans l'application (module Cars).",
    statut: "A_CONFIRMER",
  },
  {
    jour: 1,
    h: 12,
    m: 30,
    titre: "Déjeuner",
    lieu: "Réfectoire",
    statut: "A_CONFIRMER",
  },
  {
    jour: 1,
    h: 14,
    titre: "Installation dans les logements",
    description: "Répartition par groupe, accompagnée par les conseillers.",
    statut: "A_CONFIRMER",
  },
  {
    jour: 1,
    h: 15,
    m: 30,
    titre: "Réunion d'ouverture de la conférence",
    lieu: "Grand auditorium",
    description:
      "Accueil par le couple dirigeant, présentation du thème « Marche avec moi » (Moïse 6:34) et des règles de la conférence.",
    statut: "A_CONFIRMER",
  },
  {
    jour: 1,
    h: 17,
    titre: "Première réunion de compagnie",
    description:
      "Les jeunes rencontrent leur conseiller et leur compagnie : présentations, attentes, esprit de la semaine.",
    type: "COMPAGNIE",
    statut: "A_CONFIRMER",
  },
  { jour: 1, h: 18, m: 30, titre: "Dîner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 1,
    h: 20,
    titre: "Activité d'ouverture",
    lieu: "Esplanade",
    description: "Jeux de connaissance entre compagnies.",
    statut: "A_CONFIRMER",
  },
  {
    jour: 1,
    h: 21,
    m: 30,
    titre: "Réfléchir et revoir",
    description:
      "Réunion de fin de journée en compagnie : les jeunes racontent ce qu'ils ont appris et ressenti.",
    type: "COMPAGNIE",
    statut: "A_CONFIRMER",
  },

  // ────────────── JOUR 2 — mardi 4 août : premier jour des cours ──────────
  { jour: 2, h: 7, titre: "Petit-déjeuner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 2,
    h: 8,
    titre: "Étude personnelle des Écritures",
    description: "Temps d'étude et de journal personnel.",
    statut: "A_CONFIRMER",
  },
  {
    jour: 2,
    h: 9,
    m: 45,
    finH: 10,
    finM: 30,
    titre: "Réunion spirituelle : « Les montagnes fuiront »",
    lieu: "Grand auditorium",
    description:
      "Canevas officiel jour 2 — Dieu peut faire concourir toutes choses à notre bien ; rechercher et attendre des miracles. Les jeunes sont invités à faire rapport chaque jour de ce qu'ils apprennent en cours.",
    statut: "A_CONFIRMER",
  },
  {
    jour: 2,
    h: 11,
    titre: "Cours — 1re session",
    description:
      "Premier jour des cours de la conférence (confirmé par le canevas du jour 2). Présentation des instructeurs.",
    statut: "A_CONFIRMER",
  },
  { jour: 2, h: 12, m: 30, titre: "Déjeuner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  { jour: 2, h: 14, titre: "Cours — 2e session", statut: "A_CONFIRMER" },
  {
    jour: 2,
    h: 16,
    titre: "Activités sportives et récréatives",
    lieu: "Terrain de sport",
    statut: "A_CONFIRMER",
  },
  { jour: 2, h: 18, m: 30, titre: "Dîner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 2,
    h: 20,
    titre: "Soirée de variétés et talents",
    lieu: "Grand auditorium",
    statut: "A_CONFIRMER",
  },
  {
    jour: 2,
    h: 21,
    m: 30,
    titre: "Réfléchir et revoir",
    description:
      "En compagnie. Les conseillers peuvent signaler aux coordinateurs adjoints les jeunes prêts à témoigner à la réunion spirituelle du lendemain.",
    type: "COMPAGNIE",
    statut: "A_CONFIRMER",
  },

  // ────────────── JOUR 3 — mercredi 5 août : dernier jour des cours ───────
  { jour: 3, h: 7, titre: "Petit-déjeuner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  { jour: 3, h: 8, titre: "Étude personnelle des Écritures", statut: "A_CONFIRMER" },
  {
    jour: 3,
    h: 9,
    m: 45,
    finH: 10,
    finM: 30,
    titre: "Réunion spirituelle : « Demeure en moi et je demeurerai en toi »",
    lieu: "Grand auditorium",
    description:
      "Canevas officiel jour 3 — Choisir d'entrer et de rester dans une relation d'alliance avec le Père céleste et Jésus-Christ. Un ou deux jeunes témoignent de ce qu'ils ont appris la veille en cours.",
    statut: "A_CONFIRMER",
  },
  {
    jour: 3,
    h: 11,
    titre: "Cours — 3e session",
    description:
      "Dernier jour des cours de la conférence (confirmé par le canevas du jour 3).",
    statut: "A_CONFIRMER",
  },
  { jour: 3, h: 12, m: 30, titre: "Déjeuner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 3,
    h: 14,
    titre: "Cours — 4e session (dernière)",
    description: "Remerciements aux instructeurs à l'issue de la dernière session.",
    statut: "A_CONFIRMER",
  },
  {
    jour: 3,
    h: 16,
    titre: "Activité de service",
    description: "Projet de service par compagnie.",
    type: "COMPAGNIE",
    statut: "A_CONFIRMER",
  },
  { jour: 3, h: 18, m: 30, titre: "Dîner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 3,
    h: 20,
    titre: "Soirée de danse",
    lieu: "Esplanade",
    statut: "A_CONFIRMER",
  },
  {
    jour: 3,
    h: 21,
    m: 30,
    titre: "Réfléchir et revoir",
    type: "COMPAGNIE",
    statut: "A_CONFIRMER",
  },

  // ── JOUR 4 — jeudi 6 août : réunions spirituelles séparées (HORAIRES OFFICIELS) ──
  { jour: 4, h: 7, titre: "Petit-déjeuner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  { jour: 4, h: 8, titre: "Étude personnelle des Écritures", statut: "A_CONFIRMER" },
  {
    jour: 4,
    h: 9,
    m: 45,
    finH: 10,
    finM: 45,
    titre: "Réunion spirituelle des Jeunes Gens",
    lieu: "Grand auditorium",
    description:
      "Canevas officiel jour 4 (60 min) — Comprendre et remplir le rôle unique d'un jeune homme dans le plan de Dieu. Récitation du thème des collèges de la Prêtrise d'Aaron.",
    publicCible: "GARCONS",
    statut: "PLANIFIE",
  },
  {
    jour: 4,
    h: 9,
    m: 45,
    finH: 10,
    finM: 45,
    titre: "Réunion spirituelle des Jeunes Filles",
    lieu: "Salle annexe",
    description:
      "Canevas officiel jour 4 (60 min) — Comprendre et remplir le rôle unique d'une jeune fille dans le plan de Dieu.",
    publicCible: "FILLES",
    statut: "PLANIFIE",
  },
  {
    jour: 4,
    h: 10,
    m: 45,
    finH: 11,
    titre: "Répétition du medley de la conférence — Jeunes Gens",
    lieu: "Grand auditorium",
    description: "Horaire officiel : juste après la réunion spirituelle des Jeunes Gens.",
    publicCible: "GARCONS",
    statut: "PLANIFIE",
  },
  {
    jour: 4,
    h: 11,
    m: 30,
    titre: "Activités de compagnie",
    type: "COMPAGNIE",
    statut: "A_CONFIRMER",
  },
  { jour: 4, h: 12, m: 30, titre: "Déjeuner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 4,
    h: 14,
    titre: "Grands jeux inter-compagnies",
    lieu: "Terrain de sport",
    statut: "A_CONFIRMER",
  },
  { jour: 4, h: 18, m: 30, titre: "Dîner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 4,
    h: 20,
    titre: "Veillée et spectacle",
    lieu: "Grand auditorium",
    statut: "A_CONFIRMER",
  },
  {
    jour: 4,
    h: 21,
    m: 30,
    titre: "Réfléchir et revoir",
    type: "COMPAGNIE",
    statut: "A_CONFIRMER",
  },

  // ────────────── JOUR 5 — vendredi 7 août : témoignages ─────────────────
  { jour: 5, h: 7, titre: "Petit-déjeuner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  { jour: 5, h: 8, titre: "Étude personnelle des Écritures", statut: "A_CONFIRMER" },
  {
    jour: 5,
    h: 9,
    m: 45,
    finH: 10,
    finM: 30,
    titre: "Réunion spirituelle matinale",
    lieu: "Grand auditorium",
    description: "Thème de la semaine : « Marche avec moi » (Moïse 6:34).",
    statut: "A_CONFIRMER",
  },
  {
    jour: 5,
    h: 11,
    titre: "Répétition générale du medley de la conférence",
    lieu: "Grand auditorium",
    statut: "A_CONFIRMER",
  },
  { jour: 5, h: 12, m: 30, titre: "Déjeuner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 5,
    h: 14,
    titre: "Photos de compagnie et activités",
    type: "COMPAGNIE",
    statut: "A_CONFIRMER",
  },
  {
    jour: 5,
    h: 16,
    titre: "Temps de préparation spirituelle",
    description: "Étude, journal et prière avant la réunion de témoignages.",
    statut: "A_CONFIRMER",
  },
  { jour: 5, h: 18, titre: "Dîner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 5,
    h: 19,
    m: 30,
    titre: "Réunion de témoignages",
    lieu: "Grand auditorium",
    description: "Moment fort de la conférence : les jeunes rendent témoignage.",
    statut: "A_CONFIRMER",
  },
  {
    jour: 5,
    h: 21,
    m: 30,
    titre: "Réfléchir et revoir — dernière soirée",
    type: "COMPAGNIE",
    statut: "A_CONFIRMER",
  },

  // ────────────── JOUR 6 — samedi 8 août : clôture et départs ────────────
  { jour: 6, h: 7, titre: "Petit-déjeuner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 6,
    h: 8,
    titre: "Rangement et remise des logements",
    description: "Les conseillers vérifient les chambres et les affaires de leur groupe.",
    statut: "A_CONFIRMER",
  },
  {
    jour: 6,
    h: 9,
    m: 45,
    titre: "Réunion de clôture et medley de la conférence FSY",
    lieu: "Grand auditorium",
    statut: "A_CONFIRMER",
  },
  {
    jour: 6,
    h: 11,
    m: 30,
    titre: "Au revoir et photos",
    type: "COMPAGNIE",
    statut: "A_CONFIRMER",
  },
  { jour: 6, h: 12, m: 30, titre: "Déjeuner", lieu: "Réfectoire", statut: "A_CONFIRMER" },
  {
    jour: 6,
    h: 14,
    titre: "Départ des cars vers les pieux et districts",
    lieu: "Entrée principale",
    description:
      "Les conseillers valident les départs dans l'application (module Cars) avant que les cars ne quittent le site.",
    statut: "A_CONFIRMER",
  },
];
