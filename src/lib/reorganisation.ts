// Réorganisation du jour 1 : recomposer groupes et compagnies à partir de ce
// qui est RÉELLEMENT là — jeunes arrivés, conseillers et adjoints présents.
//
// Tout le calcul vit ici, en fonction pure : l'action serveur lui donne l'état
// et des paramètres, elle rend un plan et des statistiques, sans toucher à la
// base. On peut donc simuler autant de fois qu'on veut, et tester l'algorithme
// sans base de données.
//
// Principes, dans l'ordre (validés par le couple dirigeant) :
//   1. Stabilité d'abord — un jeune arrivé garde son conseiller si celui-ci
//      est présent.
//   2. Les groupes au conseiller absent sont déplacés EN BLOC : les jeunes qui
//      se connaissent restent ensemble, chez un conseiller libre ou dans un
//      groupe existant qui a de la place.
//   3. Les conseillers présents sans groupe reçoivent les blocs et surplus.
//   4. Les compagnies sont recomposées (filles + garçons), en survivant à
//      l'identique quand leurs groupes survivent, adjoints conservés.

export type JeunePresent = { id: string; sexe: string; groupeId: string | null };
export type GroupeActuel = {
  id: string;
  nom: string;
  sexe: string;
  conseillerId: string | null;
  compagnieId: string | null;
};
export type ConseillerDispo = { id: string; nom: string; sexe: string };
export type AdjointDispo = { id: string; nom: string; sexe: string; compagnieId: string | null };
export type CompagnieActuelle = { id: string; nom: string; numero: number | null };

export type DonneesReorganisation = {
  jeunesPresents: JeunePresent[];
  groupes: GroupeActuel[];
  conseillersPresents: ConseillerDispo[];
  adjointsPresents: AdjointDispo[];
  compagnies: CompagnieActuelle[];
};

export type ParametresReorganisation = {
  tailleCibleF: number;
  tailleCibleM: number;
  /** Groupes par compagnie (2 = une paire filles + garçons). */
  groupesParCompagnie: number;
};

export type GroupePlan = {
  /** Ligne existante conservée telle quelle ; null = à loger dans une coquille vide ou une nouvelle ligne. */
  groupeId: string | null;
  nom: string;
  sexe: string;
  conseillerId: string;
  jeuneIds: string[];
  conserve: boolean;
};

export type CompagniePlan = {
  compagnieId: string | null;
  nom: string;
  dirigeantIds: string[];
  /** Index des groupes du plan qui composent cette compagnie. */
  groupesIdx: number[];
  conservee: boolean;
};

export type StatsPlan = {
  presents: number;
  gardentConseiller: number;
  changentConseiller: number;
  sansGroupeAvant: number;
  groupesConserves: number;
  groupesDissous: number;
  groupesCrees: number;
  compagniesConservees: number;
  compagniesRecomposees: number;
  conseillersSansGroupe: number;
  avertissements: string[];
};

export type PlanReorganisation = {
  groupes: GroupePlan[];
  compagnies: CompagniePlan[];
  stats: StatsPlan;
};

const parNom = <T extends { nom: string }>(a: T, b: T) => a.nom.localeCompare(b.nom, "fr");

/** Tailles cibles proposées d'après le réel : jeunes présents / conseillers présents, bornées. */
export function taillesProposees(donnees: DonneesReorganisation): ParametresReorganisation {
  const cible = (sexe: string) => {
    const jeunes = donnees.jeunesPresents.filter((j) => j.sexe === sexe).length;
    const conseillers = donnees.conseillersPresents.filter((c) => c.sexe === sexe).length;
    if (jeunes === 0) return 10;
    if (conseillers === 0) return Math.min(20, jeunes);
    return Math.min(20, Math.max(6, Math.ceil(jeunes / conseillers)));
  };
  return { tailleCibleF: cible("F"), tailleCibleM: cible("M"), groupesParCompagnie: 2 };
}

// ---------- Répartition d'un sexe ----------

type GroupeEnCours = {
  groupeId: string | null;
  nom: string;
  conseillerId: string;
  jeuneIds: string[];
  conserve: boolean;
  compagnieOrigine: string | null;
};

