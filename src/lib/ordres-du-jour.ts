// Ordres du jour suggérés par le manuel de l'encadrant FSY 2026, réunion par
// réunion, pour chaque niveau (couple dirigeant, coordinateurs principaux,
// adjoints, conseillers).
//
// Ils vivent ici, dans le code, et s'attachent aux activités **à l'affichage**
// — jamais en base. C'est voulu : les coordinateurs principaux modifient le
// programme (horaires, annulations, ajouts), et rien de ce qui suit ne doit
// écraser leur travail. Une réunion déplacée garde son ordre du jour ; une
// réunion renommée le perd, sans casser quoi que ce soit.
//
// L'appariement se fait par titre, complété du moment de la journée quand le
// même intitulé revient plusieurs fois (la réunion coordinateurs/adjoints du
// matin, de l'après-midi et du soir ne se conduisent pas pareil), et du jour
// pour les annonces propres à chaque journée. Les sous-points commencent par
// « ◦ » et sont rendus en retrait.

export type Moment = "matin" | "apres-midi" | "soir";

type Fiche = {
  titres: string[];
  /** Ne s'applique qu'à ce moment de la journée (départage les homonymes). */
  moment?: Moment;
  /** Ce que la réunion sert, en une phrase — qui la dirige, combien de temps. */
  objet?: string;
  /** « Ordre du jour suggéré » ou simples repères du manuel. */
  nature: "ordre" | "reperes";
  points: string[];
  /** Annonces propres au jour, insérées après le point désigné par `ancre`. */
  annoncesParJour?: Record<number, string[]>;
  /** Début du point sous lequel s'insèrent les annonces du jour. */
  ancre?: string;
  /** Sujets de formation suggérés (réunion de l'après-midi adjoints/conseillers). */
  formations?: string[];
};

