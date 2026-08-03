// Guide de planification des conférences Jeunes, soyez forts (2025-2026).
//
// Le manuel de l'encadrant dit ce que chacun fait pendant les six jours ; le
// guide de planification dit ce qu'il faut avoir préparé avant, et ce que le
// site doit offrir. L'application ne portait que le premier. Or c'est le second
// qui sert maintenant : la conférence est reportée parce que le site n'est pas
// disponible, et il faut en trouver un autre.
//
// Rien ici n'est inventé : les ratios, les jalons et les rôles sont ceux du
// guide, transcrits. Ce qui est calculé l'est à partir des effectifs réels.

// ════════════════════════════════════════════════════════════════════════════
//  Ce que le site doit offrir
// ════════════════════════════════════════════════════════════════════════════

/** Ratios donnés par le guide, section « Installations requises ». */
export const RATIOS = {
  /** « une toilette pour 16 femmes » */
  toilettesParFemmes: 16,
  /** « une toilette ou un urinoir pour 18 hommes » */
  toilettesParHommes: 18,
  /** « une douche pour 12 personnes » */
  douchesParPersonne: 12,
  /** « La règle générale à suivre est de 50 personnes par salle » (25 à 150) */
  parSalleDeClasse: 50,
  /** « Pour les réunions de témoignage, la taille idéale est de 50 personnes par salle » */
  parSalleDeTemoignage: 50,
};

export type Exigence = {
  cle: string;
  intitule: string;
  /** Calculé sur les effectifs réels, quand le guide donne un ratio. */
  besoin?: string;
  detail: string;
  /** Une exigence dont le manquement empêche la conférence de se tenir. */
  bloquant?: boolean;
};

export type Effectifs = {
  jeunes: number;
  jeunesFilles: number;
  jeunesGarcons: number;
  encadrants: number;
  encadrantsFemmes: number;
  encadrantsHommes: number;
  groupes: number;
  compagnies: number;
};

const arrondi = (n: number) => Math.ceil(n);

/**
 * Les exigences du guide, chiffrées sur les effectifs de cette conférence.
 *
 * On visite un site avec cette liste en main : elle transforme « il faut assez
 * de toilettes » en « il en faut 21 côté filles », qui est la seule forme de la
 * question à laquelle un gestionnaire de site puisse répondre.
 */
