// Points de vigilance — lecture des renseignements médicaux déclarés.
//
// Le rapport de l'administrateur du bien-être ne se contente pas d'aligner les
// cas : il les range par nature, parce qu'on n'agit pas de la même façon face à
// un asthme et face à une intolérance alimentaire. Ce classement-là était fait
// à la main sur un export figé ; il est refait ici à partir de la base, pour
// qu'il reste juste quand une inscription change.
//
// Les mots recherchés reproduisent ce que les familles ont réellement écrit,
// fautes comprises — « astme », « asme », « sunisite », « eternuyer ». Une
// alerte manquée parce qu'un mot était mal orthographié serait le pire des
// résultats : mieux vaut une catégorie de trop qu'un asthmatique oublié.

const sansAccents = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type Categorie = {
  cle: string;
  titre: string;
  aide: string;
  // Priorité d'affichage : ce qui peut tuer dans l'heure passe devant.
  urgent?: boolean;
  // La catégorie se reconnaît au nom d'un produit plutôt qu'à celui d'une
  // condition. « Novalgin » ne dit pas s'il faut en donner ou surtout pas ;
  // « asthmatique » le dit. C'est ce qui distingue une déclaration claire
  // d'une déclaration à clarifier.
  substances?: boolean;
  mots: string[];
};

export const CATEGORIES: Categorie[] = [
  {
    cle: "respiratoire",
    titre: "Asthme et troubles respiratoires",
    aide:
      "Vérifier que chacun a son inhalateur sur lui et prévenir le conseiller du groupe. Surveiller pendant les activités physiques et les déplacements poussiéreux.",
    urgent: true,
    mots: [
      "asthm", "astme", "asme", "athsm", "inhalateur", "ventoline",
      "respirat", "essouffl", "poitrine", "thoraci", "toux", "tousse",
      "poussiere", "eternu", "sinusite", "sunisite", "bronch", "souffle",
    ],
  },
  {
    cle: "allergie-medicament",
    titre: "Allergies médicamenteuses",
    aide:
      "À signaler impérativement à toute équipe de soins avant la moindre administration. Le nom du produit doit figurer sur la fiche de liaison du jeune.",
    urgent: true,
    substances: true,
    mots: [
      "novalgin", "penicilline", "penniciline", "amoxicilline", "aspirine",
      "ibuprofene", "quinine", "sulfamide", "anti inflammatoire", "antibiotique",
    ],
  },
  {
    cle: "allergie-alimentaire",
    titre: "Allergies et intolérances alimentaires",
    aide:
      "À croiser avec le service des repas : le réfectoire doit connaître ces noms avant le premier service.",
    urgent: true,
    substances: true,
    mots: [
      "arachide", "cacahuete", "escargot", "baobab", "fruits de mer", "crustac",
      "poisson", "lactose", "lait", "gluten", "oeuf", "soja", "piment",
      "epice", "spicy", "viande", "porc", "vegetarien", "vegetalien",
    ],
  },
  {
    cle: "traitement",
    titre: "Traitements en cours",
    aide:
      "Vérifier l'ordonnance, la posologie et les conditions de conservation. Rappeler d'apporter de quoi couvrir toute la durée de la conférence.",
    urgent: true,
    mots: [
      "traitement", "ordonnance", "comprime", "gelule", "posologie",
      "quotidien", "matin et soir", "depakote", " mg", "mg)", "sirop",
      "injection", "insuline",
    ],
  },
  {
    cle: "accompagnement",
    titre: "Handicap et accompagnement particulier",
    aide:
      "Prévoir un accompagnement adapté et informer le conseiller ou la conseillère en amont, pas le jour même.",
    urgent: true,
    mots: [
      "sourd", "muet", "malentendant", "aveugle", "malvoyant", "handicap",
      "fauteuil", "bequille", "langue des signes", "autis", "mobilite",
    ],
  },
  {
    cle: "chronique",
    titre: "Maladies chroniques et suivis",
    aide:
      "Conditions durables qui demandent une vigilance de fond : hydratation, repos, régularité des prises.",
    mots: [
      "drepano", "epilep", "diabet", "anemie", "hypertension", "tension",
      "cardiaque", "coeur", "rein", "ulcere", "colopathie", "thyroid",
      "migraine",
    ],
  },
  {
    cle: "episode",
    titre: "Épisodes et douleurs signalés",
    aide:
      "Déclarations ponctuelles — paludisme, vertiges, douleurs. À connaître sans nécessairement mobiliser.",
    mots: [
      "paludisme", "palu", "fievre", "vertige", "palpitation", "mal de dos",
      "mal de tete", "douleur", "articulaire", "yeux", "vue", "regles",
      "estomac", "ventre", "nausee",
    ],
  },
];

