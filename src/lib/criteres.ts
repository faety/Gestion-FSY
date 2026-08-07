// ============================================================================
// CRITÈRES OFFICIELS FSY 2026 — d'après les rapports par pieu du 29 juillet 2026
// ============================================================================

import { CONFERENCE, DATE_DEBUT } from "./theme";

// Le critère se lit au premier jour de la conférence : le déplacer déplace le
// critère. Trois semaines plus tard, quelqu'un qui avait dix-huit ans peut en
// avoir dix-neuf — d'où la dérivation, plutôt qu'une date recopiée.
export const DATE_CONFERENCE = DATE_DEBUT;
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
// 18 ans au premier jour de la conférence (jour et mois de naissance pris en
// compte, pas seulement l'année). »
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
    return { valide: false, motif: `Plus de 18 ans au ${CONFERENCE.du}`, ageConference, ageFinAnnee };
  }
  if (ageFinAnnee < 14) {
    return { valide: false, motif: "Moins de 14 ans au 31/12/2026", ageConference, ageFinAnnee };
  }
  return { valide: true, ageConference, ageFinAnnee };
}

// Deux inscriptions approuvées pour le même prénom, le même nom et le même sexe :
// soit un doublon de saisie, soit deux homonymes. On ne tranche pas — on remonte
// les éléments (date de naissance, paroisse, groupe) pour que le pieu vérifie.
export type Doublon<T> = { cle: string; libelle: string; fiches: T[] };

/** Nombre de mots commençant par une majuscule : sert à choisir la saisie la mieux orthographiée. */
const motsCapitalises = (s: string) =>
  s.trim().split(/\s+/).filter((mot) => mot[0] && mot[0] === mot[0].toLocaleUpperCase("fr")).length;

export function doublonsProbables<
  T extends { prenom: string; nom: string; sexe: string; statutInscription: string },
>(jeunes: T[]): Doublon<T>[] {
  const parNom = new Map<string, T[]>();
  for (const j of jeunes) {
    if (!estAccepte(j.statutInscription)) continue;
    const cle = `${j.prenom.trim().toLowerCase()}|${j.nom.trim().toLowerCase()}|${j.sexe}`;
    parNom.set(cle, [...(parNom.get(cle) ?? []), j]);
  }
  return [...parNom.entries()]
    .filter(([, fiches]) => fiches.length > 1)
    .map(([cle, fiches]) => {
      // Les doublons diffèrent souvent par la casse (« Chris » / « chris »).
      // On affiche la saisie la mieux orthographiée, sinon le libellé dépendrait
      // de l'ordre de lecture en base et la page paraîtrait négligée.
      const mieux = fiches.reduce((a, b) =>
        motsCapitalises(`${b.prenom} ${b.nom}`) > motsCapitalises(`${a.prenom} ${a.nom}`) ? b : a
      );
      return { cle, libelle: `${mieux.prenom} ${mieux.nom}`, fiches };
    })
    .sort((a, b) => b.fiches.length - a.fiches.length || a.libelle.localeCompare(b.libelle, "fr"));
}

// Statuts d'inscription : seul « Approuvée » est accepté à la conférence
export const STATUT_ACCEPTE = "Approuvée";
export const STATUT_ANNULE = "Annulé(e)";
export const estAccepte = (statut: string) => statut === STATUT_ACCEPTE;
export const estAnnule = (statut: string) => statut === STATUT_ANNULE;
// Base de calcul du nombre de conseillers : les jeunes attendus, c'est-à-dire
// les inscriptions non annulées (celles en attente restent à régulariser).
export const estAttendu = (statut: string) => !estAnnule(statut);

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
