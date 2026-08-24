/**
 * Le jour sur lequel le programme s'ouvre.
 *
 * Pendant la conférence, c'est aujourd'hui : personne ne devrait avoir à
 * chercher le jour où il est. Avant et après, aucune journée ne correspond et
 * l'on retombe sur la vue d'ensemble — ouvrir sur la veille un mois à l'avance
 * n'aiderait personne, et le programme relu en septembre est de l'histoire.
 *
 * `maintenant` vient du serveur : un téléphone mal réglé ne doit pas ouvrir le
 * programme sur le mauvais jour. Les clés, elles, sont celles que la page
 * fabrique pour ses journées — les deux se lisent dans le même repère.
 *
 * Fonction séparée du composant parce qu'elle se vérifie seule, jour par jour,
 * sans navigateur ni horloge à truquer.
 */
export function jourParDefaut(cles: string[], maintenant: number): string | null {
  const aujourdhui = new Date(maintenant).toDateString();
  return cles.includes(aujourdhui) ? aujourdhui : null;
}