const FICHES: Fiche[] = [
  // ---------- Veille ----------
  {
    titres: ["Réunion d'accueil des conseillers"],
    objet:
      "Formation dirigée par les coordinateurs principaux. À l'arrivée, remettre à chaque conseiller le manuel de l'encadrant et son badge nominatif.",
    nature: "ordre",
    points: [
      "Bienvenue — cantique et prière d'ouverture",
      "Présentations",
      "◦ Présenter les coordinateurs, les adjoints, les coordinateurs du bien-être, le couple dirigeant et les visiteurs",
      "◦ Demander aux conseillers de se présenter",
      "Présentation du programme : but des conférences FSY et thème des jeunes de l'année",
      "Rôle et responsabilités des conseillers — formation sur l'enseignement efficace",
      "◦ Occasions d'enseignement : Étude de l'Évangile · Rencontre ton conseiller · bilan des jeux de la soirée au foyer · Réfléchir et revoir · activité « Jeunes, soyez forts » · activité « Vivre l'Évangile »",
      "Autres éléments : tenue et présentation (guide « Jeunes, soyez forts »), résolution des problèmes, questions",
      "Prière de clôture",
    ],
  },
  {
    titres: ["Message du couple dirigeant"],
    objet: "Réunion spirituelle pour tous les encadrants.",
    nature: "reperes",
    points: [
      "Message personnalisé d'environ cinquante minutes, pour édifier les encadrants et les préparer à leur rôle",
      "Fixer un objectif clair et simple",
      "Salle et matériel audiovisuel prêts trente minutes avant (coordinateurs)",
    ],
  },
  {
    titres: ["Répartition des coordinateurs adjoints et des conseillers"],
    objet:
      "Chaque adjoint rencontre les conseillers qu'il supervise : créer des liens, définir les attentes, fixer les buts de la semaine.",
    nature: "ordre",
    points: [
      "Présentations (5 minutes)",
      "◦ Apprendre à se connaître ; donner son numéro de téléphone aux conseillers et le lieu des réunions matinales",
      "◦ Noter les numéros des conseillers, en remettre la liste aux coordinateurs pour les urgences",
      "Attentes (10 minutes)",
      "◦ Distribuer la liste des responsabilités et les documents administratifs (sacs ou enveloppes pour les clés, le cas échéant)",
      "◦ Discuter de ce qui est attendu des conseillers ; répondre aux questions, dont celles sur « Rencontre ton conseiller »",
      "◦ Ponctualité à toutes les activités ; informations logistiques propres au site (distances de marche, temps assis)",
      "◦ Encourager à planifier : faire des trajets à pied des moments où les jeunes font connaissance",
    ],
  },
  {
    titres: ["Réunion couple dirigeant / coordinateurs"],
    objet: "Derniers détails de la conférence entre le couple dirigeant et les coordinateurs principaux.",
    nature: "ordre",
    points: [
      "Examiner la documentation du dossier du couple dirigeant",
      "Passer en revue le programme de la conférence",
      "Vérifier les tâches de la réunion d'accueil",
      "« À emporter chez soi » : lieu, besoins audiovisuels, contraintes de temps (penser aux distances de marche)",
      "Musiques de l'album des jeunes souhaitées aux réunions spirituelles matinales et à la veillée du quatrième jour",
      "Répondre aux autres questions et préoccupations",
    ],
  },
  {
    titres: ["Entretiens avec les conseillers et planification"],
    objet:
      "Entretien individuel de l'adjoint (avec son collègue) avec chacun de ses conseillers — dix minutes au plus par entretien.",
    nature: "ordre",
    points: [
      "Débuter et terminer chaque entretien par une prière",
      "Apprendre à connaître le conseiller individuellement",
      "L'importance d'aimer les jeunes et d'être un bon exemple",
      "Attentes, préoccupations et objectifs de la semaine — assurer son soutien",
      "Dire qu'on prendra de ses nouvelles tout au long de la conférence",
      "Ensuite : signaler aux coordinateurs les besoins et préoccupations relevés",
    ],
  },

  // ---------- Jour 1 ----------
  {
    titres: ["Réunion coordinateurs / adjoints"],
    moment: "matin",
    objet: "Dirigée par les coordinateurs principaux. Débuter et terminer par une prière.",
    nature: "ordre",
    points: [
      "Derniers préparatifs : enregistrement des participants, réunion d'accueil, tâches de la réunion des encadrants",
      "Préoccupations des adjoints sur leurs responsabilités ou leur préparation",
      "Passer en revue : distribution du matériel, tâches des chanteurs, répétitions des danseurs, enregistrement",
      "Le couple dirigeant peut être invité (facultatif)",
    ],
  },
  {
    titres: ["Réunion des encadrants"],
    objet:
      "Dirigée par les coordinateurs principaux ; si possible, faire écouter le chant du thème. Dernière réunion de tous les encadrants avant l'arrivée des jeunes.",
    nature: "ordre",
    points: [
      "Accueil, objectif de la réunion, enthousiasme pour la conférence",
      "Prière d'ouverture",
      "Présentations",
      "◦ Équipe logistique et personnel du site",
      "◦ Adjoints et coordinateurs du bien-être : chacun annonce ses responsabilités et les instructions utiles (lieux des auditions, des répétitions, photos pour le diaporama…)",
      "◦ Bien-être : procédures et coordonnées",
      "◦ Les équipes de conseillers se présentent rapidement",
      "Changements d'emploi du temps ou de responsabilités",
      "Spécificités de la conférence : responsabilités des conseillers, questions communes (le reste en réunion de l'après-midi)",
      "Procédures d'urgence et lieux de rassemblement ; consignes propres au bâtiment",
      "Enregistrement des participants : modalités, gestion professionnelle des difficultés, tenue et présentation",
      "Parole au couple dirigeant (facultatif)",
      "Chant du thème des jeunes — prière de clôture",
    ],
  },
  {
    titres: ["Réunion de planification des conseillers"],
    objet: "Les équipes de conseillers planifient leur semaine (les entretiens avec l'adjoint s'y tiennent s'ils n'ont pas eu lieu la veille).",
    nature: "ordre",
    points: [
      "Chaque jour : l'appel à l'heure du déjeuner",
      "Premier jour : Rencontre ta compagnie — jeux pour faire connaissance, nom de compagnie et son Écriture, cri de compagnie",
      "Premier jour : soirée au foyer — jeux et bilan, se fixer des buts",
      "Du deuxième au cinquième jour : Étude de l'Évangile",
      "Deuxième jour : directives pour le bal",
      "Quatrième jour : discussion sur le recueillement et le témoignage",
      "Cinquième jour : passer en revue les buts · « Jeunes, soyez forts » · « Vivre l'Évangile » · « À emporter chez soi » en compagnie",
    ],
  },

  // ---------- Réunions récurrentes ----------
  {
    titres: ["Réunion coordinateurs adjoints / conseillers"],
    moment: "matin",
    objet:
      "Dix minutes pour fortifier les conseillers et bien lancer la journée — messages encourageants, inspirants, adaptés à leurs besoins.",
    nature: "ordre",
    points: [
      "Cantique et prière d'ouverture",
      "Pensée spirituelle",
      "Besoins des conseillers, réponses à leurs questions",
      "Annonces spécifiques à la conférence",
      "Prière de clôture",
    ],
    ancre: "Annonces spécifiques",
    annoncesParJour: {
      2: [
        "◦ Observations des réunions",
        "◦ Préparation de la bannière et du cri de ralliement",
        "◦ Bal : les affaires des participants restent dans les chambres, sauf besoin personnel",
      ],
      3: [
        "◦ Soirée jeux : les participants apportent leur bouteille d'eau",
        "◦ Soirée plat préféré : logistique, comment être efficace",
      ],
      4: [
        "◦ Observations des réunions",
        "◦ Lieux des groupes pour l'activité Jeunes Gens et Jeunes Filles",
        "◦ Discussion sur le recueillement et le témoignage",
        "◦ Instructions pour le spectacle de variétés et le spectacle musical",
      ],
      5: [
        "◦ Observations des réunions",
        "◦ Instructions pour « À emporter chez soi » en compagnie",
        "◦ Instructions pour la garde de nuit",
      ],
    },
  },
  {
    titres: ["Réunion coordinateurs adjoints / conseillers"],
    moment: "apres-midi",
    objet:
      "Trente minutes au plus, commencée et finie à l'heure. Pas de leçon formelle : une discussion, animée par l'adjoint. Un coordinateur peut observer et faire un retour.",
    nature: "ordre",
    points: [
      "Prière d'ouverture",
      "Annonces spécifiques à la conférence",
      "Raconter et tenir conseil : réussites et difficultés de chacun ; suggestions, encouragement, soutien mutuel",
      "Apprendre ensemble : brève formation sur un principe choisi selon les besoins",
      "S'exercer et inviter : comment appliquer ce principe avec les jeunes",
      "Prière de clôture",
    ],
    formations: [
      "Tenir une réunion « Réfléchir et revoir » efficace : poser des questions inspirées",
      "Conversations essentielles : jeunes en difficulté, communication entre encadrants",
      "L'activité Jeunes Gens et Jeunes Filles",
      "Favoriser l'unité entre compagnies, adjoints et conseillers",
      "Les danses en ligne",
      "La soirée jeux : la participation des conseillers",
      "Réussir la soirée plat préféré",
      "Faire un bilan efficace, en situation formelle et informelle",
      "Passer en revue les buts fixés",
      "« À emporter chez soi » en compagnie",
      "Les ressources de l'Église pour préparer et enseigner les leçons",
      "Des moyens pour connaître les jeunes",
      "L'activité « Vivre l'Évangile »",
      "Se fixer des buts significatifs à partir des responsabilités des conseillers",
      "Corriger et discipliner de manière appropriée et efficace",
      "Gérer le stress",
    ],
  },
  {
    titres: ["Réunion coordinateurs / adjoints"],
    moment: "apres-midi",
    objet:
      "Chacun rend compte de ses responsabilités et demande l'aide des autres. Prendre des notes ; transmettre aux conseillers ce qui doit l'être.",
    nature: "ordre",
    points: [
      "Prière d'ouverture",
      "Annonces, notamment les renseignements propres à la conférence",
      "Discussion animée : esprit d'équipe, besoins, pensée spirituelle",
      "Passer en revue les tâches du matin",
      "Finaliser les activités du soir",
      "Rapports des adjoints sur leurs responsabilités et activités confiées",
      "Prière de clôture",
    ],
    ancre: "Finaliser les activités du soir",
    annoncesParJour: {
      2: [
        "◦ Distribuer le matériel des bannières",
        "◦ Responsabilités pendant le bal ; s'assurer que le DJ est prêt",
        "◦ Annoncer l'heure de rendez-vous pour l'installation",
      ],
      3: [
        "◦ Heure d'installation de la soirée jeux, instructions et responsabilités",
        "◦ Responsabilités de la soirée plat préféré",
      ],
      4: [
        "◦ Salles des réunions de témoignage",
        "◦ Installation du spectacle musical et de la réunion spirituelle du soir",
        "◦ Autres besoins ou préoccupations (un coordinateur peut être à la répétition générale)",
      ],
    },
  },
  {
    titres: ["Réunion coordinateurs / adjoints"],
    moment: "soir",
    objet:
      "Dix à quinze minutes au plus, après l'extinction des feux, quand tous peuvent être présents. Les coordinateurs du bien-être y sont conviés — traiter d'abord ce qui les concerne pour les libérer tôt.",
    nature: "ordre",
    points: [
      "Prière d'ouverture",
      "Esprit d'équipe : compliments, mises en lumière, réussites du jour — l'accent sur les adjoints et le bien-être",
      "Performances des conseillers : compliments, préoccupations générales",
      "Annonces des coordinateurs : préoccupations immédiates, renseignements propres à la conférence",
      "Bilan des activités de la journée (repas, placements, cours, temps libre…)",
      "Activités et responsabilités du lendemain",
      "Rapport de chaque adjoint sur ses tâches : besoins et questions",
      "Réflexions finales et conseils — prière de clôture",
    ],
    ancre: "Activités et responsabilités du lendemain",
    annoncesParJour: {
      5: [
        "◦ Lendemain : départ des participants, départ des encadrants, réunion de clôture, petit-déjeuner des encadrants",
      ],
    },
  },
  {
    titres: ["Réunion couple dirigeant / instructeurs"],
    objet: "Faire brièvement connaissance avec les instructeurs.",
    nature: "ordre",
    points: [
      "Présenter le site : salles de classe, lieu où le déjeuner est servi",
      "Les inviter à assister à la réunion spirituelle s'ils le souhaitent",
      "Courte pensée spirituelle, puis prière",
    ],
  },

  // ---------- L'appel, à chaque rassemblement ----------
  //
  // « Vous recevez l'appel » laissait les coordinateurs perplexes — on aurait
  // dit un appel téléphonique. Le manuel décrit une chaîne de rapports : cette
  // fiche la donne, sur chaque activité d'appel.
  {
    titres: ["Appel", "Rassemblement en compagnie | Appel"],
    objet:
      "L'appel des présents : chaque jeune est compté, et le compte remonte de niveau en niveau jusqu'à ce que tous soient comptabilisés.",
    nature: "reperes",
    points: [
      "Conseillers : faites l'appel de votre groupe au point de rassemblement de la compagnie ; faites les annonces et donnez les instructions pour la suite de la journée",
      "◦ Les jeunes signalent leur présence même s'ils participent au spectacle musical ou de variétés",
      "◦ Signalez l'appel à votre coordinateur adjoint sans attendre, en notant tout jeune manquant",
      "Adjoints : veillez à recevoir le rapport de chaque conseiller, avec précision, puis faites rapport aux coordinateurs",
      "◦ Le soir, l'appel signifie aussi que les jeunes sont dans leur dortoir et n'en sortent plus",
      "Coordinateurs : les rapports des adjoints vous remontent ; si l'un tarde, proposez votre aide",
      "Si un jeune manque à l'appel : contactez immédiatement le couple dirigeant",
    ],
  },

  // ---------- Jour 4 : réunions spirituelles par sexe ----------
  {
    titres: [
      "Réunion spirituelle des Jeunes Gens | Medley FSY",
      "Réunion spirituelle des Jeunes Filles | Medley FSY",
    ],
    objet: "Un coordinateur principal dirige, à l'aide de ce déroulé.",
    nature: "ordre",
    points: [
      "Pianiste et directeur de musique (nom, ville, compagnie)",
      "Ouverture : bienvenue, cantique et prière d'ouverture",
      "Les Jeunes Filles récitent leur thème ; les Jeunes Gens celui des collèges de la Prêtrise d'Aaron (s'ils le désirent)",
      "Medley de la conférence",
      "Message du couple dirigeant",
      "Cantique et prière de clôture",
      "Annonces : lieu et heure des répétitions générales (spectacle de variétés, spectacle musical)",
    ],
  },

  // ---------- Jour 6 ----------
  {
    titres: ["Réunion de clôture des encadrants | Remise des clés"],
    objet:
      "Dirigée par les coordinateurs principaux. Les clés des conseillers sont rendues avant de quitter la réunion ; les rapports partent ensuite au soixante-dix d'interrégion et au couple consultant.",
    nature: "ordre",
    points: [
      "Prière d'ouverture",
      "Remarques des coordinateurs : commentaires positifs et reconnaissance envers tous les encadrants",
      "◦ Donner aux adjoints, au bien-être et aux conseillers l'occasion de s'exprimer",
      "Observations finales du couple dirigeant",
      "Mot de conclusion de l'administrateur logistique",
      "Prière de clôture",
      "Après la réunion : rapport historique de la conférence (réussites, difficultés, état du site, conseils aux prochains comités)",
    ],
  },
];

