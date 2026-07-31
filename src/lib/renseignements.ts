// Renseignements déclarés à l'inscription : ce qui mérite d'être retenu, et
// comment retrouver le jeune à qui une ligne se rapporte.
//
// Le formulaire d'inscription est un champ libre, et « rien à signaler » s'y
// écrit d'une vingtaine de façons. Les conserver ferait de chaque badge une
// fausse alerte, et une liste de vigilance où tout le monde figure ne sert plus
// à personne.

const RIEN = [
  /^(aucun|aucune|aucuns|none|rien|ras|r\.a\.s|neant|néant|non|nan|null|n|n\/a|na)\.?$/i,
  /^rien (à|a) signaler\.?$/i,
  /^(pas|aucun|aucune|sans)\s+(de\s+|d')?(probl[eè]me|souci|soucis|r[eé]gime|contrainte|allergie|restriction|maladie|traitement)/i,
  /^(il|elle)\s+mange\s+(de\s+)?tout/i,
  /^(everything|all)\s+(alright|good|fine|is fine|ok)/i,
  /^nothing\s+(to mention|to report|special)/i,
  /^tout va bien/i,
  /^ok\.?$/i,
  /^(r\.?a\.?s\.?\s*)?(aucun|auncun|aucun[a-z]?|nean|néan|neant)[a-z\s.]{0,3}$/i,
  /^(je|il|elle)\s+mange\s+(de\s+)?tout/i,
  /^[\s.,;:\-–—_/*+()0]*$/, // ponctuation seule ou champ quasi vide
  // Réponses tapées à la va-vite dans un champ obligatoire : deux lettres qui
  // ne veulent rien dire. « ne » n'est pas une allergie, et l'afficher comme
  // alerte affaiblirait toutes les autres.
  /^(ne|no|nn|ni|pa|ok|rr|xx|zz|nu)$/i,
];

/** La déclaration porte-t-elle une information ? Sinon, on n'en garde rien. */
export const renseignementUtile = (v: string | null | undefined): string | null => {
  const s = v?.trim();
  if (!s) return null;
  // « "aucune" », « «néant» », « (RAS) » : les guillemets et parenthèses que
  // certains ajoutent ne changent rien au fait qu'il n'y a rien à signaler.
  const nu = s.replace(/^[\s"'«»“”()\[\]]+|[\s"'«»“”()\[\]]+$/g, "").trim();
  if (!nu) return null;
  return RIEN.some((r) => r.test(nu)) ? null : s;
};

export type LigneSaisie = {
  /** Numéro de la ligne dans le texte collé, pour pouvoir la désigner. */
  numero: number;
  brut: string;
  nom: string;
  medical: string | null;
  alimentaire: string | null;
};

/**
 * Lecture d'un collage.
 *
 * Deux ou trois colonnes séparées par une tabulation, un point-virgule ou une
 * barre verticale : le nom, le renseignement médical, et facultativement la
 * contrainte alimentaire. C'est exactement ce que produit une copie de deux
 * colonnes d'un tableur, qui est la façon dont ces listes circulent.
 *
 * La virgule n'est volontairement pas un séparateur : « Sinusite, mal de dos,
 * vertiges » est une seule déclaration, et la découper en trois perdrait le
 * sens de chacune.
 */
export function lireSaisie(texte: string): LigneSaisie[] {
  const lignes: LigneSaisie[] = [];
  texte.split(/\r?\n/).forEach((brut, i) => {
    const ligne = brut.trim();
    if (!ligne) return;
    const colonnes = ligne.split(/\t|\s*[;|]\s*/).map((c) => c.trim());
    const nom = colonnes[0] ?? "";
    if (!nom) return;
    lignes.push({
      numero: i + 1,
      brut: ligne,
      nom,
      medical: renseignementUtile(colonnes[1]),
      alimentaire: renseignementUtile(colonnes[2]),
    });
  });
  return lignes;
}
