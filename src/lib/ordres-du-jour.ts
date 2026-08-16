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
  /** Ce qui doit se voir sans ouvrir le volet : une règle qui ne pardonne pas. */
  alerte?: string;
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
      "Parole au couple dirigeant : un message d'encouragement de cinq minutes",
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


  // ---------- Instructions de terrain des conseillers ----------
  //
  // Transcrites du fascicule « Les Conseillers » : ce que « vous dirigez »
  // recouvre concrètement, activité par activité. L'alerte porte la règle qui
  // ne pardonne pas ; le reste attend, replié, qu'on l'ouvre.
  {
    titres: ["Distribution du matériel | Auditions des chanteurs | Répétition des danseurs"],
    objet: "Conseillers : sous la direction de l'adjoint responsable, préparer un enregistrement sans accroc.",
    nature: "reperes",
    points: [
      "Transporter le matériel d'enregistrement jusqu'au lieu convenu",
      "Disposer badges et bracelets sur les tables ; classer les tee-shirts par taille (en exposer quelques-uns en référence)",
      "Auditions des chanteurs (facultatif) : pour chanter en solo pendant la conférence, passer une audition sur l'album du thème — réponse dans l'après-midi du premier jour",
      "Répétition des danseurs : tous les conseillers qui connaissent les danses en ligne — ou veulent les apprendre — sont bienvenus",
    ],
  },
  {
    titres: ["Arrivée et enregistrement"],
    objet: "Conseillers : la première impression de la conférence. Professionnels, ouverts, amicaux — et à l'heure.",
    nature: "reperes",
    alerte: "Ne remettez jamais bracelet ni matériel à quelqu'un qui n'est pas inscrit. En cas de doute : la table des solutions.",
    points: [
      "Inscription sur place, changement de chambre, questions des parents : à renvoyer vers les coordinateurs, le couple dirigeant ou la table des solutions — pas d'improvisation",
      "Vérifier le nom avec chaque participant à la remise du badge ; exactitude de chaque renseignement",
      "Badge au tour de cou, bracelet au poignet, en expliquant leur importance : ils ouvrent toutes les activités, repas et bals",
      "Faire écrire le nom sur le manuel, à garder à portée de main toute la conférence",
      "Motiver sans agitation ; souplesse si la météo ou les circonstances bousculent le déroulé",
      "Adjoints : surveillez les files et fluidifiez ; apprenez à connaître les jeunes et créez l'enthousiasme",
      "Couple dirigeant : soyez à l'enregistrement pour accueillir les jeunes — les situations délicates (tenue et présentation, notamment) se résolvent avec vous et les coordinateurs",
    ],
  },
  {
    titres: ["Vérification des chambres"],
    objet: "Conseillers : l'état des lieux se fait AVANT que les jeunes ne s'installent.",
    nature: "reperes",
    points: [
      "Vérifier chaque chambre ou dortoir avec les jeunes, avant l'installation",
      "Tout dégât constaté se signale immédiatement à votre coordinateur adjoint — surtout ce qui doit être réparé sans attendre (douche, robinet, prise)",
      "Dire aux jeunes de signaler immédiatement tout dégât survenu pendant la conférence",
      "Inciter à laisser chambre et lieux en meilleur état qu'à l'arrivée",
      "Adjoints : recueillez le rapport de détériorations de chaque conseiller avant « Rencontre ton conseiller », et relancez ceux qui n'ont rien signalé avant la réunion d'accueil",
      "Adjoint responsable des détériorations : tous les rapports rassemblés avant ce soir ; les coordinateurs préviennent le responsable du centre pour réparer sans attendre ce qui gêne un participant (douche, clé, fenêtre cassées)",
    ],
  },
  {
    titres: ["Rencontre ton conseiller"],
    objet: "Conseillers : votre première heure avec vos jeunes — liens, attentes, règles. Un ton aimant et gentil pour favoriser la présence de l'Esprit.",
    nature: "reperes",
    alerte:
      "Règle propre à notre conférence — le fascicule dit autre chose : les téléphones sont interdits aux jeunes, seuls les encadrants gardent le leur. Et chaque jeune signe et date son engagement dans son manuel.",
    points: [
      "Présentez-vous avec joie ; chaque jeune se présente et dit quelque chose d'amusant ou d'unique",
      "But de la conférence : fortifier la foi en Jésus-Christ, appartenir, continuer chez soi",
      "Expliquer une à une les six règles de conduite du manuel du participant, et s'assurer qu'elles sont comprises",
      "Bracelet porté en tout temps ; manuel et guide « Jeunes, soyez forts » toujours à portée de main (nom du jeune et du conseiller inscrits)",
      "Respect : envers soi, les autres, les encadrants, les lieux — le harcèlement n'est pas toléré",
      "Santé et sécurité : pour les toilettes ou l'eau, le jeune prévient son conseiller et signale son retour ; au-delà des environs immédiats, deux encadrants l'accompagnent, ou un encadrant avec deux à quatre jeunes — jamais un encadrant seul avec un jeune",
      "Téléphones : interdits aux jeunes pour cette conférence (règle locale, différente du fascicule international) ; le vôtre reste allumé en vibreur pour être joignable par les encadrants",
      "Attribuer aux jeunes les réunions spirituelles matinales des jours 2 à 5 (enseigner en binômes, préparation pendant les temps libres)",
      "Adjoints : balayez la zone d'enregistrement pour orienter les derniers jeunes, aidez les retardataires à s'enregistrer, rangez le matériel ; sous la direction des coordinateurs, appelez les inscrits non arrivés et prévenez les conseillers des retards et absences",
      "Couple dirigeant : vous pouvez passer vous présenter — brièvement : c'est la première occasion de lien entre conseillers et jeunes, et ils ont beaucoup à couvrir en peu de temps",
    ],
  },
  {
    titres: ["Rencontre ta compagnie"],
    objet: "Conseillers : créer l'unité de la compagnie — vos deux groupes ensemble.",
    nature: "reperes",
    points: [
      "Atmosphère d'unité et de bienveillance ; chercher à rencontrer aussi les jeunes de vos collègues conseillers",
      "Jeux pour se connaître (30 minutes) : le dénominateur commun, « toi, moi, gauche, droite », le nœud humain — les conseillers restent en dehors du nœud et encouragent",
      "Discussion préparée sur le discours de Jeffrey R. Holland « Être avec eux et les fortifier » : reconnaître les occasions de servir",
      "Rester positif si l'activité est gênante au premier abord — votre exemple entraîne",
    ],
  },
  {
    titres: ["Nom et cri de la compagnie"],
    objet: "Conseillers : le nom, son Écriture, puis le cri — préparé le matin même avec votre collègue.",
    nature: "reperes",
    points: [
      "Nom et Écriture (10 minutes) : lire ensemble le passage de la compagnie, discuter de ce que le nom signifie et de son influence sur la semaine",
      "Cri (5 minutes) : un chant simple qui unit et aide à retenir le nom — utilisable toute la conférence quand la compagnie est libérée",
    ],
  },
  {
    titres: ["Réunion d'accueil"],
    objet: "Conseillers : votre enthousiasme donne le ton de la semaine.",
    nature: "reperes",
    points: [
      "Rester debout et danser pour l'ambiance, un œil sur les jeunes, jusqu'à ce que le coordinateur se lève pour lancer la réunion",
      "S'asseoir côté couloir : voir qui a besoin de sortir (toilettes), et réserver un siège à ceux qui reviennent",
      "Applaudir tout le monde et tout ce qui est présenté — les jeunes suivront votre exemple",
      "Possibilité d'apprendre une danse en ligne et de l'exécuter à la réunion",
      "Adjoints : sur place trente minutes avant ; placement lancé dix à quinze minutes avant le début — un adjoint dehors répartit les compagnies par allée, les autres remplissent chaque siège en gardant le bout de rangée aux conseillers",
      "Coordinateurs : la logistique vous revient — matériel audiovisuel revu avec ses responsables une heure avant, programme entier revu avec le couple dirigeant, plan de rechange si la technique lâche",
      "Coordinateurs : avant de libérer, donner toutes les instructions pour le dîner et la soirée au foyer ; libérer par les cris de compagnie (facultatif)",
      "Couple dirigeant : arrivez trente minutes avant ; deux interventions — vous présenter en trente secondes, puis la section « Comportement lors des activités de l'Église », avec amour et sans casser l'élan",
      "Coordinateurs du bien-être : disponibles pour aider ; un temps de présentation et d'annonces santé vous est réservé",
    ],
  },
  {
    titres: [
      "Cours — 1re session",
      "Cours — 2e session",
      "Cours ou activité — 3e session",
      "Cours ou activité — 4e session",
      "Cours ou activité — 1re session",
      "Cours ou activité — 2e session",
      "Cours ou activité — 4e session (dernière)",
    ],
    objet: "Conseillers, si une tâche de cours vous est attribuée : cours du matin, présentez-vous à l'adjoint responsable dès le matin ; cours de l'après-midi, vers la fin du déjeuner.",
    nature: "reperes",
    points: [
      "Tâche de direction, avant l'arrivée des jeunes : se présenter à l'instructeur (s'il est en retard, envoyer un conseiller prévenir l'adjoint — on n'annule pas le cours), convenir du cantique d'ouverture, promettre le signal « cinq minutes », demander comment le présenter, vérifier salle et matériel",
      "Solliciter quatre participants : diriger le cantique, piano le cas échéant, prière d'ouverture, prière de clôture",
      "Pendant le cours : accueillir, faire ouvrir Écritures et manuel, annonces utiles, présenter l'instructeur — puis s'asseoir parmi les jeunes pour les aider à se concentrer",
      "Ne rien ajouter quand l'instructeur a terminé ; si le cours finit en avance, discussion dans le calme",
      "Itinérants et couloirs : en poste avant l'arrivée des jeunes, aider chacun à trouver une salle, surveiller les couloirs, se joindre à une classe pendant le cours, regagner son poste avant la prière de clôture",
    ],
  },
  {
    titres: ["Temps libre des participants"],
    objet: "Conseillers affectés : votre poste est votre responsabilité — recevez lieu et consignes de l'adjoint.",
    nature: "reperes",
    points: [
      "Rester à l'endroit assigné pendant tout le créneau",
      "Sécurité, comportement correct et respectueux, et respect des limites du site fixées pour la conférence",
    ],
  },
  {
    titres: ["Bal"],
    objet: "Conseillers affectés : présentez-vous à l'adjoint responsable avant votre heure pour recevoir votre poste — entrée, chaperonnage, point d'eau ou zone.",
    nature: "reperes",
    alerte: "À l'entrée : bracelet ou badge vérifié pour tous — personne d'extérieur à la conférence sur la piste.",
    points: [
      "Entrée : filtrer soigneusement, et rester au poste toute la durée du bal",
      "Chaperonnage : surveiller la piste, faire respecter gentiment les règles du bal, atténuer les perturbations, encourager les jeunes vers ceux qui sont seuls ; signaler tout problème à un adjoint",
      "Point d'eau : approvisionnement continu, propreté, de quoi essuyer un renversement",
      "Postes et zones : couloirs, toilettes, entrées et sorties — pas de sortie sans l'autorisation d'un conseiller, pas d'attroupement",
      "Fixer à votre compagnie un lieu de rassemblement après le bal, pour se retrouver et se disperser en ordre",
      "Coordinateurs : supervisez l'éclairage (on doit voir un visage de l'autre côté de la piste) et le volume ; le DJ a sa liste de chansons prête à l'avance — puis dansez",
      "Couple dirigeant : dansez avec les jeunes et amusez-vous ; on pourra vous demander d'être juges du concours de danse",
      "Le cinquième soir : quelques adjoints quittent le bal plus tôt pour installer les sièges du message « À emporter chez soi », si les jeunes changent de lieu",
    ],
  },
  {
    titres: ["Réunions de témoignage"],
    objet: "Conseiller chargé de la direction : un cadre simple, du recueillement, et l'heure tenue.",
    nature: "reperes",
    points: [
      "Choisir un cantique d'ouverture ; désigner deux personnes pour les prières d'ouverture et de clôture",
      "Réserver des sièges à l'avant pour ceux qui attendent de témoigner",
      "Ouvrir par la bienvenue, le cantique et la prière ; inviter tous ceux qui le souhaitent, en rappelant l'heure de fin",
      "Entre les témoignages, recueillement : Écritures, ou écrire témoignage et impressions dans le manuel",
      "Tenir le temps : observer la file et l'heure, annoncer gentiment s'il n'y en aura pas pour tous — ceux qui n'ont pas pu témoigneront en groupe pendant « Réfléchir et revoir »",
      "Clore par la prière, et renvoyer les compagnies dans la révérence",
      "Couple dirigeant et coordinateurs : choisissez une réunion et restez-y jusqu'à la fin — on ne va pas de salle en salle",
    ],
  },
  {
    titres: ["Réunion spirituelle matinale des participants"],
    objet: "Conseillers : ce sont les jeunes qui enseignent, des jours 2 à 5 — vous dirigez le cadre.",
    nature: "reperes",
    points: [
      "Les tâches ont été attribuées dès « Rencontre ton conseiller » ; enseigner en binômes est recommandé",
      "Les réunions s'appuient sur les principes de « Jeunes, soyez forts » (fin du manuel du participant) — préciser jour et page à ceux qui enseignent",
      "Le meilleur moment pour les aider à se préparer : les temps libres et les moments de tranquillité",
    ],
  },
  {
    titres: ["Moment de tranquillité | Préparation au coucher", "Moment de tranquillité | Journal"],
    objet: "Conseillers : vous supervisez — calme, préparation au coucher, et pour ceux qui enseignent le lendemain, un moment pour se préparer.",
    nature: "reperes",
    points: [
      "Faire baisser le rythme : préparation au coucher, journal, Écritures",
      "Aider les jeunes chargés de la réunion spirituelle du lendemain à se préparer",
    ],
  },
  {
    titres: ["Extinction des feux"],
    objet: "Conseillers : chacun dans sa chambre, lumières éteintes — et vos jeunes savent où vous trouver.",
    nature: "reperes",
    alerte: "Après l'appel du soir, plus personne ne quitte son étage ou son dortoir sans l'autorisation de son conseiller et un accompagnement.",
    points: [
      "22 h 30 : tous les participants dans leur chambre, lumières éteintes",
      "Vos jeunes savent où vous dormez, pour vous trouver en cas d'urgence",
      "Fenêtres occultées le cas échéant ; vigilance particulière après l'extinction",
      "Adjoints : aimables mais présents — une lumière encore allumée se règle par le conseiller du jeune, jamais en direct ; restez en lien avec vos conseillers de 22 h 30 à l'extinction complète",
      "Adjoints : message à vos coordinateurs quand toutes les lumières de vos conseillers sont éteintes",
      "Coordinateurs : la réunion du soir ne commence pas avant l'extinction complète (sauf cas extrême, à votre discrétion) — profitez de l'attente pour la préparer avec votre collègue",
    ],
  },
  {
    titres: ["Extinction des feux | Veille de nuit"],
    objet:
      "Cinquième soir : la surveillance est renforcée — c'est la garde de nuit. En fin de conférence, les jeunes tentent plus volontiers de s'éclipser ou de veiller.",
    nature: "reperes",
    alerte: "Après l'appel du soir, plus personne ne quitte son étage ou son dortoir sans l'autorisation de son conseiller et un accompagnement.",
    points: [
      "22 h 30 : tous les participants dans leur chambre, lumières éteintes — vigilance accrue ce soir",
      "Conseillers en poste : une sortie, une cage d'escalier ou un bâtiment chacun, en surveillance visuelle des chambres — postes et consignes donnés par les coordinateurs",
      "Conseillers : ne récupérez pas les clés des participants ce soir, sauf indication contraire des coordinateurs",
      "Adjoints et coordinateurs : passez régulièrement voir les postes ; zone calme et jeunes couchés — le poste peut être relevé, à la discrétion du coordinateur",
      "Prévoir des rotations : la sécurité des jeunes compte, le repos des encadrants aussi — ne gardez personne éveillé plus que nécessaire",
    ],
  },

  // ---------- Qui fait quoi, niveau par niveau ----------
  //
  // Transcrites des fascicules « Le Couple Dirigeant », « Les Coordonnateurs
  // principaux » et « Les Coordonnateurs adjoints » : les activités partagées
  // où chaque niveau a un rôle précis. Les points sont préfixés par le niveau
  // concerné, comme sur la fiche de l'appel.
  {
    titres: ["Réunion spirituelle avec le couple dirigeant"],
    objet:
      "Les coordinateurs principaux dirigent la réunion ; le couple dirigeant donne un message appuyé sur le thème de l'année.",
    nature: "reperes",
    points: [
      "Coordinateurs : tout est prêt avant le début — annonces, prières, cantiques, pianiste, sonorisation ; clair, direct, professionnel",
      "Coordinateurs : les annonces se font en fin de réunion, après la prière de clôture",
      "Adjoints : trente minutes avant pour l'installation ; les compagnies entrent en silence et s'assoient vite et en ordre, pour commencer à l'heure",
      "Conseillers : tous vos jeunes sont là et entrent en silence ; une fois vos jeunes assis, asseyez-vous avec votre groupe",
      "Couple dirigeant : arrivez trente minutes avant ; votre message s'appuie sur le thème de l'année des jeunes",
    ],
  },
  {
    titres: ["Étude de l'Évangile"],
    objet:
      "Les conseillers enseignent à leur groupe ; les adjoints observent pour les faire grandir.",
    nature: "reperes",
    points: [
      "Conseillers : vous enseignez la leçon du jour à votre groupe — la préparation se fait pendant les temps libres",
      "Adjoints : observez sans intervenir pendant la discussion ; étudiez vos Écritures avec les jeunes",
      "Adjoints, après la réunion : retour bienveillant au conseiller — questions orientées (comment ça s'est passé ? qu'est-ce qui a bien marché ? que ferais-tu autrement ?), centré sur l'amour des jeunes et le respect de l'horaire",
      "Adjoints : observez chaque équipe les deux premiers jours, puis de nouveau en fin de conférence ; signalez aux coordinateurs tout problème sérieux",
      "Coordinateurs et couple : libre à vous d'assister — sans prendre la main",
    ],
  },
  {
    titres: ["Réfléchir et revoir"],
    objet: "Le conseiller instruit et dirige : le bilan spirituel du jour, avec son groupe.",
    nature: "reperes",
    points: [
      "Conseillers : animez la discussion et laissez largement les jeunes participer",
      "Adjoints : l'appel du soir est remonté aux coordinateurs AVANT de venir observer",
      "Adjoints : observez un conseiller ; après la réunion, commentaires positifs et suggestions concrètes",
      "Couple dirigeant : vous pouvez participer — en laissant le conseiller diriger et les jeunes s'exprimer",
    ],
  },
  {
    titres: ["Leçon de la soirée au foyer"],
    objet: "Les coordinateurs principaux dirigent la réunion ; le couple dirigeant enseigne.",
    nature: "reperes",
    points: [
      "Coordinateurs : arrivez en avance, commencez à l'heure, asseyez-vous sur l'estrade avec le couple",
      "Déroulé : bienvenue — Écritures, manuel et stylo en main — cantique et prière d'ouverture (annoncer aussi qui fera la prière de clôture), message du couple, prière, annonces",
      "Couple dirigeant : quarante-cinq minutes centrées sur le thème de l'année — terminez à l'heure, les activités de la soirée suivent immédiatement",
      "Après les annonces : chaque compagnie rejoint son lieu de rassemblement pour les jeux",
    ],
  },
  {
    titres: ["Jeux de la soirée au foyer", "Se fixer des buts pendant la soirée au foyer"],
    objet:
      "Les conseillers animent ; adjoints, coordinateurs et couple observent, aident, et tissent des liens en participant.",
    nature: "reperes",
    points: [
      "Adjoints : observez les compagnies pendant les jeux et le bilan ; participer avec les jeunes de vos conseillers crée des liens",
      "Adjoints : pendant « Se fixer des buts », observez l'enseignement des conseillers",
      "Coordinateurs : plan de secours en cas de mauvais temps — au besoin, voyez vite avec le responsable du centre",
      "Couple dirigeant : rencontrez les jeunes et jouez avec eux ; assistez à une session de fixation de buts en compagnie",
    ],
  },
  {
    titres: ["Soirée jeux et cris de ralliement"],
    objet:
      "L'adjoint responsable conduit la soirée ; coordinateurs et couple tournent entre les emplacements et jugent les cris.",
    nature: "reperes",
    points: [
      "Coordinateurs : tout est prêt dès l'après-midi — eau accessible aux jeunes (à vérifier avec la logistique), plan de secours en cas de pluie, responsable du centre joignable",
      "Coordinateurs et couple : passez d'un emplacement à l'autre pour juger les cris ; en arrivant, l'adjoint responsable finit la manche en cours et vous donne la parole",
      "Pour chaque cri : les autres groupes assis en demi-cercle, pour que toutes les compagnies voient",
      "Finale : à lancer quand il reste vingt minutes — gagnants des bannières annoncés par groupe d'âge, puis les compagnies gagnantes exécutent leur cri",
      "Si l'heure déborde : annoncez seulement les gagnants, les cris gagnants se montreront le cinquième jour — la soirée jeux n'empiète pas sur la soirée plat préféré",
    ],
  },
  {
    titres: ["Soirée plat préféré"],
    objet: "L'adjoint responsable conduit ; les coordinateurs aident à la distribution.",
    nature: "reperes",
    alerte:
      "Aucun plat ne circule sans que les restrictions alimentaires non signalées à l'inscription aient été transmises aux personnes en charge de la nourriture.",
    points: [
      "Adjoint responsable : transmettez toute restriction alimentaire connue de fraîche date aux personnes en charge de la nourriture",
      "Coordinateurs : aidez les adjoints à distribuer la nourriture aux conseillers, puis profitez de la soirée avec les jeunes",
      "Couple dirigeant : assistez avec une équipe de conseillers, si vous le désirez",
    ],
  },
  {
    titres: ["Spectacle musical"],
    objet:
      "Trente minutes qui introduisent la veillée spirituelle — les coordinateurs principaux dirigent la soirée.",
    nature: "reperes",
    points: [
      "Coordinateurs : à l'auditorium une heure avant — matériel audiovisuel vérifié, medley revu, besoins audiovisuels du couple prévus",
      "Coordinateurs, avec le couple : revoir l'ordre de la soirée (spectacle, veillée, rédaction des témoignages, medley), la durée du message, et les musiques pendant la rédaction et les déplacements",
      "Couple dirigeant : le spectacle est déjà riche en médias — allégez d'autant votre message de la veillée",
    ],
  },
  {
    titres: ["Veillée spirituelle du couple dirigeant"],
    objet:
      "Les coordinateurs principaux dirigent, assis sur l'estrade avec le couple ; le couple enseigne.",
    nature: "reperes",
    points: [
      "Coordinateurs : annoncez d'emblée tous les événements de la soirée, pour ne plus donner d'instructions avant les réunions de témoignage",
      "Couple dirigeant : leçon de trente-cinq minutes centrée sur l'expiation de Jésus-Christ",
      "Après la prière de clôture : postlude recueilli, annonce des salles de témoignage et du conseiller qui dirige chacune, rappel de finir à l'heure",
      "Libérer les compagnies dans le respect, en route vers les lieux de témoignage",
    ],
  },
  {
    titres: ["Rédaction du témoignage | Medley FSY"],
    objet: "Dix minutes pour écrire son témoignage dans le journal, sur fond de musique douce.",
    nature: "reperes",
    points: [
      "Musique au piano ou enregistrée, propice au recueillement — convenue à l'avance entre coordinateurs et couple",
      "Adjoints qui ont dirigé le medley le matin : vous le dirigez à nouveau en fin de réunion",
    ],
  },
  {
    titres: ["Message « À emporter chez soi »"],
    objet: "Le dernier message de la conférence — le couple dirigeant l'apporte.",
    nature: "reperes",
    points: [
      "Coordinateurs : après le bal, ramenez le calme et faites asseoir les jeunes par compagnie",
      "Déroulé : chant du thème avec la vidéo (5 min) · vidéo de l'Autorité générale (3-5 min) · message du couple (10 min) · témoignage personnel du couple (5 min) · explication de l'activité en compagnie (5 min) · medley · prière",
      "Couple dirigeant : reliez les réunions spirituelles matinales au thème, lancez l'invitation « Agir et devenir », et expliquez ce qui attend les compagnies juste après",
    ],
  },
  {
    titres: ["« À emporter chez soi » en compagnie"],
    objet:
      "Conseillers : la dernière discussion avec vos jeunes — l'Évangile est ce qu'ils emportent chez eux.",
    nature: "reperes",
    points: [
      "Faire réfléchir à ce qu'ils ont vécu, noter des buts personnels (livret « Un modèle de progression »), et inviter à les partager",
      "Relier chaque but à l'invitation « Agir et devenir » — un changement qui dure au-delà de la conférence",
    ],
  },
  {
    titres: ["Activité « Vivre l'Évangile »"],
    objet: "Dirigée par les conseillers ; l'adjoint veille à la préparation et au soutien.",
    nature: "reperes",
    points: [
      "Conseillers : vous dirigez — faire connaître l'amour du Christ, devenir attentif aux besoins d'autrui, faire des plans pour mieux servir",
      "Adjoints : pas de rôle désigné, mais les objectifs sont compris, la logistique communiquée, et les conseillers prêts (instructions lues)",
      "Adjoints : soyez présent surtout pendant la partie individuelle (deuxième partie), pour aider les jeunes qui décrochent",
      "Couple dirigeant : participez librement — votre exemple porte",
    ],
  },
  {
    titres: ["Préparation au départ", "Vérification des chambres | Départ des participants"],
    objet: "Tous les encadrants sont en service jusqu'au départ du dernier jeune.",
    nature: "reperes",
    alerte:
      "Personne ne va à la réunion de clôture tant que tous les jeunes dont il répond n'ont pas libéré leur chambre et été pris en charge.",
    points: [
      "Conseillers : inspection de chaque chambre avec les jeunes, clés récupérées, placards et tiroirs vérifiés ; départs validés dans le module Cars",
      "Conseillers : tout dégât et toute clé perdue se signalent — les pochettes de clés se rapportent",
      "Adjoints : toutes les clés de vos conseillers sont rendues selon les instructions ; supervisez les procédures de départ",
      "Responsable des détériorations : clés perdues et dégâts se règlent avec le responsable du centre — vérifier chaque frais qui sera facturé à la conférence",
      "Couple dirigeant : vous supervisez le départ — c'est ce dont vous répondez le plus directement",
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
  alerte?: string;
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
  return {
    nature: fiche.nature,
    objet: fiche.objet,
    points,
    formations: fiche.formations,
    alerte: fiche.alerte,
  };
}