function repartirSexe(
  sexe: string,
  donnees: DonneesReorganisation,
  taille: number,
  avertissements: string[]
): GroupeEnCours[] {
  const jeunes = donnees.jeunesPresents.filter((j) => j.sexe === sexe);
  const conseillers = [...donnees.conseillersPresents.filter((c) => c.sexe === sexe)].sort(parNom);
  const groupesDuSexe = [...donnees.groupes.filter((g) => g.sexe === sexe)].sort(parNom);
  const max = Math.min(20, taille + Math.max(2, Math.ceil(taille / 2)));

  if (jeunes.length === 0) return [];
  if (conseillers.length === 0) {
    avertissements.push(
      sexe === "F"
        ? `${jeunes.length} jeunes filles présentes mais aucune conseillère présente : groupes impossibles pour ce sexe.`
        : `${jeunes.length} jeunes gens présents mais aucun conseiller présent : groupes impossibles pour ce sexe.`
    );
    return [];
  }

  const presentsParGroupe = new Map<string, string[]>();
  for (const j of jeunes) {
    if (!j.groupeId) continue;
    presentsParGroupe.set(j.groupeId, [...(presentsParGroupe.get(j.groupeId) ?? []), j.id]);
  }

  const conseillersPresentsIds = new Set(conseillers.map((c) => c.id));
  const conseillersUtilises = new Set<string>();
  const enCours: GroupeEnCours[] = [];
  const blocs: { jeuneIds: string[] }[] = [];
  const isoles: string[] = [];

  // 1. Groupes conservés : conseiller présent et au moins un jeune arrivé.
  for (const g of groupesDuSexe) {
    const membres = presentsParGroupe.get(g.id) ?? [];
    if (
      g.conseillerId &&
      conseillersPresentsIds.has(g.conseillerId) &&
      !conseillersUtilises.has(g.conseillerId) &&
      membres.length > 0
    ) {
      conseillersUtilises.add(g.conseillerId);
      enCours.push({
        groupeId: g.id,
        nom: g.nom,
        conseillerId: g.conseillerId,
        jeuneIds: [...membres],
        conserve: true,
        compagnieOrigine: g.compagnieId,
      });
    } else if (membres.length > 0) {
      // Conseiller absent (ou déjà pris) : le groupe devient un bloc entier.
      blocs.push({ jeuneIds: [...membres] });
    }
  }
  // Isolés : sans groupe, ou rattachés à un groupe qui n'est pas de leur sexe
  // (anomalie de données) — personne ne doit tomber du plan.
  const idsGroupesDuSexe = new Set(groupesDuSexe.map((g) => g.id));
  for (const j of jeunes) {
    if (!j.groupeId || !idsGroupesDuSexe.has(j.groupeId)) isoles.push(j.id);
  }

  const libres = conseillers.filter((c) => !conseillersUtilises.has(c.id));

  // 2. Les blocs, du plus grand au plus petit : un conseiller libre à un bloc
  //    entier tant qu'il y en a, sinon le groupe qui a le plus de place.
  blocs.sort((a, b) => b.jeuneIds.length - a.jeuneIds.length);
  for (const bloc of blocs) {
    const libre = libres.shift();
    if (libre) {
      enCours.push({
        groupeId: null,
        nom: "",
        conseillerId: libre.id,
        jeuneIds: [...bloc.jeuneIds],
        conserve: false,
        compagnieOrigine: null,
      });
      continue;
    }
    // Plus de conseiller libre : verser le bloc là où il y a de la place, par
    // morceaux aussi gros que possible.
    let reste = [...bloc.jeuneIds];
    while (reste.length > 0) {
      const cible = [...enCours].sort((a, b) => a.jeuneIds.length - b.jeuneIds.length)[0];
      if (!cible) break;
      const place = Math.max(1, max - cible.jeuneIds.length);
      cible.jeuneIds.push(...reste.slice(0, place));
      reste = reste.slice(place);
    }
  }

  // 3. Les isolés comblent les groupes les moins remplis ; s'il reste des
  //    conseillers libres et assez d'isolés, ils ouvrent un nouveau groupe.
  const minNouveau = Math.max(3, Math.floor(taille / 2));
  let enAttente = [...isoles];
  while (libres.length > 0 && enAttente.length >= minNouveau) {
    const libre = libres.shift()!;
    enCours.push({
      groupeId: null,
      nom: "",
      conseillerId: libre.id,
      jeuneIds: enAttente.slice(0, taille),
      conserve: false,
      compagnieOrigine: null,
    });
    enAttente = enAttente.slice(taille);
  }
  for (const id of enAttente) {
    const cible = [...enCours].sort((a, b) => a.jeuneIds.length - b.jeuneIds.length)[0];
    if (cible) cible.jeuneIds.push(id);
  }

  // 4. Équilibrage final : aucun groupe au-dessus du plafond si un autre a de
  //    la place. On déplace en dernier les jeunes d'origine du conseiller.
  const original = new Map<string, string | null>();
  for (const j of jeunes) original.set(j.id, j.groupeId);
  let garde = 0;
  while (garde++ < 200) {
    const trop = enCours.find((g) => g.jeuneIds.length > max);
    const creux = [...enCours]
      .filter((g) => g.jeuneIds.length < taille)
      .sort((a, b) => a.jeuneIds.length - b.jeuneIds.length)[0];
    if (!trop || !creux || trop === creux) break;
    const idx = trop.jeuneIds.findIndex(
      (id) => trop.groupeId === null || original.get(id) !== trop.groupeId
    );
    const retire = trop.jeuneIds.splice(idx >= 0 ? idx : trop.jeuneIds.length - 1, 1)[0];
    creux.jeuneIds.push(retire);
  }

  return enCours;
}

