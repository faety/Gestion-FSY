// Cadre d'aperçu des documents imprimés depuis le navigateur (« Enregistrer en
// PDF ») : attestations, diplômes, fiches. Le contenu est composé en
// millimètres à taille réelle ; il est réduit à l'écran pour tenir sur un
// téléphone, et rendu à taille exacte à l'impression.
//
// Règle apprise à la dure : une feuille à l'italienne se déclare en page
// PAYSAGE (@page size: A4 landscape), elle n'est jamais tournée par CSS. Une
// rotation de 90° dans une page portrait paraît juste à l'écran, et sort à
// 87 % de la taille voulue : le moteur d'impression met tout à l'échelle pour
// rattraper une largeur calculée avant la rotation.
//
// Usage :
//   <StyleImpression paysage />
//   <Apercu hauteurMm={210} largeurMm={297}>
//     <div className="feuille paysage">…</div>
//   </Apercu>
export function StyleImpression({ paysage = false }: { paysage?: boolean }) {
  return (
    <style>
      {`@media print { @page { size: A4 ${paysage ? "landscape" : "portrait"}; margin: 0 } }
        .apercu { --e: 0.44; height: calc(var(--h) * var(--e)); overflow-y: hidden; overflow-x: auto }
        .apercu > div { transform: scale(var(--e)); transform-origin: top left }
        @media (min-width: 640px) { .apercu { --e: 0.66 } }
        @media (min-width: 1024px) { .apercu { --e: 1 } }
        @media print {
          /* Aucune marge autour de l'aperçu : 1 mm de trop en haut, et la
             feuille déborde sur une seconde page — blanche. */
          .apercu { height: auto; overflow: visible; margin: 0 !important; padding: 0 !important }
          /* La largeur d'écran doit retomber sur celle de la page : plus large
             qu'elle, le moteur d'impression rétrécirait tout le lot. */
          .apercu > div { transform: none; width: ${paysage ? "297mm" : "210mm"} !important }
        }
        .feuille { background: #fff; box-sizing: border-box; overflow: hidden }
        /* Une feuille par page ; pas de saut après la dernière (page blanche). */
        .feuille + .feuille { break-before: page }
        .portrait { width: 210mm; height: 297mm }
        .paysage { width: 297mm; height: 210mm }`}
    </style>
  );
}

/**
 * `feuilles` : nombre de pages A4 portrait contenues (pour la hauteur réduite).
 * `hauteurMm` / `largeurMm` : dimensions exactes quand le contenu n'est pas
 * fait de pages portrait (297 × 210 pour une feuille paysage).
 */
export function Apercu({
  feuilles = 1,
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
