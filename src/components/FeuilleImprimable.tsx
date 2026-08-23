// Cadre d'aperçu commun aux pages qui affichent une attestation à taille réelle.
//
// L'aperçu est réduit à l'écran pour tenir sur un téléphone, et rendu à taille
// exacte à l'impression. La hauteur du bloc suit la réduction : sans cela, un
// grand vide resterait sous l'aperçu.
//
// Deux formats de feuille, donc deux orientations de page :
//   • le modèle classique s'imprime sur une A4 portrait, recto-verso ;
//   • les modèles Prestige sont à l'italienne et s'impriment sur une A4
//     paysage — la page elle-même est déclarée paysage, la feuille n'est pas
//     tournée par une acrobatie de mise en forme.
//
// Ce second point a été appris à la dure. Une feuille à l'italienne pivotée de
// 90° dans une page portrait paraît juste à l'écran, et sort à 87 % de la
// taille voulue, décalée en haut à gauche : le moteur d'impression met tout à
// l'échelle pour rattraper une largeur qu'il calcule avant la rotation. Mesuré
// puis vérifié : en page paysage, sans rotation, l'encre couvre 296,6 × 209,6
// mm d'une A4 — bord à bord.
export function StyleImpression({ paysage = false }: { paysage?: boolean }) {
  return (
    <style>
      {`@media print { @page { size: A4 ${paysage ? "landscape" : "portrait"}; margin: 0 } }
        .apercu { --e: 0.44; height: calc(var(--h) * var(--e)); overflow-y: hidden; overflow-x: auto }
        .apercu > div { transform: scale(var(--e)); transform-origin: top left }
        @media (min-width: 640px) { .apercu { --e: 0.66 } }
        @media (min-width: 1024px) { .apercu { --e: 1 } }
        @media print {
          .apercu { height: auto; overflow: visible }
          /* La largeur d'écran doit retomber sur celle de la page : plus large
             qu'elle, le moteur d'impression rétrécirait tout le lot. */
          .apercu > div { transform: none; width: ${paysage ? "297mm" : "210mm"} !important }
        }
        /* Feuilles à l'italienne (modèles Prestige) : à plat, à l'écran comme
           sur la page paysage. */
        .paysage { width: 297mm; height: 210mm }
        @media print {
          .porte-paysage { width: 297mm; height: 210mm }
          ${
            paysage
              ? ""
              : `/* Repli : une feuille à l'italienne échouée dans un travail
                 portrait — un lot mélangé imprimé sans passer par les deux
                 passes. Elle est pivotée pour ne rien perdre, mais elle ne
                 remplira pas la page : c'est le cas qu'il faut éviter.  */
              .porte-paysage { width: 210mm; height: 297mm; overflow: hidden }
              .porte-paysage > .paysage { transform: rotate(90deg) translateY(-210mm); transform-origin: top left }`
          }
        }`}
    </style>
  );
}

/**
 * `feuilles` : nombre de pages A4 portrait contenues, pour la hauteur réduite.
 * `hauteurMm` : hauteur exacte à l'écran quand le contenu n'est pas fait de
 * pages portrait (feuilles à l'italienne, lots mélangés) — prime sur `feuilles`.
 * `largeurMm` : largeur du contenu à l'écran (297 pour une feuille paysage).
 */
export function Apercu({
  feuilles = 2,
  hauteurMm,
  largeurMm = 210,
  children,
}: {
  feuilles?: number;
  hauteurMm?: number;
  largeurMm?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="apercu -mx-4 px-4 print:overflow-visible print:mx-0 print:px-0"
      style={{ ["--h" as string]: `${hauteurMm ?? feuilles * 297}mm` }}
    >
      <div style={{ width: `${largeurMm}mm` }}>{children}</div>
    </div>
  );
}
