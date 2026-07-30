// ============================================================================
// CRITÈRES OFFICIELS FSY 2026 — d'après les rapports par pieu du 29 juillet 2026
// ============================================================================

export const DATE_CONFERENCE = new Date(2026, 7, 3); // 3 août 2026
export const FIN_ANNEE = new Date(2026, 11, 31); // 31 décembre 2026

export function ageA(naissance: Date, reference: Date): number {
  let age = reference.getFullYear() - naissance.getFullYear();
  const avant =
    reference.getMonth() < naissance.getMonth() ||
    (reference.getMonth() === naissance.getMonth() &&
      reference.getDate() < naissance.getDate());
  if (avant) age--;
  return age;
}

// « Un participant doit avoir au moins 14 ans au 31 décembre 2026 et au plus
// 18 ans au 3 août 2026 (jour et mois de naissance pris en compte, pas
// seulement l'année). »
export type VerdictAge =
  | { valide: true; ageConference: number; ageFinAnnee: number }
  | { valide: false; motif: string; ageConference: number | null; ageFinAnnee: number | null };

export function verifierAge(naissance: Date | null): VerdictAge {
  if (!naissance) {
    return {
      valide: false,
      motif: "Date de naissance invalide — à corriger",
      ageConference: null,
      ageFinAnnee: null,
    };
  }
  const ageConference = ageA(naissance, DATE_CONFERENCE);
  const ageFinAnnee = ageA(naissance, FIN_ANNEE);
  if (ageConference > 18) {
    return { valide: false, motif: "Plus de 18 ans au 03/08/2026", ageConference, ageFinAnnee };
  }
  if (ageFinAnnee < 14) {
    return { valide: false, motif: "Moins de 14 ans au 31/12/2026", ageConference, ageFinAnnee };
  }
  return { valide: true, ageConference, ageFinAnnee };
}

// Statuts d'inscription : seul « Approuvée » est accepté à la conférence
export const STATUT_ACCEPTE = "Approuvée";
export const estAccepte = (statut: string) => statut === STATUT_ACCEPTE;

export const LIBELLE_STATUT: Record<string, string> = {
  "Approuvée": "Approuvée",
  "En attente d’approbation": "En attente d'approbation",
  "En attente d'approbation": "En attente d'approbation",
  "Annulé(e)": "Annulée",
};

// « Le besoin est calculé séparément par sexe : nombre de participants du sexe
// ÷ 10 (arrondi à l'entier supérieur), puis + 2. »
export function conseillersAProposer(nbParticipantsDuSexe: number): number {
  return Math.ceil(nbParticipantsDuSexe / 10) + 2;
}

// Profil attendu des conseillers (rapports par pieu)
export const PROFIL_CONSEILLER = {
  age: "Jeune adulte seul, âgé de 19 à 35 ans, non marié",
  hommes: "Missionnaire de retour ayant terminé une mission avec honneur",
  femmes: "Le service missionnaire n'est pas obligatoire",
  temple: "Recommandation à l'usage du temple en cours de validité (ou digne d'en obtenir une)",
  formation: "Formation « Protéger les enfants et les jeunes » suivie avant la conférence",
};