export function exigencesDuSite(e: Effectifs): { groupe: string; exigences: Exigence[] }[] {
  const total = e.jeunes + e.encadrants;
  const femmes = e.jeunesFilles + e.encadrantsFemmes;
  const hommes = e.jeunesGarcons + e.encadrantsHommes;

  return [
    {
      groupe: "Hébergement",
      exigences: [
        {
          cle: "lits",
          intitule: "Un lit par personne",
          besoin: `${total} couchages`,
          detail:
            "Chaque participant et membre du personnel doit avoir son propre lit ou espace de couchage. Au moins deux jeunes par chambre.",
          bloquant: true,
        },
        {
          cle: "separation",
          intitule: "Dortoirs séparés par sexe",
          besoin: `${femmes} filles et femmes · ${hommes} garçons et hommes`,
          detail:
            "Les dispositifs pour les hommes et les femmes doivent être organisés de manière à restreindre l'accès aux dortoirs du sexe opposé.",
          bloquant: true,
        },
        {
          cle: "conseillers-etage",
          intitule: "Deux conseillers par étage, chambres distinctes",
          detail:
            "Idéalement deux conseillers FSY à chaque étage. Les conseillers ne partagent jamais leur chambre avec les jeunes.",
          bloquant: true,
        },
      ],
    },
    {
      groupe: "Sanitaires",
      exigences: [
        {
          cle: "toilettes-f",
          intitule: "Toilettes — filles et femmes",
          besoin: `${arrondi(femmes / RATIOS.toilettesParFemmes)} au minimum`,
          detail: `Une toilette pour ${RATIOS.toilettesParFemmes} femmes (${femmes} personnes).`,
          bloquant: true,
        },
        {
          cle: "toilettes-h",
          intitule: "Toilettes ou urinoirs — garçons et hommes",
          besoin: `${arrondi(hommes / RATIOS.toilettesParHommes)} au minimum`,
          detail: `Une toilette ou un urinoir pour ${RATIOS.toilettesParHommes} hommes (${hommes} personnes).`,
          bloquant: true,
        },
        {
          cle: "douches",
          intitule: "Douches",
          besoin: `${arrondi(total / RATIOS.douchesParPersonne)} au minimum`,
          detail:
            `Une douche pour ${RATIOS.douchesParPersonne} personnes. Vérifier aussi l'approvisionnement en eau et la capacité ` +
            "d'évacuation : il peut être nécessaire de limiter la durée et le nombre de douches.",
          bloquant: true,
        },
      ],
    },
    {
      groupe: "Espaces de rassemblement",
      exigences: [
        {
          cle: "salle-pleniere",
          intitule: "Une salle où tout le monde s'assoit en même temps",
          besoin: `${total} places assises`,
          detail:
            "Réunions spirituelles, messages du couple dirigeant, spectacle de variétés. Système de sonorisation nécessaire.",
          bloquant: true,
        },
        {
          cle: "espace-actif",
          intitule: "Un espace pour les activités mouvementées",
          besoin: `${total} personnes debout`,
          detail: "Projets de service, bals, soirée jeux.",
          bloquant: true,
        },
        {
          cle: "grandes-salles",
          intitule: "Une à quatre grandes salles",
          detail:
            "Activité des Jeunes Gens et des Jeunes Filles, activité du guide FSY, activité « Vivre l'Évangile ».",
        },
        {
          cle: "exterieur",
          intitule: "Espace extérieur, avec repli à l'intérieur",
          detail:
            "Assez grand pour la soirée jeux et les cris de ralliement. Un espace intérieur doit être prévu en plan de secours.",
        },
      ],
    },
    {
      groupe: "Repas",
      exigences: [
        {
          cle: "cafeteria",
          intitule: "Cafétéria pour tous en même temps",
          besoin: `${total} couverts`,
          detail:
            "Une salle permettant plusieurs files d'attente réduit le temps de service. Prévoir l'étiquetage des plats pour les allergies.",
          bloquant: true,
        },
      ],
    },
    {
      groupe: "Salles",
      exigences: [
        {
          cle: "classes",
          intitule: "Salles de classe",
          besoin: `${arrondi(total / RATIOS.parSalleDeClasse)} salles de ${RATIOS.parSalleDeClasse}`,
          detail:
            "La capacité totale doit accueillir tous les participants et les jeunes adultes. De 25 à 150 personnes par salle selon le site. " +
            "Les salles doivent être proches les unes des autres, et signalées.",
          bloquant: true,
        },
        {
          cle: "temoignages",
          intitule: "Salles pour les réunions de témoignage",
          besoin: `${arrondi(total / RATIOS.parSalleDeTemoignage)} salles de ${RATIOS.parSalleDeTemoignage}`,
          detail: "Cinquante personnes par salle est la taille idéale.",
        },
        {
          cle: "groupes",
          intitule: "Un lieu de réunion par groupe",
          besoin: `${e.groupes} lieux`,
          detail: "Un lieu de réunion par groupe de conseiller.",
          bloquant: true,
        },
        {
          cle: "compagnies",
          intitule: "Un lieu de rassemblement par compagnie",
          besoin: `${e.compagnies} lieux`,
          detail: "Une compagnie réunit deux ou trois groupes.",
          bloquant: true,
        },
      ],
    },
    {
      groupe: "Services",
      exigences: [
        { cle: "infirmerie", intitule: "Infirmerie", detail: "Exigée par le guide.", bloquant: true },
        { cle: "enregistrement", intitule: "Espace d'enregistrement", detail: "Pour l'accueil des arrivées, le premier jour." },
        { cle: "accueil", intitule: "Bureau d'accueil", detail: "Point de contact permanent pendant la conférence." },
        { cle: "stockage", intitule: "Espace de stockage", detail: "Matériel, documentation, tee-shirts." },
        { cle: "buanderie", intitule: "Buanderie ou laverie à proximité", detail: "Six jours sur place." },
        { cle: "parking", intitule: "Parking", detail: "Cars, véhicules du personnel et des visiteurs." },
        { cle: "loisirs", intitule: "Installations de loisirs (facultatif)", detail: "Activités récréatives à faible risque pendant le temps libre." },
      ],
    },
    {
      groupe: "Accessibilité",
      exigences: [
        {
          cle: "mobilite",
          intitule: "Accès en fauteuil roulant aux espaces principaux",
          detail:
            "Couloirs, rampes, ascenseurs, entrées larges — vers la salle des réunions spirituelles, la soirée jeux, les bals, les cours.",
          bloquant: true,
        },
        {
          cle: "sanitaires-accessibles",
          intitule: "Sanitaires accessibles",
          detail:
            "Accessibles en fauteuil ou avec un dispositif de mobilité, à l'intérieur ou à proximité immédiate de la zone de couchage.",
          bloquant: true,
        },
        {
          cle: "nuit-accessible",
          intitule: "Chambres accessibles",
          detail: "Possibilité d'accéder aux chambres et de s'y déplacer.",
        },
      ],
    },
  ];
}