/**
 * Une déclaration qui ne dit pas ce qu'elle veut dire.
 *
 * Le rapport du 29 juillet en signalait une : « Paracétamol », seul, sans
 * verbe. Est-ce une allergie ou un traitement habituel ? Les deux conduites
 * sont opposées — donner ou surtout ne pas donner — donc la question doit être
 * posée avant la conférence, pas devant le jeune qui a mal à la tête.
 *
 * Ce n'est pas la brièveté qui pose problème : « Asthmatique », « Toux »,
 * « Anémie » tiennent en un mot et se comprennent sans rien demander. C'est de
 * nommer un produit là où on attendait une condition.
 */
export function aClarifier(texte: string): boolean {
  const t = sansAccents(texte).trim();
  if (!t) return false;
  const mots = t.split(/\s+/).filter(Boolean);
  if (mots.length > 3) return false;
  const explicite =
    /allerg|intoler|traitement|prend|souffre|est |sous |depuis|ne pas|eviter|contre|mal |probleme|douleur|crise/.test(
      t
    );
  if (explicite) return false;
  // Une condition nommée se suffit à elle-même ; un produit nommé, non.
  return !CATEGORIES.some((c) => !c.substances && c.mots.some((m) => t.includes(m)));
}

export type Classement = { categories: string[]; aClarifier: boolean };

/** Nature(s) d'un renseignement déclaré. Une déclaration peut relever de plusieurs. */
export function classer(medical: string | null, alimentaire: string | null): Classement {
  const brut = [medical, alimentaire].filter(Boolean).join(" · ");
  const t = sansAccents(brut);
  const categories = CATEGORIES.filter((c) => c.mots.some((m) => t.includes(m))).map((c) => c.cle);
  // Une contrainte alimentaire est alimentaire même quand aucun mot de la liste
  // n'y figure : le champ lui-même dit de quoi il s'agit.
  if (alimentaire && !categories.includes("allergie-alimentaire")) {
    categories.push("allergie-alimentaire");
  }
  return { categories, aClarifier: medical ? aClarifier(medical) : false };
}

/**
 * Recommandations de l'administrateur du bien-être.
 *
 * Elles ne dépendent d'aucun cas particulier : c'est la conduite à tenir, la
 * même chaque année, et elle a sa place à côté de la liste plutôt que dans un
 * document que personne n'a sous la main le jour venu.
 */
export const RECOMMANDATIONS = [
  "Vérifier auprès du jeune, du tuteur ou du parent les traitements en cours, les ordonnances et les numéros d'urgence avant l'événement.",
  "Prévoir un point d'accès sécurisé aux médicaments personnels et un référent santé identifié sur place.",
  "Sensibiliser les conseillers aux cas d'asthme, d'allergie grave et de condition chronique : reconnaissance des signes, conduite à tenir.",
  "Constituer une fiche de liaison par cas sensible, remise au conseiller responsable du groupe concerné.",
  "Rappeler aux jeunes concernés d'apporter leur traitement en quantité suffisante pour toute la durée de la conférence.",
];
