import { Attestation, type DonneesAttestation } from "@/components/Attestation";
import { AttestationPrestige } from "@/components/AttestationPrestige";

// Aiguillage entre les designs d'attestation. Le contenu, le code et le QR
// sont identiques ; seul l'habillage suit le choix de la personne.
export function AttestationSelonModele({
  modele,
  donnees,
  derniere = true,
}: {
  modele: string;
  donnees: DonneesAttestation;
  derniere?: boolean;
}) {
  if (modele === "PRESTIGE_FR") {
    return <AttestationPrestige donnees={donnees} langue="fr" derniere={derniere} />;
  }
  if (modele === "PRESTIGE_EN") {
    return <AttestationPrestige donnees={donnees} langue="en" derniere={derniere} />;
  }
  return <Attestation donnees={donnees} derniere={derniere} />;
}

/** Le modèle s'imprime-t-il sur une page A4 paysage ? */
export const estModelePaysage = (modele: string) => modele.startsWith("PRESTIGE");

/** Dimensions à l'écran d'un modèle, pour dimensionner l'aperçu. */
export function apercuDuModele(modele: string): {
  hauteurMm: number;
  largeurMm: number;
  paysage: boolean;
} {
  return estModelePaysage(modele)
    ? { hauteurMm: 210, largeurMm: 297, paysage: true }
    : { hauteurMm: 2 * 297, largeurMm: 210, paysage: false };
}

/** Pages A4 qu'imprime un modèle (le classique est recto-verso, deux pages). */
export const pagesDuModele = (modele: string) => (modele.startsWith("PRESTIGE") ? 1 : 2);