// ════════════════════════════════════════════════════════════════════════════
//  Calendrier de préparation
// ════════════════════════════════════════════════════════════════════════════
//
// Le guide compte en mois avant le début de la conférence. Seuls les jalons
// qui relèvent d'une session — et non de l'interrégion ou du siège — sont
// repris : ce sont ceux dont cette équipe répond.

export type Jalon = {
  cle: string;
  echeance: string;
  intitule: string;
  qui: string;
  detail?: string;
};

export const CALENDRIER: Jalon[] = [
  {
    cle: "site",
    echeance: "13 mois avant",
    intitule: "Trouver et réserver un site adéquat",
    qui: "Administrateur des installations",
    detail:
      "Passer en revue au moins deux options avec l'administrateur chargé de l'inclusion, visiter, comparer les coûts, puis réserver. Les contrats sont examinés par le conseiller juridique de l'interrégion.",
  },
  {
    cle: "calendrier-pieux",
    echeance: "13 mois avant",
    intitule: "Confirmer que les pieux et districts ont inscrit la conférence à leur calendrier",
    qui: "Soixante-dix responsable de session",
  },
  {
    cle: "coordinateurs",
    echeance: "11 mois avant",
    intitule: "Appeler et mettre à part les coordinateurs de la conférence",
    qui: "Soixante-dix responsable de session",
    detail: "Au-delà de 500 jeunes, des coordinateurs supplémentaires peuvent être envisagés.",
  },
  {
    cle: "adjoints",
    echeance: "9 mois avant",
    intitule: "Appeler et mettre à part les coordinateurs adjoints",
    qui: "Soixante-dix responsable de session",
  },
  {
    cle: "materiel",
    echeance: "9 mois avant",
    intitule: "Déterminer le matériel nécessaire",
    qui: "Administrateur du matériel",
    detail: "Tee-shirts, cordons, manuels et autres.",
  },
  {
    cle: "inclusion-questions",
    echeance: "9 mois avant",
    intitule: "Vérifier que le formulaire d'inscription couvre les besoins d'aménagement",
    qui: "Administrateurs des inscriptions et de l'inclusion",
  },
  {
    cle: "conseillers",
    echeance: "6 mois avant",
    intitule: "Appeler les conseillers et les coordinateurs du bien-être",
    qui: "Soixante-dix responsable de session, ou évêques et présidents de pieu",
  },
  {
    cle: "instructeurs",
    echeance: "6 mois avant",
    intitule: "Inviter les instructeurs",
    qui: "Couple dirigeant de session",
  },
  {
    cle: "formation-conseillers",
    echeance: "6 mois avant",
    intitule: "Commencer la formation des conseillers",
    qui: "Dirigeants de la conférence",
    detail: "Sur les « Sujets pour la formation des jeunes adultes », page 42 du guide.",
  },
  {
    cle: "inscriptions",
    echeance: "6 mois avant",
    intitule: "Ouvrir les inscriptions des jeunes",
    qui: "Administrateur des inscriptions",
  },
  {
    cle: "repas",
    echeance: "6 mois avant",
    intitule: "Arrêter les dispositions concernant la nourriture",
    qui: "Administrateur des repas",
  },
  {
    cle: "effectif-definitif",
    echeance: "4 mois avant",
    intitule: "Arrêter le nombre définitif de participants",
    qui: "Administrateur des inscriptions",
    detail: "À communiquer au consultant de l'interrégion, qui le transmet au siège.",
  },
  {
    cle: "regimes",
    echeance: "4 mois avant",
    intitule: "Vérifier que les besoins alimentaires sont pris en compte",
    qui: "Administrateurs de l'inclusion et des repas",
  },
  {
    cle: "reunions-parents",
    echeance: "4 mois avant",
    intitule: "Tenir les réunions d'information avec les parents et les jeunes",
    qui: "Soixante-dix responsable de session",
  },
  {
    cle: "impression",
    echeance: "4 mois avant",
    intitule: "Lancer l'impression de la documentation",
    qui: "Administrateur du matériel",
  },
  {
    cle: "instructeurs-point",
    echeance: "2 mois avant",
    intitule: "Faire le point avec les instructeurs sur leurs responsabilités",
    qui: "Soixante-dix responsable de session",
  },
  {
    cle: "activite-prealable",
    echeance: "2 mois avant",
    intitule: "Tenir les activités préalables à la conférence",
    qui: "Dirigeants de pieu et de paroisse",
  },
  {
    cle: "protection",
    echeance: "1 mois avant",
    intitule: "Vérifier que tous les adultes ont suivi « Protéger les enfants et les jeunes »",
    qui: "Couple dirigeant de session",
    detail:
      "Aucun adulte ne participe s'il ne l'a pas suivie. La question doit figurer au formulaire d'inscription des adultes.",
  },
  {
    cle: "mise-a-part",
    echeance: "1 mois avant",
    intitule: "Vérifier que tous les dirigeants ont été mis à part",
    qui: "Administrateur du personnel encadrant",
  },
  {
    cle: "rapport",
    echeance: "Après la conférence",
    intitule: "Remettre le rapport au couple consultant de l'interrégion",
    qui: "Couple dirigeant de session",
    detail:
      "Nombre total de jeunes ayant participé, nombre de jeunes adultes par rôle, quelques témoignages et photos avec le nom et l'adresse du photographe.",
  },
  {
    cle: "activite-posterieure",
    echeance: "Après la conférence",
    intitule: "Préparer l'activité qui suit la conférence",
    qui: "Dirigeants locaux",
  },
];

