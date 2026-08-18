// Ce que la cuisine doit savoir — et rien d'autre.
//
// Le fournisseur des repas a besoin de deux choses : combien de plats adapter
// à chaque service, et à qui les remettre. Il n'a pas à connaître l'asthme, le
// paludisme ni les traitements en cours de qui que ce soit. Ce fichier fait
// donc le tri : il ne retient d'une déclaration que ce qui touche à la
// nourriture, et laisse le reste dans l'application.
//
// Deux champs sont lus, pas un seul. Les familles écrivent souvent l'allergie
// alimentaire dans la case médicale — « Allergie : Baobab », « Une allergie
// escargot ». Ne lire que la case « alimentaire » laisserait ces jeunes hors
// de la liste, et c'est exactement le genre d'oubli qui met quelqu'un à
// l'hôpital.
//
// Principe de toute cette lecture, comme pour les points de vigilance : mieux
// vaut une ligne de trop qu'un allergique oublié. Rien n'est jamais écarté en
// silence — ce qu'aucune catégorie ne reconnaît est reporté tel quel, à lire.

// Les ligatures comptent autant que les accents : « œuf » s'écrit ainsi, et
// une allergie aux œufs que l'on ne reconnaît pas parce que la lettre est
// collée, c'est une allergie qui n'arrive pas en cuisine.
const sansAccents = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");

export type Eviction = {
  cle: string;
  /** Ce que la cuisine doit retirer du plat. */
  titre: string;
  /** Ce qu'il faut faire, dit à la cuisine. */
  consigne: string;
  motif: RegExp;
};

/**
 * Une allergie, ou une préférence ?
 *
 * La différence n'est pas de degré : l'une contrarie, l'autre envoie à
 * l'hôpital. C'est la famille qui la dit, et elle la dit en écrivant le mot —
 * « allergie à l'arachide », « allergique aux œufs ». On la croit sur parole
 * plutôt que de décider à sa place quel aliment mérite le rouge : personne ici
 * ne connaît le dossier de son enfant mieux qu'elle.
 */
export const estAllergie = (declaration: string) =>
  /allergi|anaphyla|intoxic/.test(sansAccents(declaration));

/**
 * Les membres d'une déclaration, séparément.
 *
 * « Ne mange pas de porc · Allergie : Baobab » dit deux choses, et une seule
 * est une allergie. Les lire ensemble ferait écrire « sans porc (allergie
 * déclarée) » sur le document du fournisseur — une alarme fausse, et une
 * alarme fausse use les vraies.
 */
const membres = (declaration: string) =>
  declaration.split(/[·;,]/).map((m) => m.trim()).filter(Boolean);

export const EVICTIONS: Eviction[] = [
  {
    cle: "arachide",
    titre: "Arachide et fruits à coque",
    consigne:
      "Aucune arachide, pâte d'arachide, huile d'arachide ni fruit à coque, y compris dans les sauces et les fritures. Ustensiles et huile de friture séparés.",
    motif: /arachide|cacahu|\bnoix\b|amande|anacarde|cajou|pistache|noisette/,
  },
  {
    cle: "mer",
    titre: "Fruits de mer, escargot, poisson",
    consigne:
      "Plat sans produit de la mer ni escargot, préparé avant les autres et à part — les traces suffisent à déclencher une réaction.",
    motif: /fruits? de mer|crustac|crevette|escargot|poisson|calmar|moule|crabe/,
  },
  {
    cle: "baobab",
    titre: "Baobab",
    consigne: "Ni jus, ni feuilles, ni poudre de baobab dans les sauces et les boissons.",
    motif: /baobab/,
  },
  {
    cle: "lait",
    titre: "Lait et produits laitiers",
    consigne: "Sans lait, beurre, fromage ni yaourt. Prévoir une boisson de remplacement.",
    motif: /lactose|\blaits?\b|laitier|laitiere|fromage|yaourt|beurre/,
  },
  {
    cle: "gluten",
    titre: "Gluten",
    consigne: "Sans blé : ni pain, ni pâtes, ni farine de blé. Riz, igname, manioc conviennent.",
    motif: /gluten|\bbles?\b|farine|coeliaque|celiaque/,
  },
  {
    cle: "oeuf",
    titre: "Œuf",
    consigne: "Sans œuf, y compris dans les préparations et les sauces.",
    motif: /\boeufs?\b/,
  },
  { cle: "soja", titre: "Soja", consigne: "Sans soja ni sauce de soja.", motif: /soja/ },
  {
    cle: "porc",
    titre: "Sans porc",
    consigne:
      "Remplacer le porc par une autre viande. Concerne aussi le jambon, le lard et la charcuterie.",
    motif: /\bporcs?\b|cochon|jambon|\blard\b|charcuterie/,
  },
  {
    cle: "vegetarien",
    titre: "Végétarien — sans viande",
    consigne:
      "Repas complet sans viande ni poisson, avec une source de protéines (haricots, arachide si permise, œuf si permis).",
    motif: /vegetarien|vegetarienne|vegetalien|vegetalienne|vegan|sans viande|pas de viande/,
  },
  {
    cle: "epices",
    titre: "Sans piment ni épices fortes",
    consigne: "Servir la part avant l'assaisonnement, piment à côté.",
    motif: /piment|epice|epicee|spicy/,
  },
  {
    cle: "sel",
    titre: "Régime sans sel",
    consigne:
      "Part prélevée avant le salage, et pas de cube ni de bouillon salé dans la sauce. Le sel est servi à part.",
    motif: /sans sel|peu de sel|hyposod|sans cube/,
  },
];

