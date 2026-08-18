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