// ---------- Le plan complet ----------

export function calculerPlan(
  donnees: DonneesReorganisation,
  params: ParametresReorganisation
): PlanReorganisation {
  const avertissements: string[] = [];
  const filles = repartirSexe("F", donnees, params.tailleCibleF, avertissements);
  const garcons = repartirSexe("M", donnees, params.tailleCibleM, avertissements);

  // Noms des nouveaux groupes : réutiliser les noms libérés, sinon numéroter.
  const nomsPris = new Set([...filles, ...garcons].filter((g) => g.groupeId).map((g) => g.nom));
  const nomsLiberes = donnees.groupes
    .map((g) => g.nom)
    .filter((n) => !nomsPris.has(n))
    .sort((a, b) => a.localeCompare(b, "fr"));
  let compteurNouveau = 1;
  const nommer = (g: GroupeEnCours, sexe: string) => {
    if (g.groupeId) return;
    const libere = nomsLiberes.shift();
    if (libere) {
      g.nom = libere;
      nomsPris.add(libere);
      return;
    }
    let nom = "";
    do {
      nom = `Groupe ${sexe === "F" ? "F" : "G"}-${compteurNouveau++}`;
    } while (nomsPris.has(nom));
    g.nom = nom;
    nomsPris.add(nom);
  };
  filles.forEach((g) => nommer(g, "F"));
  garcons.forEach((g) => nommer(g, "M"));

  const groupesPlan: GroupePlan[] = [
    ...filles.map((g) => ({ ...g, sexe: "F" })),
    ...garcons.map((g) => ({ ...g, sexe: "M" })),
  ].map(({ compagnieOrigine: _o, ...g }) => g);

  // ---------- Compagnies ----------
  // On apparie filles et garçons dans l'ordre de leur compagnie d'origine :
  // quand les deux groupes d'une compagnie survivent, la paire se reforme
  // d'elle-même et la compagnie est conservée avec ses adjoints.
  const ordreCompagnie = new Map(donnees.compagnies.map((c) => [c.id, c.numero ?? 999]));
  const triCompagnie = (a: GroupeEnCours, b: GroupeEnCours) =>
    (a.compagnieOrigine ? ordreCompagnie.get(a.compagnieOrigine) ?? 999 : 999) -
      (b.compagnieOrigine ? ordreCompagnie.get(b.compagnieOrigine) ?? 999 : 999) ||
    a.nom.localeCompare(b.nom, "fr");
  const fillesTriees = [...filles].sort(triCompagnie);
  const garconsTries = [...garcons].sort(triCompagnie);

  const indexDe = (g: GroupeEnCours) =>
    groupesPlan.findIndex((p) => p.nom === g.nom && p.sexe === (filles.includes(g) ? "F" : "M"));

  const parCompagnie = Math.max(2, params.groupesParCompagnie);
  const paires: GroupeEnCours[][] = [];
  const nbPaires = Math.max(fillesTriees.length, garconsTries.length);
  for (let i = 0; i < nbPaires; i++) {
    const paire = [fillesTriees[i], garconsTries[i]].filter(Boolean) as GroupeEnCours[];
    if (paire.length > 0) paires.push(paire);
  }
  // parCompagnie = 2 → une paire par compagnie ; 4 → deux paires ; etc.
  const pairesParCompagnie = Math.max(1, Math.floor(parCompagnie / 2));
  const lots: GroupeEnCours[][] = [];
  for (let i = 0; i < paires.length; i += pairesParCompagnie) {
    lots.push(paires.slice(i, i + pairesParCompagnie).flat());
  }

  const compagniesUtilisees = new Set<string>();
  const adjointsPris = new Set<string>();
  const adjointsParCompagnie = new Map<string, AdjointDispo[]>();
  for (const a of donnees.adjointsPresents) {
    if (!a.compagnieId) continue;
    adjointsParCompagnie.set(a.compagnieId, [
      ...(adjointsParCompagnie.get(a.compagnieId) ?? []),
      a,
    ]);
  }
  const adjointsFlottants = [...donnees.adjointsPresents].sort(parNom);
  const prendreBinome = (): string[] => {
    const restants = adjointsFlottants.filter((a) => !adjointsPris.has(a.id));
    const femme = restants.find((a) => a.sexe === "F");
    const homme = restants.find((a) => a.sexe === "M");
    const binome = [femme, homme].filter(Boolean) as AdjointDispo[];
    const choisis = binome.length > 0 ? binome : restants.slice(0, 1);
    choisis.forEach((a) => adjointsPris.add(a.id));
    return choisis.map((a) => a.id);
  };

  const nomsCompagniePris = new Set<string>();
  const compagniesLibres = [...donnees.compagnies].sort(
    (a, b) => (a.numero ?? 999) - (b.numero ?? 999)
  );
  let numeroNouvelle = 1;

  const compagniesPlan: CompagniePlan[] = lots.map((lot) => {
    // La compagnie d'origine survit si tous les groupes conservés du lot en
    // viennent et qu'elle n'est pas déjà prise.
    const origines = [
      ...new Set(lot.filter((g) => g.conserve && g.compagnieOrigine).map((g) => g.compagnieOrigine)),
    ];
    const origine =
      origines.length === 1 && !compagniesUtilisees.has(origines[0]!)
        ? donnees.compagnies.find((c) => c.id === origines[0])
        : undefined;
    if (origine) {
      compagniesUtilisees.add(origine.id);
      nomsCompagniePris.add(origine.nom);
      const siens = (adjointsParCompagnie.get(origine.id) ?? []).filter(
        (a) => !adjointsPris.has(a.id)
      );
      siens.forEach((a) => adjointsPris.add(a.id));
      return {
        compagnieId: origine.id,
        nom: origine.nom,
        dirigeantIds: siens.length > 0 ? siens.map((a) => a.id) : prendreBinome(),
        groupesIdx: lot.map(indexDe),
        conservee: true,
      };
    }
    // Sinon : réutiliser une ligne de compagnie libérée, ou en créer une.
    const reutilisee = compagniesLibres.find(
      (c) => !compagniesUtilisees.has(c.id) && !nomsCompagniePris.has(c.nom)
    );
    if (reutilisee) {
      compagniesUtilisees.add(reutilisee.id);
      nomsCompagniePris.add(reutilisee.nom);
      return {
        compagnieId: reutilisee.id,
        nom: reutilisee.nom,
        dirigeantIds: prendreBinome(),
        groupesIdx: lot.map(indexDe),
        conservee: false,
      };
    }
    let nom = "";
    do {
      nom = `Compagnie R${numeroNouvelle++}`;
    } while (nomsCompagniePris.has(nom));
    nomsCompagniePris.add(nom);
    return {
      compagnieId: null,
      nom,
      dirigeantIds: prendreBinome(),
      groupesIdx: lot.map(indexDe),
      conservee: false,
    };
  });

  const sansAdjoint = compagniesPlan.filter((c) => c.dirigeantIds.length === 0).length;
  if (sansAdjoint > 0) {
    avertissements.push(
      `${sansAdjoint} compagnie(s) sans adjoint présent : augmentez les groupes par compagnie ou affectez à la main.`
    );
  }

  // ---------- Statistiques ----------
  const conseillerOrigine = new Map<string, string | null>();
  for (const j of donnees.jeunesPresents) {
    const g = j.groupeId ? donnees.groupes.find((x) => x.id === j.groupeId) : null;
    conseillerOrigine.set(j.id, g?.conseillerId ?? null);
  }
  let gardent = 0;
  let changent = 0;
  let sansGroupeAvant = 0;
  for (const g of groupesPlan) {
    for (const id of g.jeuneIds) {
      const avant = conseillerOrigine.get(id);
      if (avant === null || avant === undefined) sansGroupeAvant++;
      else if (avant === g.conseillerId) gardent++;
      else changent++;
    }
  }
  const idsConserves = new Set(groupesPlan.filter((g) => g.groupeId).map((g) => g.groupeId));
  const groupesAvant = donnees.groupes.filter(
    (g) => (donnees.jeunesPresents.some((j) => j.groupeId === g.id) || g.conseillerId)
  ).length;
  const conseillersAffectes = new Set(groupesPlan.map((g) => g.conseillerId));

  return {
    groupes: groupesPlan,
    compagnies: compagniesPlan,
    stats: {
      presents: donnees.jeunesPresents.length,
      gardentConseiller: gardent,
      changentConseiller: changent,
      sansGroupeAvant,
      groupesConserves: idsConserves.size,
      groupesDissous: Math.max(0, groupesAvant - idsConserves.size),
      groupesCrees: groupesPlan.filter((g) => !g.groupeId).length,
      compagniesConservees: compagniesPlan.filter((c) => c.conservee).length,
      compagniesRecomposees: compagniesPlan.filter((c) => !c.conservee).length,
      conseillersSansGroupe: donnees.conseillersPresents.length - conseillersAffectes.size,
      avertissements,
    },
  };
}
