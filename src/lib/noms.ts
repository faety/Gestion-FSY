// ════════════════════════════════════════════════════════════════════════════
//  Correction du nom porté par une attestation
// ════════════════════════════════════════════════════════════════════════════
//
// Le nom d'une attestation est figé à la délivrance, et c'est ce qui fait sa
// valeur : un document qui se réécrit tout seul ne prouve rien. Mais plusieurs
// encadrants se sont inscrits avec un nom incomplet — un prénom seul, un nom
// de famille oublié dans la précipitation — et repartent avec un document qui
// ne les nomme pas tout à fait. Le leur refuser au nom du principe reviendrait
// à leur remettre un papier inutilisable auprès d'un employeur.
//
// La correction passe donc par une demande que le couple dirigeant valide.
// Trois garde-fous, et ils suffisent :
//
//   1. Une seule demande en attente à la fois — on ne bombarde pas le couple ;
//   2. Une seule correction acceptée — après quoi le nom est définitif ;
//   3. L'ancien nom reste inscrit en base pour toujours.
//
// Le point 2 mérite sa nuance : ce qui s'épuise, c'est la correction
// *acceptée*, pas la tentative. Un refus (le couple a vu une faute dans la
// demande elle-même) laisse la personne recommencer — sinon un refus bien
// intentionné lui coûterait sa seule chance, et le couple hériterait d'un
// appel téléphonique à traiter à la main.

export const STATUTS_DEMANDE = ["EN_ATTENTE", "ACCEPTEE", "REFUSEE"] as const;
export type StatutDemande = (typeof STATUTS_DEMANDE)[number];

/** Longueur maximale de chaque partie du nom, et du motif. */
export const LIMITES_NOM = { partie: 60, motif: 300 };

/**
 * Met un nom en forme sans le déformer.
 *
 * On resserre les espaces et on coupe à la longueur permise — rien de plus.
 * Surtout pas de mise en majuscules automatique : « N'Guessan », « Kouamé »,
 * « de Souza » ont chacun leur graphie, et une règle bien intentionnée
 * abîmerait précisément le nom qu'on essaie de corriger.
 */
export const nettoyerNom = (v: string) =>
  v.replace(/\s+/g, " ").trim().slice(0, LIMITES_NOM.partie);

export type SaisieNom = { prenom: string; nom: string; motif?: string };

export type VerdictNom =
  | { ok: true; prenom: string; nom: string; motif: string | null }
  | { ok: false; motif: string };

/**
 * Contrôle une demande avant enregistrement.
 *
 * `actuel` sert à refuser une demande qui ne change rien : sans ce contrôle,
 * quelqu'un qui renvoie son nom à l'identique consommerait sa demande unique
 * pour rien.
 */
export function verifierDemandeNom(
  saisie: SaisieNom,
  actuel: { prenom: string; nom: string }
): VerdictNom {
  const prenom = nettoyerNom(saisie.prenom);
  const nom = nettoyerNom(saisie.nom);

  if (prenom.length < 2) {
    return { ok: false, motif: "Indiquez votre prénom (deux lettres au minimum)." };
  }
  if (nom.length < 2) {
    return { ok: false, motif: "Indiquez votre nom de famille (deux lettres au minimum)." };
  }
  // Des lettres, des espaces, des traits d'union et des apostrophes : de quoi
  // écrire n'importe quel nom ivoirien, et rien d'autre.
  const permis = /^[\p{L}][\p{L}\s'’.-]*$/u;
  if (!permis.test(prenom) || !permis.test(nom)) {
    return {
      ok: false,
      motif: "Un nom ne contient que des lettres, des espaces, des traits d'union ou des apostrophes.",
    };
  }
  if (prenom === actuel.prenom.trim() && nom === actuel.nom.trim()) {
    return {
      ok: false,
      motif: "C'est déjà le nom enregistré : il n'y a rien à corriger.",
    };
  }

  return {
    ok: true,
    prenom,
    nom,
    motif: (saisie.motif ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITES_NOM.motif) || null,
  };
}

/** L'état d'une personne vis-à-vis de la correction, pour l'affichage. */
export type EtatDemandeNom =
  | { peutDemander: true; refusPrecedent: string | null }
  | { peutDemander: false; raison: "EN_ATTENTE" | "DEJA_CORRIGE" };

export function etatDemandeNom(
  demandes: { statut: string; motifRefus: string | null; creeLe: Date }[]
): EtatDemandeNom {
  if (demandes.some((d) => d.statut === "EN_ATTENTE")) {
    return { peutDemander: false, raison: "EN_ATTENTE" };
  }
  if (demandes.some((d) => d.statut === "ACCEPTEE")) {
    return { peutDemander: false, raison: "DEJA_CORRIGE" };
  }
  // Un refus n'épuise rien, mais son motif doit revenir sous les yeux de la
  // personne : sans lui, elle redemanderait la même chose.
  const dernierRefus = [...demandes]
    .filter((d) => d.statut === "REFUSEE")
    .sort((a, b) => b.creeLe.getTime() - a.creeLe.getTime())[0];
  return { peutDemander: true, refusPrecedent: dernierRefus?.motifRefus ?? null };
}

/** Le nom complet tel qu'il s'imprime sur le document. */
export const nomComplet = (p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`.trim();