export type OrdreDuJour = {
  nature: "ordre" | "reperes";
  objet?: string;
  points: string[];
  formations?: string[];
};

const momentDe = (heure: number): Moment =>
  heure < 12 ? "matin" : heure < 19 ? "apres-midi" : "soir";

/**
 * L'ordre du jour suggéré pour une activité, s'il y en a un.
 *
 * @param titre  Le titre tel qu'en base (l'appariement est exact : une réunion
 *               renommée par les coordinateurs perd sa fiche, sans rien casser).
 * @param jour   0 pour la veille, 1 à 6 sinon — sert aux annonces du jour.
 * @param heure  Heure de début (0-23), pour départager les réunions homonymes.
 */
export function ordreDuJourDe(titre: string, jour: number, heure: number): OrdreDuJour | null {
  const fiche = FICHES.find(
    (f) => f.titres.includes(titre) && (!f.moment || f.moment === momentDe(heure))
  );
  if (!fiche) return null;

  const duJour = fiche.annoncesParJour?.[jour] ?? [];
  let points = fiche.points;
  if (duJour.length > 0) {
    const apres = fiche.ancre ? points.findIndex((p) => p.startsWith(fiche.ancre!)) : -1;
    points =
      apres >= 0
        ? [...points.slice(0, apres + 1), ...duJour, ...points.slice(apres + 1)]
        : [...points, ...duJour];
  }
  return { nature: fiche.nature, objet: fiche.objet, points, formations: fiche.formations };
}
