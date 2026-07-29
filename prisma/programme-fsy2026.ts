// ============================================================================
// PROGRAMME OFFICIEL — FSY 2026 ABIDJAN OUEST (3 au 8 août 2026)
// ============================================================================
//
// Thème de l'année : Moïse 6:34 — « Marche avec moi »
//
// SOURCE
//
// Horaires repris du « Manuel du participant — Conférence Jeunes, soyez forts
// 2026 : Marche avec moi » (PD80053002 140), programmes des 1er au 5e jours,
// complétés par les canevas officiels des réunions spirituelles matinales des
// jours 2, 3 et 4 (PD80061859 140) pour les thèmes doctrinaux.
//
// Correspondance des dates : jour 1 = lundi 3 août 2026 … jour 5 = vendredi
// 7 août 2026. Le manuel du participant s'arrête au 5e jour (dont la soirée
// invite à « rassembler tes affaires et te préparer à rentrer chez toi ») ;
// le 6e jour, samedi 8 août, est donc la journée des départs.
//
// STATUTS
//   "PLANIFIE"    → horaire officiel du manuel du participant.
//   "A_CONFIRMER" → à valider par les coordinateurs : uniquement le jour 6
//                   (départs, absent du manuel) et les lieux, que la direction
//                   d'Abidjan Ouest doit renseigner.
//
// Le manuel est le manuel FSY *international* : les responsables locaux peuvent
// ajuster certains créneaux. Les modifications se font dans l'application
// (page Programme), ce qui conserve la trace de qui a changé quoi et quand.
// ============================================================================

export const THEME_FSY = {
  reference: "Moïse 6:34",
  titre: "Marche avec moi",
  texte:
    "Voici, mon Esprit est sur toi, c'est pourquoi je justifierai toutes tes paroles. " +
    "Les montagnes fuiront devant toi et les fleuves se détourneront de leur cours. " +
    "Tu demeureras en moi et moi en toi ; c'est pourquoi, marche avec moi.",
};

// Jour 1 = lundi 3 août 2026
export const DATE_JOUR_1 = { annee: 2026, mois: 7 /* août */, jour: 3 };

export const JOURNEES = [
  { numero: 1, tenue: "Tenue décontractée", note: "Arrivées et enregistrement" },
  { numero: 2, tenue: "Tenue décontractée", note: "Premier jour des cours" },
  { numero: 3, tenue: "Tenue décontractée (tee-shirt FSY)", note: "Dernier jour des cours" },
  { numero: 4, tenue: "Vêtements du dimanche", note: "Réunions spirituelles séparées, spectacles et témoignages" },
  { numero: 5, tenue: "Tenue décontractée", note: "Dernière journée complète" },
  { numero: 6, tenue: "Tenue décontractée", note: "Départs (à confirmer)" },
];

export type ActiviteSeed = {
  jour: number;
  debut: string; // "07:15"
  fin?: string; // "07:30"
  titre: string;
  lieu?: string;
  description?: string;
  type?: "GENERAL" | "PAR_GROUPE" | "PAR_COMPAGNIE" | "COMPAGNIE" | "GROUPE" | "MULTI_GROUPE";
  publicCible?: "TOUS" | "GARCONS" | "FILLES";
  statut?: "PLANIFIE" | "A_CONFIRMER";
};

