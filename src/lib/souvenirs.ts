// ════════════════════════════════════════════════════════════════════════════
//  L'album partagé — le lien court de la conférence
// ════════════════════════════════════════════════════════════════════════════
//
// Les photos de la conférence vivent aussi dans un album Google Photos, dont
// l'adresse est un identifiant illisible que personne ne peut dicter ni
// retenir. L'application sert donc de raccourci : fsy.ci/souvenir2026 renvoie
// dessus.
//
// Un chemin, pas un sous-domaine : souvenir2026.fsy.ci retomberait exactement
// dans le piège qui a fait disparaître 2026.fsy.ci du DNS (voir site.ts) — un
// nœud vide de la zone que le caractère générique cesse de servir. Un chemin
// ne dépend de rien d'autre que du site lui-même.
//
// La redirection est temporaire, jamais permanente : un 301 se grave dans les
// navigateurs et l'album ne serait plus jamais changeable. Et la variable
// d'environnement LIEN_ALBUM_SOUVENIRS prime sur la valeur ci-dessous — de
// quoi changer d'album sans rien redéployer.
const ALBUM_DEFAUT = "https://photos.app.goo.gl/xDKH1CtWAzUiZNav6";

export const LIEN_ALBUM_SOUVENIRS =
  process.env.LIEN_ALBUM_SOUVENIRS?.trim() || ALBUM_DEFAUT;

// Qui peut emporter toute la galerie d'un coup ?
//
// Pour l'instant : personne d'autre que Bérenger, à sa demande. Une archive
// rassemble en un fichier des centaines de photos de mineurs — autant que cela
// reste, le temps de la mise au point, entre les mains de celui qui en répond.
// Chacun garde par ailleurs le téléchargement photo par photo, qui n'a pas
// changé.
//
// Pour élargir plus tard : ajouter l'adresse ici (Armande, les coordonnateurs
// principaux), il n'y a rien d'autre à toucher. Le bouton et la route suivent.
const COMPTES_ARCHIVE = ["berenger@fsy2026.ci"];

export function peutToutTelecharger(user: {
  email: string;
  apercu?: string | null;
}): boolean {
  // En mode aperçu, on voit l'application avec les yeux d'un autre appel :
  // le bouton ne doit pas apparaître là où l'autre ne l'aurait pas.
  if (user.apercu) return false;
  return COMPTES_ARCHIVE.includes(user.email.trim().toLowerCase());
}