/**
 * Ne garder d'un texte que ce qui parle de nourriture.
 *
 * La case médicale mélange tout : « Sinusite, mal de dos, allergie escargot ».
 * On la découpe en membres de phrase et l'on ne retient que ceux qui nomment
 * un aliment — le fournisseur reçoit « allergie escargot », pas la sinusite.
 */
export function partAlimentaire(texte: string | null): string | null {
  if (!texte) return null;
  const morceaux = texte
    .split(/[;.,—–]|\bet\b/gi)
    .map((m) => m.trim())
    .filter(Boolean)
    .filter((m) => EVICTIONS.some((e) => e.motif.test(sansAccents(m))));
  return morceaux.length > 0 ? morceaux.join(", ") : null;
}

export type LigneRepas = {
  id: string;
  nom: string;
  sexe: string;
  compagnie: string | null;
  groupe: string | null;
  /** Ce que la famille a écrit, réduit à ce qui touche la nourriture. */
  declaration: string;
  evictions: string[];
  /** La famille a écrit « allergie » : une erreur ne se rattrape pas. */
  allergie: boolean;
  /** Aucune catégorie reconnue : à lire à la main avant le premier service. */
  aLire: boolean;
};

type Source = {
  id: string;
  prenom: string;
  nom: string;
  sexe: string;
  medical: string | null;
  alimentaire: string | null;
  groupe: { nom: string; compagnie: { nom: string } | null } | null;
};

/**
 * La liste des repas à adapter, à partir des jeunes attendus.
 *
 * Une déclaration purement alimentaire (« Végétarienne ») est reprise entière ;
 * d'une déclaration médicale, seule la part alimentaire ressort.
 */
export function lignesRepas(jeunes: Source[]): LigneRepas[] {
  const lignes: LigneRepas[] = [];
  for (const j of jeunes) {
    const morceaux = [j.alimentaire?.trim() || null, partAlimentaire(j.medical)].filter(
      Boolean
    ) as string[];
    if (morceaux.length === 0) continue;
    const declaration = [...new Set(morceaux)].join(" · ");
    const normalise = sansAccents(declaration);
    const evictions = EVICTIONS.filter((e) => e.motif.test(normalise)).map((e) => e.cle);
    lignes.push({
      id: j.id,
      nom: `${j.prenom} ${j.nom}`,
      sexe: j.sexe,
      compagnie: j.groupe?.compagnie?.nom ?? null,
      groupe: j.groupe?.nom ?? null,
      declaration,
      evictions,
      allergie: estAllergie(declaration),
      aLire: evictions.length === 0,
    });
  }
  return lignes.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/** Combien de plats adapter par nature, pour le tableau de la cuisine. */
export function comptesParEviction(lignes: LigneRepas[]) {
  return EVICTIONS.map((e) => {
    const concernes = lignes.filter((l) => l.evictions.includes(e.cle));
    return {
      ...e,
      nombre: concernes.length,
      // Une seule allergie déclarée sur cet aliment-là suffit à marquer la
      // catégorie : la cuisine ne peut pas savoir laquelle des quatre assiettes
      // est celle qui compte, elle les traite donc toutes avec le même soin.
      allergie: concernes.some((l) =>
        membres(l.declaration).some((m) => e.motif.test(sansAccents(m)) && estAllergie(m))
      ),
    };
  }).filter((e) => e.nombre > 0);
}