// ════════════════════════════════════════════════════════════════════════════
//  Comité logistique
// ════════════════════════════════════════════════════════════════════════════
//
// L'application ne connaissait que le comité de session — couple dirigeant,
// coordinateurs, adjoints, conseillers. Le comité logistique existe pourtant, et
// c'est lui qu'on cherche à joindre quand un repas manque ou qu'une chambre est
// inondée. Ces responsabilités se confient nominativement.

export type RoleLogistique = { cle: string; nom: string; role: string };

export const COMITE_LOGISTIQUE: RoleLogistique[] = [
  {
    cle: "logistique",
    nom: "Administrateur de la logistique",
    role: "Coordonne l'ensemble du comité logistique et rend compte au couple dirigeant.",
  },
  {
    cle: "installations",
    nom: "Administrateur des installations",
    role: "Trouve, évalue et réserve le site ; assure la liaison avec ses gestionnaires.",
  },
  {
    cle: "finances",
    nom: "Administrateur des finances",
    role: "Budget, dépenses, règlements aux prestataires.",
  },
  {
    cle: "repas",
    nom: "Administrateur des repas",
    role: "Dispositions alimentaires, files de service, étiquetage des plats pour les allergies.",
  },
  {
    cle: "bien-etre",
    nom: "Administrateur du bien-être",
    role: "Santé des participants, infirmerie, suivi des renseignements médicaux.",
  },
  {
    cle: "hebergement",
    nom: "Administrateur de l'hébergement",
    role: "Répartition des chambres, séparation par sexe, présence des conseillers aux étages.",
  },
  {
    cle: "inclusion",
    nom: "Administrateur chargé de l'inclusion",
    role: "Aménagements pour les jeunes qui en ont besoin : mobilité, sensoriel, alimentaire, interprétation.",
  },
  {
    cle: "materiel",
    nom: "Administrateur du matériel",
    role: "Tee-shirts, cordons, manuels, impression et distribution.",
  },
  {
    cle: "publicite",
    nom: "Administrateur de la publicité",
    role: "Information des pieux et des familles, affiches, annonces.",
  },
  {
    cle: "inscriptions",
    nom: "Administrateur des inscriptions",
    role: "Ouverture, suivi et arrêt des inscriptions ; effectif définitif.",
  },
  {
    cle: "personnel",
    nom: "Administrateur du personnel encadrant",
    role: "Vérifie les mises à part et la formation « Protéger les enfants et les jeunes ».",
  },
];

// ════════════════════════════════════════════════════════════════════════════
//  Signalement des incidents
// ════════════════════════════════════════════════════════════════════════════

export const RAPPORT_INCIDENTS = {
  lien: "https://rmis-chc.churchofjesuschrist.org/selection/chc/gir/fsy",
  // « Si vous n'êtes pas sûr de devoir signaler l'incident, faites preuve d'un
  // excès de prudence et signalez-le. »
  regle: "Dans le doute, signalez.",
  cas: [
    "Une blessure ou une maladie qui nécessite plus que les simples premiers soins.",
    "Des dommages à des installations de l'Église dépassant 2 000 dollars de réparation.",
    "Des dommages à des biens n'appartenant pas à l'Église et nécessitant réparation.",
    "Une situation sans blessure ni dommage mais préoccupante : menaces, agression, activité suspecte.",
  ],
  note:
    "Les blessures ne nécessitant que les premiers soins doivent aussi être consignées, dans un registre tenu sur place. " +
    "Le soixante-dix responsable de session doit toujours être informé d'un signalement.",
};
