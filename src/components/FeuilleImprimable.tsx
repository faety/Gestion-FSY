// Cadre d'aperçu commun aux pages qui affichent une attestation à taille réelle.
//
// L'aperçu est réduit à l'écran pour tenir sur un téléphone, et rendu à taille
// exacte à l'impression. La hauteur du bloc suit la réduction : sans cela, un
// grand vide resterait sous l'aperçu.
export function StyleImpression() {
  return (
    <style>
      {`@media print { @page { size: A4 portrait; margin: 0 } }
        .apercu { --e: 0.44; height: calc(var(--h) * var(--e)); overflow: hidden }
        .apercu > div { width: 210mm; transform: scale(var(--e)); transform-origin: top left }
        @media (min-width: 640px) { .apercu { --e: 0.66 } }
        @media (min-width: 1024px) { .apercu { --e: 1 } }
        @media print {
          .apercu { height: auto; overflow: visible }
          .apercu > div { transform: none }
        }`}
    </style>
  );
}

/** `feuilles` : nombre de pages A4 contenues, pour calculer la hauteur réduite. */
export function Apercu({
  feuilles = 2,
  children,
}: {
  feuilles?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="apercu overflow-x-auto -mx-4 px-4 print:overflow-visible print:mx-0 print:px-0"
      style={{ ["--h" as string]: `${feuilles * 297}mm` }}
    >
      <div>{children}</div>
    </div>
  );
}
