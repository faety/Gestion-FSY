// Rapprochement des inscriptions avec les comptes déjà en base.
//
// Les 66 comptes d'amorçage viennent des listes officielles : ils portent le
// rôle, la compagnie, le groupe — mais un identifiant fabriqué à partir du nom,
// qui ne reçoit aucun message. Quand la même personne s'inscrit ensuite avec sa
// vraie adresse, l'application crée un second compte, vide de tout.
//
// Deux comptes pour une personne, ce n'est pas un détail : le groupe reste
// attaché à l'ancien, la personne se connecte au nouveau et ne voit aucun
// jeune, et à la clôture elle recevrait deux attestations dont une sans
// effectif. D'où ce rapprochement — qui propose, sans jamais décider seul.

/** Minuscules, sans accents ni ponctuation : « Kouamé N'Guessan » → « kouame nguessan ». */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['''`-]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Mots significatifs d'un nom complet, sans les particules ni les initiales. */
export function jetons(prenom: string, nom: string): string[] {
  const ignores = new Set(["de", "du", "des", "le", "la", "les", "da", "di", "van", "von"]);
  return [
    ...new Set(
      normaliser(`${prenom} ${nom}`)
        .split(" ")
        .filter((m) => m.length >= 2 && !ignores.has(m))
    ),
  ];
}

/**
 * Proximité de deux noms, entre 0 et 1.
 *
 * Comparaison par ensembles de mots : les deux listes officielles inversaient
 * l'ordre du prénom et du nom, et quelqu'un qui s'inscrit ne redonne pas
 * toujours ses trois prénoms. « Bohoussou Affoué Marie France » et
 * « Affoué Bohoussou » doivent donc se reconnaître.
 */
export function proximite(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const communs = a.filter((m) => b.includes(m)).length;
  return communs / Math.min(a.length, b.length);
}

export type Personne = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  sexe: string;
  role: string;
};

export type Candidat<T> = { compte: T; score: number; communs: number };

export type Fiabilite = "certain" | "probable" | "à vérifier";

/**
 * Comptes existants qui pourraient être la même personne, du plus probable au
 * moins probable.
 *
 * Le seuil est volontairement bas : mieux vaut proposer un rapprochement qu'un
 * humain écarte d'un coup d'œil, que de n'en proposer aucun et laisser deux
 * comptes vivre côte à côte sans que personne s'en aperçoive.
 */
export function candidats<T extends Personne>(
  inscrit: Personne,
  comptes: T[],
  { seuil = 0.5, minimum = 1 }: { seuil?: number; minimum?: number } = {}
): Candidat<T>[] {
  const a = jetons(inscrit.prenom, inscrit.nom);
  return comptes
    .filter((c) => c.id !== inscrit.id)
    .map((compte) => {
      const b = jetons(compte.prenom, compte.nom);
      return { compte, score: proximite(a, b), communs: a.filter((m) => b.includes(m)).length };
    })
    .filter((c) => c.score >= seuil && c.communs >= minimum)
    .sort((x, y) => y.score - x.score || y.communs - x.communs);
}

/**
 * Degré de confiance affiché à côté de la proposition.
 *
 * Un seul mot en commun ne peut jamais valoir « certain », même quand il couvre
 * tout le nom saisi : « Grace » désigne aussi bien Dea Grace que Tea Grace, deux
 * personnes distinctes de la liste. Il faut au moins deux mots concordants pour
 * qu'un rapprochement mérite d'être annoncé comme sûr.
 */
export const rapprochementSur = (c: { score: number; communs: number }): Fiabilite =>
  c.score >= 0.99 && c.communs >= 2 ? "certain" : c.communs >= 2 ? "probable" : "à vérifier";

/**
 * Un rapprochement assez net pour qu'on refuse de créer un compte de plus sans
 * que quelqu'un l'ait dit explicitement.
 *
 * C'est le garde-fou du formulaire de validation : tant qu'on se contentait de
 * *proposer* le rattachement, il suffisait d'un clic distrait sur « Valider »
 * pour fabriquer un doublon — et le doublon ne se voyait qu'après, dans
 * l'organigramme, une fois le groupe resté sur l'ancien compte.
 */
export const rapprochementBloquant = (c: { score: number; communs: number }): boolean =>
  rapprochementSur(c) !== "à vérifier";

export type Doublon<T> = { a: T; b: T; score: number; communs: number; fiabilite: Fiabilite };

/**
 * Comptes déjà validés qui désignent vraisemblablement la même personne.
 *
 * Le rapprochement des inscriptions ne regarde que ce qui entre ; il ne dit
 * rien des doublons déjà installés — ceux créés avant qu'il existe, ou nés
 * d'une validation faite trop vite. Cette passe-là relit l'équipe entière et
 * compare chacun à chacun.
 *
 * Deux mots communs sont exigés, jamais un seul : l'encadrement compte
 * plusieurs Kouassi et plusieurs Grace qui sont bien des personnes
 * différentes, et proposer de les fondre serait un mauvais conseil.
 */
export function doublons<T extends Personne>(
  comptes: T[],
  { seuil = 0.75 }: { seuil?: number } = {}
): Doublon<T>[] {
  const mots = new Map(comptes.map((c) => [c.id, jetons(c.prenom, c.nom)]));
  const paires: Doublon<T>[] = [];
  for (let i = 0; i < comptes.length; i++) {
    for (let j = i + 1; j < comptes.length; j++) {
      const a = mots.get(comptes[i].id)!;
      const b = mots.get(comptes[j].id)!;
      const communs = a.filter((m) => b.includes(m)).length;
      if (communs < 2) continue;
      const score = proximite(a, b);
      if (score < seuil) continue;
      paires.push({
        a: comptes[i],
        b: comptes[j],
        score,
        communs,
        fiabilite: rapprochementSur({ score, communs }),
      });
    }
  }
  return paires.sort((x, y) => y.score - x.score || y.communs - x.communs);
}