export const PROGRAMME: ActiviteSeed[] = [
  // ══════════════ JOUR 1 — lundi 3 août : arrivées ══════════════
  {
    jour: 1,
    debut: "11:00",
    fin: "13:00",
    titre: "Arrivée et enregistrement",
    description:
      "Accueil des jeunes par pieu/district. Les conseillers valident les arrivées dans l'application (module Cars).",
  },
  { jour: 1, debut: "13:15", fin: "13:30", titre: "Vérification des chambres", description: "Le cas échéant." },
  {
    jour: 1,
    debut: "13:30",
    fin: "14:20",
    titre: "Fais la connaissance de ton conseiller",
    type: "PAR_GROUPE",
    description:
      "Le conseiller passe en revue avec chaque jeune les règles de conduite, la sécurité, l'usage du téléphone et la tenue vestimentaire, puis fait signer l'engagement.",
  },
  {
    jour: 1,
    debut: "14:30",
    fin: "15:05",
    titre: "Fais la connaissance des membres de ta compagnie",
    type: "PAR_COMPAGNIE",
  },
  {
    jour: 1,
    debut: "15:05",
    fin: "15:15",
    titre: "Nom et chant de la compagnie",
    type: "PAR_COMPAGNIE",
  },
  {
    jour: 1,
    debut: "15:30",
    fin: "16:30",
    titre: "Réunion d'accueil",
    description:
      "Instructions sur le spectacle de variétés (auditions les jours 2 et 3) et le spectacle musical (répétitions les jours 2, 3 et 4).",
  },
  { jour: 1, debut: "16:45", fin: "17:45", titre: "Dîner" },
  { jour: 1, debut: "17:45", titre: "Rendez-vous avec la compagnie | Appel", type: "PAR_COMPAGNIE" },
  {
    jour: 1,
    debut: "18:00",
    fin: "18:45",
    titre: "Leçon de la soirée au foyer",
    description: "Message du couple dirigeant de la conférence.",
  },
  { jour: 1, debut: "19:00", fin: "20:00", titre: "Jeux de la soirée au foyer" },
  {
    jour: 1,
    debut: "20:00",
    fin: "20:45",
    titre: "Se fixer des buts pendant la soirée au foyer",
    type: "PAR_COMPAGNIE",
    description:
      "Buts personnels et buts de compagnie, selon le modèle de progression (Découvrir, Planifier, Agir). Ils seront passés en revue le 5e jour.",
  },
  {
    jour: 1,
    debut: "21:00",
    fin: "21:45",
    titre: "Appel | Temps calme : préparation au coucher",
    type: "PAR_GROUPE",
    description: "Préparation de la réunion spirituelle matinale des participants du lendemain.",
  },
  {
    jour: 1,
    debut: "21:45",
    fin: "22:15",
    titre: "Réfléchir et revoir | Journal | Prière",
    type: "PAR_GROUPE",
    description: "Le conseiller réunit son groupe pour revenir sur la journée.",
  },
  { jour: 1, debut: "22:30", titre: "Extinction des feux" },

  // ══════════════ JOUR 2 — mardi 4 août : premier jour des cours ══════════════
  {
    jour: 2,
    debut: "07:15",
    fin: "07:30",
    titre: "Réunion spirituelle matinale des participants",
    type: "PAR_GROUPE",
    description:
      "Sujet du jour : Aimer Dieu. Dirigée par un jeune du groupe (cantique, prière, pensée spirituelle tirée du guide FSY), suivie des annonces du conseiller.",
  },
  { jour: 2, debut: "07:30", fin: "08:30", titre: "Petit-déjeuner" },
  { jour: 2, debut: "08:30", fin: "09:30", titre: "Étude de l'Évangile" },
  {
    jour: 2,
    debut: "09:45",
    fin: "10:30",
    titre: "Réunion spirituelle avec le couple dirigeant",
    description:
      "Canevas officiel jour 2 — « Les montagnes fuiront, les fleuves se détourneront » : Dieu peut faire concourir toutes choses à notre bien ; rechercher et attendre des miracles.",
  },
  { jour: 2, debut: "10:45", fin: "11:30", titre: "Cours — 1re session", description: "Premier jour des cours ; présentation des instructeurs." },
  { jour: 2, debut: "11:45", fin: "12:30", titre: "Cours — 2e session" },
  {
    jour: 2,
    debut: "12:30",
    fin: "13:30",
    titre: "Déjeuner",
    description:
      "Répétitions du spectacle musical pendant le déjeuner. Les participants concernés se placent en début de file.",
  },
  { jour: 2, debut: "13:30", titre: "Rendez-vous avec la compagnie | Appel", type: "PAR_COMPAGNIE" },
  { jour: 2, debut: "13:45", fin: "14:30", titre: "Cours ou activité — 3e session" },
  { jour: 2, debut: "14:45", fin: "15:30", titre: "Cours ou activité — 4e session" },
  {
    jour: 2,
    debut: "15:30",
    fin: "17:00",
    titre: "Répétition du spectacle musical | Auditions du spectacle de variétés",
    description: "Pour les participants inscrits.",
  },
  { jour: 2, debut: "15:30", fin: "16:30", titre: "Temps libre des participants" },
  { jour: 2, debut: "16:30", fin: "18:00", titre: "Dîner" },
  { jour: 2, debut: "18:00", titre: "Rendez-vous avec la compagnie | Appel", type: "PAR_COMPAGNIE" },
  {
    jour: 2,
    debut: "18:00",
    fin: "18:30",
    titre: "Préparation de la bannière et du cri de ralliement",
    type: "PAR_COMPAGNIE",
    description:
      "Les jeunes seuls réalisent la bannière et le cri ; les conseillers encouragent mais ne participent pas. Cri d'une minute maximum, sans accessoire, sans salto ni porté, sans nom de la Divinité ni Écriture.",
  },
  { jour: 2, debut: "18:30", fin: "18:45", titre: "Relecture des directives pour le bal" },
  { jour: 2, debut: "18:45", fin: "20:45", titre: "Bal" },
  {
    jour: 2,
    debut: "21:00",
    fin: "21:45",
    titre: "Appel | Temps calme : préparation au coucher",
    type: "PAR_GROUPE",
  },
  { jour: 2, debut: "21:45", fin: "22:15", titre: "Réfléchir et revoir | Journal | Prière", type: "PAR_GROUPE" },
  { jour: 2, debut: "22:30", titre: "Extinction des feux" },

  // ══════════════ JOUR 3 — mercredi 5 août : dernier jour des cours ══════════════
  {
    jour: 3,
    debut: "07:15",
    fin: "07:30",
    titre: "Réunion spirituelle matinale des participants",
    type: "PAR_GROUPE",
    description: "Sujet du jour : Marche dans la lumière de Dieu.",
  },
  { jour: 3, debut: "07:30", fin: "08:30", titre: "Petit-déjeuner" },
  { jour: 3, debut: "08:30", fin: "09:30", titre: "Étude de l'Évangile" },
  {
    jour: 3,
    debut: "09:45",
    fin: "10:30",
    titre: "Réunion spirituelle avec le couple dirigeant",
    description:
      "Canevas officiel jour 3 — « Demeure en moi et je demeurerai en toi » : choisir d'entrer et de rester dans une relation d'alliance. Un ou deux jeunes témoignent de ce qu'ils ont appris en cours la veille.",
  },
  { jour: 3, debut: "10:45", fin: "11:30", titre: "Cours ou activité — 1re session" },
  { jour: 3, debut: "11:45", fin: "12:30", titre: "Cours ou activité — 2e session" },
  {
    jour: 3,
    debut: "12:30",
    fin: "13:30",
    titre: "Déjeuner",
    description: "Répétitions du spectacle musical pendant le déjeuner.",
  },
  { jour: 3, debut: "13:30", titre: "Rendez-vous avec la compagnie | Appel", type: "PAR_COMPAGNIE" },
  { jour: 3, debut: "13:45", fin: "14:30", titre: "Cours ou activité — 3e session" },
  {
    jour: 3,
    debut: "14:45",
    fin: "15:30",
    titre: "Cours ou activité — 4e session (dernière)",
    description: "Dernier cours de la conférence : remerciements aux instructeurs.",
  },
  {
    jour: 3,
    debut: "15:30",
    fin: "17:00",
    titre: "Répétition du spectacle musical | Auditions du spectacle de variétés",
  },
  { jour: 3, debut: "15:30", fin: "16:30", titre: "Temps libre des participants" },
  { jour: 3, debut: "16:30", fin: "18:00", titre: "Dîner", description: "Mettre le tee-shirt FSY." },
  { jour: 3, debut: "18:00", titre: "Rendez-vous avec la compagnie | Appel", type: "PAR_COMPAGNIE" },
  { jour: 3, debut: "18:00", fin: "18:30", titre: "Préparation de la soirée jeux", type: "PAR_COMPAGNIE" },
  {
    jour: 3,
    debut: "18:45",
    fin: "20:00",
    titre: "Soirée jeux et cris de ralliement",
    description:
      "Jeux inter-compagnies dirigés par les coordinateurs adjoints, puis présentation des cris de ralliement devant les juges.",
  },
  { jour: 3, debut: "20:15", fin: "21:00", titre: "Soirée plat préféré" },
  {
    jour: 3,
    debut: "21:00",
    fin: "21:45",
    titre: "Appel | Temps calme : préparation au coucher",
    type: "PAR_GROUPE",
  },
  { jour: 3, debut: "21:45", fin: "22:15", titre: "Réfléchir et revoir | Journal | Prière", type: "PAR_GROUPE" },
  { jour: 3, debut: "22:30", titre: "Extinction des feux" },

  // ══════════════ JOUR 4 — jeudi 6 août : vêtements du dimanche ══════════════
  {
    jour: 4,
    debut: "07:15",
    fin: "07:30",
    titre: "Réunion spirituelle matinale des participants",
    type: "PAR_GROUPE",
    description: "Sujet du jour : Ton corps est sacré.",
  },
  { jour: 4, debut: "07:30", fin: "08:30", titre: "Petit-déjeuner" },
  { jour: 4, debut: "08:30", fin: "09:30", titre: "Étude de l'Évangile" },
  {
    jour: 4,
    debut: "09:45",
    fin: "11:00",
    titre: "Réunion spirituelle des Jeunes Gens",
    publicCible: "GARCONS",
    description:
      "Canevas officiel jour 4 — le rôle unique d'un jeune homme dans le plan de Dieu (60 min, de 9 h 45 à 10 h 45), récitation du thème des collèges de la Prêtrise d'Aaron, puis répétition du medley de la conférence de 10 h 45 à 11 h 00.",
  },
  {
    jour: 4,
    debut: "09:45",
    fin: "11:00",
    titre: "Activité des Jeunes Filles",
    publicCible: "FILLES",
    description:
      "« Le Livre de Mormon : un autre témoignage de Jésus-Christ » — les preuves de sa véracité et la promesse de Moroni.",
  },
  {
    jour: 4,
    debut: "11:15",
    fin: "12:30",
    titre: "Réunion spirituelle des Jeunes Filles",
    publicCible: "FILLES",
    description:
      "Canevas officiel jour 4 — le rôle unique d'une jeune fille dans le plan de Dieu.",
  },
  {
    jour: 4,
    debut: "11:15",
    fin: "12:30",
    titre: "Activité des Jeunes Gens",
    publicCible: "GARCONS",
    description: "« Le Livre de Mormon : un autre témoignage de Jésus-Christ ».",
  },
  {
    jour: 4,
    debut: "12:30",
    fin: "13:45",
    titre: "Déjeuner",
    description:
      "Répétition générale du spectacle de variétés et répétition du spectacle musical pendant le déjeuner.",
  },
  { jour: 4, debut: "13:45", titre: "Rendez-vous avec la compagnie | Appel", type: "PAR_COMPAGNIE" },
  { jour: 4, debut: "13:45", fin: "14:00", titre: "Directives pour le spectacle de variétés" },
  {
    jour: 4,
    debut: "14:15",
    fin: "15:30",
    titre: "Spectacle de variétés",
    description: "Les jeunes s'assoient avec leur compagnie et applaudissent chaque numéro.",
  },
  { jour: 4, debut: "15:30", fin: "17:00", titre: "Répétition générale du spectacle musical" },
  { jour: 4, debut: "15:30", fin: "16:30", titre: "Temps libre des participants" },
  { jour: 4, debut: "16:30", fin: "17:50", titre: "Dîner" },
  { jour: 4, debut: "17:50", titre: "Rendez-vous avec la compagnie | Appel", type: "PAR_COMPAGNIE" },
  { jour: 4, debut: "17:50", fin: "18:05", titre: "Discussion sur le recueillement et le témoignage" },
  { jour: 4, debut: "18:20", fin: "18:55", titre: "Spectacle musical" },
  { jour: 4, debut: "18:55", fin: "19:30", titre: "Veillée spirituelle" },
  { jour: 4, debut: "19:30", fin: "19:40", titre: "Rédaction du témoignage | Medley FSY" },
  {
    jour: 4,
    debut: "19:50",
    fin: "20:50",
    titre: "Réunions de témoignage",
    type: "PAR_COMPAGNIE",
    description: "Témoignages simples et sincères, centrés sur le Sauveur.",
  },
  {
    jour: 4,
    debut: "21:00",
    fin: "21:45",
    titre: "Appel | Temps calme : préparation au coucher",
    type: "PAR_GROUPE",
  },
  { jour: 4, debut: "21:45", fin: "22:15", titre: "Réfléchir et revoir | Journal | Prière", type: "PAR_GROUPE" },
  { jour: 4, debut: "22:30", titre: "Extinction des feux" },

  // ══════════════ JOUR 5 — vendredi 7 août : dernière journée complète ══════════════
  {
    jour: 5,
    debut: "07:15",
    fin: "07:30",
    titre: "Réunion spirituelle matinale des participants",
    type: "PAR_GROUPE",
    description: "Sujet du jour : La vérité t'affranchira.",
  },
  { jour: 5, debut: "07:30", fin: "08:30", titre: "Petit-déjeuner" },
  { jour: 5, debut: "08:30", fin: "09:30", titre: "Étude de l'Évangile" },
  {
    jour: 5,
    debut: "09:30",
    fin: "10:00",
    titre: "Évaluation des buts fixés",
    description: "Retour sur les buts personnels et de compagnie définis le 1er jour.",
  },
  { jour: 5, debut: "10:15", fin: "11:00", titre: "Réunion spirituelle avec le couple dirigeant" },
  {
    jour: 5,
    debut: "11:15",
    fin: "12:30",
    titre: "Activité du guide « Jeunes, soyez forts »",
    description: "Découverte du guide FSY : vérités éternelles, invitations et bénédictions promises.",
  },
  { jour: 5, debut: "12:30", fin: "13:30", titre: "Déjeuner" },
  { jour: 5, debut: "13:30", titre: "Rendez-vous avec la compagnie | Appel", type: "PAR_COMPAGNIE" },
  {
    jour: 5,
    debut: "13:45",
    fin: "15:00",
    titre: "Activité « Vivre l'Évangile »",
    type: "PAR_COMPAGNIE",
    description:
      "Rassembler Israël grâce à l'œuvre de l'histoire familiale : raconter et noter son histoire familiale, puis établir un plan de développement personnel.",
  },
  { jour: 5, debut: "15:00", fin: "15:15", titre: "Diaporama" },
  {
    jour: 5,
    debut: "15:15",
    fin: "16:30",
    titre: "Temps libre",
    description: "À utiliser pour rassembler ses affaires et se préparer au retour à la maison.",
  },
  { jour: 5, debut: "16:30", fin: "18:00", titre: "Dîner" },
  { jour: 5, debut: "18:00", titre: "Rendez-vous avec la compagnie | Appel", type: "PAR_COMPAGNIE" },
  { jour: 5, debut: "18:00", fin: "18:15", titre: "Photos", type: "PAR_COMPAGNIE" },
  { jour: 5, debut: "18:15", fin: "20:00", titre: "Bal" },
  {
    jour: 5,
    debut: "20:15",
    fin: "21:45",
    titre: "Message « À emporter chez soi »",
    description:
      "Message final du couple dirigeant : étudier les Écritures et prier chaque jour, être digne d'une recommandation pour le temple, participer aux réunions du sabbat et au séminaire, servir autrui.",
  },
  {
    jour: 5,
    debut: "21:00",
    fin: "21:30",
    titre: "« À emporter chez soi » en compagnie",
    type: "PAR_COMPAGNIE",
    description: "Chaque jeune fait part des buts qu'il poursuivra chez lui.",
  },
  {
    jour: 5,
    debut: "21:45",
    fin: "22:20",
    titre: "Appel | Temps calme | Journal",
    type: "PAR_GROUPE",
  },
  { jour: 5, debut: "22:25", titre: "Prière" },
  { jour: 5, debut: "22:30", titre: "Extinction des feux" },

  // ══════════════ JOUR 6 — samedi 8 août : départs (à confirmer) ══════════════
  { jour: 6, debut: "07:30", fin: "08:30", titre: "Petit-déjeuner", statut: "A_CONFIRMER" },
  {
    jour: 6,
    debut: "08:30",
    fin: "09:30",
    titre: "Rangement et remise des chambres",
    type: "PAR_GROUPE",
    description: "Les conseillers vérifient les chambres et les affaires de leur groupe.",
    statut: "A_CONFIRMER",
  },
  { jour: 6, debut: "09:45", fin: "10:30", titre: "Réunion de clôture", statut: "A_CONFIRMER" },
  { jour: 6, debut: "10:30", fin: "11:30", titre: "Au revoir et photos", type: "PAR_COMPAGNIE", statut: "A_CONFIRMER" },
  {
    jour: 6,
    debut: "11:30",
    titre: "Départ des cars vers les pieux et districts",
    description:
      "Les conseillers valident les départs dans l'application (module Cars) avant que les cars ne quittent le site.",
    statut: "A_CONFIRMER",
  },
];
