// Cadre d'aperçu commun aux pages qui affichent une attestation à taille réelle.
//
// L'aperçu est réduit à l'écran pour tenir sur un téléphone, et rendu à taille
// exacte à l'impression. La hauteur du bloc suit la réduction : sans cela, un
// grand vide resterait sous l'aperçu.
export function StyleImpression() {
  return (
    <style>
      {`@media print { @page { size: A4 portrait; margin: 0 } }
        .apercu { --e: 0.44; height: calc(var(--h) * var(--e)); overflow-y: hidden; overflow-x: auto }
        .apercu > div { transform: scale(var(--e)); transform-origin: top left }
        @media (min-width: 640px) { .apercu { --e: 0.66 } }
        @media (min-width: 1024px) { .apercu { --e: 1 } }
        @media print {
          .apercu { height: auto; overflow: visible }
          /* La largeur d'écran (jusqu'à 297 mm pour les feuilles paysage) doit
             retomber à 210 mm : plus large que la page, Chrome rétrécirait
             tout le lot pour la faire tenir. */
          .apercu > div { transform: none; width: 210mm !important }
        }
        /* Feuilles à l'italienne (modèles Prestige) : affichées à plat à
           l'écran, pivotées dans une page A4 portrait à l'impression — le
           réglage d'imprimante ne change pas, on tourne la feuille. */
        .paysage { width: 296.5mm; height: 210mm }
        @media print {
          .porte-paysage { width: 210mm; height: 296.5mm; overflow: hidden }
          .porte-paysage > .paysage { transform: rotate(90deg) translateY(-210mm); transform-origin: top left }
        }`}
    </style>
  );
}

/**
 * `feuilles` : nombre de pages A4 portrait contenues, pour la hauteur réduite.
 * `hauteurMm` : hauteur exacte à l'écran quand le contenu n'est pas fait de
 * pages portrait (feuilles à l'italienne, lots mélangés) — prime sur `feuilles`.
 * `largeurMm` : largeur du contenu à l'écran (296.5 pour une feuille paysage).
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
