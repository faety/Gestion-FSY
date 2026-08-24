// Retrouver un enfant déjà inscrit à partir du nom donné à l'accueil.
//
// Quand un conseiller ajoute un enfant « qui n'est pas sur la liste », le vrai
// risque n'est pas d'en créer un : c'est d'en créer un DEUXIÈME. La famille
// s'est souvent inscrite — sous un autre pieu, avec une orthographe voisine,
// avec trois prénoms là où l'accueil n'en note qu'un. C'est pourquoi la
// recherche se fait sur le nom seul, dans toute la base, et pas à pieu et
// paroisse identiques : une correspondance stricte raterait justement les cas
// qui arrivent.
//
// La mécanique est celle du rapprochement des comptes d'encadrants
// (rapprochement.ts) : mots normalisés, ordre indifférent, particules
// ignorées. Deux mots communs au minimum — un prénom seul rapprocherait la
// moitié de la conférence (le fichier compte plusieurs Grace et plusieurs
// Koffi qui sont bien des enfants différents).
//
// C'est un filet, pas un juge : la décision reste au conseiller, qui a
// l'enfant devant lui et la fiche sous les yeux.
import { jetons, proximite } from "./rapprochement";

export type JeuneRapprochable = { id: string; prenom: string; nom: string };

// La normalisation commune soude « Jean-Marie » en un mot — voulu pour les
// apostrophes (N'Guessan/Nguessan), trompeur pour les traits d'union : à
// l'accueil, on écrit « Jean Marie » aussi souvent que « Jean-Marie ». Ici,
// le trait d'union sépare.
const sansTirets = (t: string) => t.replace(/-/g, " ");
const mots = (prenom: string, nom: string) => jetons(sansTirets(prenom), sansTirets(nom));

export function rapprocherJeunes<T extends JeuneRapprochable>(
  saisie: { prenom: string; nom: string },
  jeunes: T[],
  { maximum = 6 }: { maximum?: number } = {}
): T[] {
  const a = mots(saisie.prenom, saisie.nom);
  return jeunes
    .map((j) => {
      const b = mots(j.prenom, j.nom);
      return { jeune: j, communs: a.filter((m) => b.includes(m)).length, score: proximite(a, b) };
    })
    .filter((c) => c.communs >= 2)
    .sort((x, y) => y.score - x.score || y.communs - x.communs)
    .slice(0, maximum)
    .map((c) => c.jeune);
}
