// ════════════════════════════════════════════════════════════════════════════
//  L'album partagé — le lien court de la conférence
// ════════════════════════════════════════════════════════════════════════════
//
// Les photos de la conférence vivent aussi dans un album Google Photos, dont
// l'adresse est un identifiant illisible que personne ne peut dicter ni
// retenir. L'application sert donc de raccourci : fsy.ci/souvenir2026 renvoie
// dessus.
//
// Deux portes vers le même album, à la demande du couple dirigeant :
//
//   • le chemin fsy.ci/souvenir2026, qui ne dépend que du site lui-même et
//     marche dès le déploiement ;
//   • le sous-domaine souvenir2026.fsy.ci, plus court à dicter, mais qui
//     demande que le DNS le résolve et que Vercel connaisse le domaine.
//
// Le sous-domaine mérite une précaution, apprise de 2026.fsy.ci (voir
// site.ts) : ne jamais rien créer SOUS lui — pas de send.souvenir2026.fsy.ci,
// pas de _dmarc — sinon il devient un nœud vide de la zone, le caractère
// générique cesse de le servir (RFC 4592), et il disparaît du jour au
// lendemain. Un sous-domaine qui ne sert qu'à rediriger ne risque rien tant
// qu'on ne lui accroche aucun service.
//
// La redirection est temporaire, jamais permanente : un 301 se grave dans les
// navigateurs et l'album ne serait plus jamais changeable. Et la variable
// d'environnement LIEN_ALBUM_SOUVENIRS prime sur la valeur ci-dessous — de
// quoi changer d'album sans rien redéployer.
const ALBUM_DEFAUT = "https://photos.app.goo.gl/xDKH1CtWAzUiZNav6";

export const LIEN_ALBUM_SOUVENIRS =
  process.env.LIEN_ALBUM_SOUVENIRS?.trim() || ALBUM_DEFAUT;

/**
 * Les premières étiquettes d'hôte qui ne servent que l'album.
 *
 * Le middleware compare la première étiquette du nom demandé : tout ce qui
 * arrive sur souvenir2026.fsy.ci (ou souvenirs.fsy.ci) repart vers l'album,
 * quel que soit le chemin. Le site lui-même, sur fsy.ci ou www.fsy.ci, n'est
 * jamais concerné.
 */
export const SOUS_DOMAINES_ALBUM = ["souvenir2026", "souvenirs"];

// Qui peut emporter toute la galerie d'un coup ?
//
// Le couple dirigeant, et lui seul. Une archive rassemble en un fichier des
// centaines de photos de mineurs : elle reste entre les mains de ceux qui en
// répondent devant les familles. Les coordinateurs principaux ne l'ont pas —
// ils voient la galerie, ils téléchargent photo par photo, comme avant.
//
// Pour élargir plus tard sans toucher au rôle : ajouter une adresse ci-dessous.
// Le bouton et la route suivent, il n'y a rien d'autre à changer.
const COMPTES_ARCHIVE: string[] = [];

export function peutToutTelecharger(user: {
  email: string;
  role: string;
  apercu?: string | null;
}): boolean {
  // En mode aperçu, on voit l'application avec les yeux d'un autre appel :
  // le bouton ne doit pas apparaître là où l'autre ne l'aurait pas.
  if (user.apercu) return false;
  if (user.role === "DIRIGEANT") return true;
  return COMPTES_ARCHIVE.includes(user.email.trim().toLowerCase());
}
