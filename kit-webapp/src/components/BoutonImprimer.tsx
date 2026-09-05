"use client";

/** Bouton « Imprimer » : n'existe qu'à l'écran, jamais sur le papier. */
export function BoutonImprimer({ libelle = "Imprimer ou enregistrer en PDF" }: { libelle?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden bg-marque hover:bg-marque-sombre text-white rounded-lg px-4 py-2.5 text-sm font-semibold"
    >
      🖨️ {libelle}
    </button>
  );
}
