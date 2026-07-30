"use client";

import { useState } from "react";

// Deux façons de sortir le rapport final : le texte dans le presse-papier
// (pour le coller dans un courriel ou un document) et l'impression, qui sur
// téléphone comme sur ordinateur permet d'« Enregistrer en PDF ».
export function ExportSynthese({ texte, nomFichier }: { texte: string; nomFichier: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      // Sur les navigateurs qui refusent l'accès au presse-papier, on retombe
      // sur un téléchargement du fichier.
      telecharger();
      return;
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2500);
  }

  function telecharger() {
    const url = URL.createObjectURL(new Blob([texte], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nomFichier;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        onClick={copier}
        className="flex-1 min-w-[8rem] bg-fsy hover:bg-fsy-dark text-white font-medium rounded-lg px-4 py-2.5 text-sm transition"
      >
        {copie ? "✓ Copié" : "Copier le rapport"}
      </button>
      <button
        onClick={telecharger}
        className="flex-1 min-w-[8rem] bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg px-4 py-2.5 text-sm shadow-sm transition"
      >
        Télécharger (.md)
      </button>
      <button
        onClick={() => window.print()}
        className="flex-1 min-w-[8rem] bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg px-4 py-2.5 text-sm shadow-sm transition"
      >
        Imprimer / PDF
      </button>
    </div>
  );
}
