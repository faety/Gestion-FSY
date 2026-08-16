// Attestations d'encadrement remises à la clôture de la conférence.
//
// Le mot « attestation » est choisi à dessein : nous n'avons aucune
// accréditation d'État à revendiquer, et un document honnête et vérifiable pèse
// plus lourd auprès d'un employeur qu'un « diplôme » qui laisserait entendre ce
// qui n'est pas.
//
// Ce qui donne sa valeur au document : des faits vérifiables plutôt que des
// adjectifs, des signataires nommés, et un code permettant à un employeur de
// contrôler l'authenticité sur fsy.ci.

import type { Role } from "./roles";
import { CONFERENCE as CONFERENCE_DATES, LIEU } from "./theme";

export const CONFERENCE = {
  nom: "FSY 2026 — Abidjan Ouest",
  du: CONFERENCE_DATES.du,
  au: CONFERENCE_DATES.au,
  duEn: CONFERENCE_DATES.duEn,
  auEn: CONFERENCE_DATES.auEn,
  lieu: `${LIEU.nom}, ${LIEU.villePays}`,
  lieuEn: `${LIEU.nom}, ${LIEU.villePaysEn}`,
  // Ville seule, pour la ligne « Fait à … » des modèles Prestige.
  villePays: LIEU.villePays,
  villePaysEn: LIEU.villePaysEn,
  jours: CONFERENCE_DATES.jours,
  // Valeurs de référence, utilisées tant que les chiffres n'ont pas été figés
  // sur une attestation. Les attestations délivrées portent les leurs.
  participants: 650,
  encadrants: 64,
  unites: 8,
};

// ---------- Modèles (designs) ----------
//
// Chaque encadrant choisit l'habillage de son attestation ; le contenu, le
// code et le QR de vérification sont identiques dans les trois. C'est le choix
// enregistré ici qui sort quand le couple imprime le lot de la clôture.
export const MODELES = [
  {
    cle: "CLASSIQUE",
    label: "Classique — bilingue",
    description: "Portrait, deux pages : recto français, verso anglais. Sobre et complet (chiffres et compétences détaillés).",
    pages: 2,
  },
  {
    cle: "PRESTIGE_FR",
    label: "Prestige — français",
    description: "Paysage, une page : grand titre, bandeau de mention doré, signatures manuscrites.",
    pages: 1,
  },
  {
    cle: "PRESTIGE_EN",
    label: "Prestige — English",
    description: "Paysage, une page : la même composition, entièrement en anglais — pour un dossier international.",
    pages: 1,
  },
] as const;

export type CleModele = (typeof MODELES)[number]["cle"];

export const modeleValide = (cle: string): cle is CleModele =>
  MODELES.some((m) => m.cle === cle);

// Le couple dirigeant signe seul — Armande d'abord, comme sur le communiqué.
export const SIGNATAIRES = [
  { nom: "Armande Dahakpoin", titre: "Couple dirigeant", titreEn: "Conference Director" },
  { nom: "Bérenger Dahakpoin", titre: "Couple dirigeant", titreEn: "Conference Director" },
];

// ---------- Mentions ----------
//
// Une mention distingue sans humilier : chacun repart avec son attestation, et
// la rigueur du suivi quotidien s'y lit en plus. Refuser tout document à
// quelqu'un qui a veillé une nuit sur un jeune malade mais dont le téléphone
// est tombé en panne aurait été injuste.

export const RAPPORTS_POSSIBLES = 7; // veille + six jours

export const MENTIONS = {
  EXCELLENCE: {
    cle: "EXCELLENCE",
    label: "Mention Excellence",
    labelEn: "With Highest Distinction",
    critere: `${RAPPORTS_POSSIBLES} rapports quotidiens sur ${RAPPORTS_POSSIBLES}`,
    couleur: "amber",
  },
  RIGUEUR: {
    cle: "RIGUEUR",
    label: "Mention Rigueur et suivi",
    labelEn: "With Distinction",
    critere: `au moins 5 rapports quotidiens sur ${RAPPORTS_POSSIBLES}`,
    couleur: "blue",
  },
} as const;

export type CleMention = keyof typeof MENTIONS;

export const SEUIL_RIGUEUR = 5;
// L'excellence demande la régularité complète et l'assiduité reconnue par les
// points de rapport (niveau « Pilier »).
export const SEUIL_POINTS_EXCELLENCE = 105;

export function calculerMention(
  rapportsRemis: number,
  points: number
): CleMention | null {
  if (rapportsRemis >= RAPPORTS_POSSIBLES && points >= SEUIL_POINTS_EXCELLENCE) {
    return "EXCELLENCE";
  }
  if (rapportsRemis >= SEUIL_RIGUEUR) return "RIGUEUR";
  return null;
}

export const mention = (cle: string | null | undefined) =>
  cle && cle in MENTIONS ? MENTIONS[cle as CleMention] : null;

// ---------- Faits figés à la délivrance ----------

export type FaitsAttestation = {
  nomComplet: string;
  /** Groupes encadrés, pour un conseiller */
  groupes: string[];
  /** Compagnie dirigée, pour un adjoint */
  compagnie: string | null;
  /** Jeunes sous sa responsabilité directe */
  jeunesEncadres: number;
  rapportsRemis: number;
  rapportsPossibles: number;
  points: number;
  /** Présences validées au pointage des cars */
  pointagesValides: number;
  /** Photo de profil au moment de la délivrance — montrée à la vérification,
   * pour que le vérificateur compare le visage à la personne devant lui. */
  photoPublicId?: string | null;
  /** Étapes de car dont il avait la charge, en clair */
  responsabilitesCars: string[];
  // Chiffres de la conférence, relevés eux aussi au moment de la délivrance :
  // le nombre d'encadrants bouge jusqu'au dernier jour, et une attestation qui
  // annoncerait un effectif faux se retournerait contre son titulaire.
  participants?: number;
  encadrants?: number;
  unites?: number;
};

/** Chiffres de la conférence : ceux figés sur l'attestation, sinon les valeurs de référence. */
export const ampleur = (f: FaitsAttestation) => ({
  participants: f.participants ?? CONFERENCE.participants,
  encadrants: f.encadrants ?? CONFERENCE.encadrants,
  unites: f.unites ?? CONFERENCE.unites,
});

// ---------- Textes de l'attestation ----------
//
// Rédigés en langage de recrutement, à partir de ce qui a réellement été fait.
// La phrase s'adapte aux effectifs réels : « un groupe de 9 adolescents » n'a
// pas la même portée que « un groupe », et c'est le chiffre qui parle.

export const TITRES: Record<string, { fr: string; en: string }> = {
  COORDINATEUR: {
    fr: "Attestation de direction opérationnelle",
    en: "Certificate of Operational Leadership",
  },
  ADJOINT: {
    fr: "Attestation d'encadrement d'équipe",
    en: "Certificate of Team Supervision",
  },
  CONSEILLER: {
    fr: "Attestation d'encadrement de groupe",
    en: "Certificate of Group Supervision",
  },
};

// Le participe passé employé avec « avoir » ne s'accorde pas ici : c'est le
// titre de la fonction qui se féminise, pas le verbe.
const fonction = (sexe: string, m: string, f: string) => (sexe === "F" ? f : m);

export function corpsAttestation(
  role: string,
  sexe: string,
  faits: FaitsAttestation
): string {
  const effectif =
    faits.jeunesEncadres > 0
      ? `d'un groupe de ${faits.jeunesEncadres} adolescents de 14 à 18 ans`
      : "d'un groupe d'adolescents de 14 à 18 ans";

  const a = ampleur(faits);

  if (role === "COORDINATEUR") {
    return (
      `a exercé la fonction de ${fonction(sexe, "coordinateur principal", "coordinatrice principale")} ` +
      `de la conférence pour la jeunesse ${CONFERENCE.nom}, réunissant ` +
      `${a.participants} participants mineurs encadrés par ` +
      `${a.encadrants} responsables, sur ${CONFERENCE.jours} jours et ${a.unites} unités ` +
      `géographiques.\n\n` +
      `À ce titre : planification et affectation des équipes d'encadrement, ` +
      `coordination de la logistique et de l'intendance, gestion des situations ` +
      `imprévues et arbitrage, contrôle de la présence nominative des participants, ` +
      `et synthèse des comptes rendus quotidiens de l'ensemble de l'encadrement.`
    );
  }

  if (role === "ADJOINT") {
    return (
      `a assuré, en qualité de ${fonction(sexe, "coordinateur adjoint", "coordinatrice adjointe")}, ` +
      `l'encadrement d'une équipe de conseillers ` +
      `et la coordination ${faits.compagnie ? `de la ${faits.compagnie.toLowerCase()}` : "d'une compagnie"} ` +
      `lors de la conférence pour la jeunesse ${CONFERENCE.nom}, ` +
      `du ${CONFERENCE.du} au ${CONFERENCE.au}.\n\n` +
      `À ce titre : responsabilité continue de participants mineurs jour et nuit, ` +
      `animation et supervision d'une équipe d'encadrants, transmission des consignes ` +
      `de la direction, arbitrage de premier niveau, remontée des alertes, ` +
      `et compte rendu quotidien structuré à la coordination.`
    );
  }

  return (
    `a exercé, en qualité de ${fonction(sexe, "conseiller", "conseillère")}, ` +
    `la responsabilité continue ${effectif}, ` +
    `jour et nuit, lors de la conférence pour la jeunesse ${CONFERENCE.nom}, ` +
    `du ${CONFERENCE.du} au ${CONFERENCE.au}.\n\n` +
    `À ce titre : sécurité et contrôle de la présence nominative des participants, ` +
    `traitement d'informations personnelles et médicales confidentielles, ` +
    `accompagnement individuel, animation d'activités quotidiennes, ` +
    `gestion de situations imprévues, et compte rendu quotidien structuré ` +
    `à sa hiérarchie.`
  );
}

export function corpsAttestationEn(role: string, faits: FaitsAttestation): string {
  const effectif =
    faits.jeunesEncadres > 0
      ? `a group of ${faits.jeunesEncadres} adolescents aged 14 to 18`
      : "a group of adolescents aged 14 to 18";

  const a = ampleur(faits);

  if (role === "COORDINATEUR") {
    return (
      `served as Principal Coordinator of the ${CONFERENCE.nom} youth conference, ` +
      `bringing together ${a.participants} minor participants supervised by ` +
      `${a.encadrants} staff members, over ${CONFERENCE.jours} days and ${a.unites} geographic units.\n\n` +
      `Responsibilities included: planning and staffing of supervision teams, ` +
      `coordination of logistics and catering, crisis management and arbitration, ` +
      `roll-call accountability for all participants, and consolidation of the daily ` +
      `reports of the entire staff.`
    );
  }
  if (role === "ADJOINT") {
    return (
      `supervised a team of counsellors and coordinated ` +
      `${faits.compagnie ? `${faits.compagnie}` : "a company"} at the ${CONFERENCE.nom} ` +
      `youth conference, from ${CONFERENCE.duEn} to ${CONFERENCE.auEn}.\n\n` +
      `Responsibilities included: round-the-clock duty of care for minors, ` +
      `leading and supervising a staff team, relaying instructions from the direction, ` +
      `first-level arbitration, escalation of incidents, and structured daily reporting.`
    );
  }
  return (
    `held continuous responsibility for ${effectif}, day and night, at the ` +
    `${CONFERENCE.nom} youth conference, from ${CONFERENCE.duEn} to ${CONFERENCE.auEn}.\n\n` +
    `Responsibilities included: safety and roll-call accountability of participants, ` +
    `handling of confidential personal and medical information, individual mentoring, ` +
    `daily activity facilitation, management of unforeseen situations, ` +
    `and structured daily reporting to the coordination team.`
  );
}

// ---------- Compétences ----------
//
// Nommées dans les termes qu'emploie un recruteur. Un jeune qui a veillé six
// jours sur dix adolescents a exercé des compétences réelles ; encore faut-il
// qu'il puisse les nommer, et qu'un employeur les reconnaisse au passage.

export const COMPETENCES: Record<string, { fr: string[]; en: string[] }> = {
  COORDINATEUR: {
    fr: [
      "Direction opérationnelle d'un événement",
      "Planification et affectation des équipes",
      "Coordination logistique et intendance",
      "Pilotage par indicateurs et reporting",
      "Gestion de crise et arbitrage",
      "Management d'encadrants",
    ],
    en: [
      "Operational leadership of an event",
      "Workforce planning and staffing",
      "Logistics and catering coordination",
      "Reporting and data-driven oversight",
      "Crisis management and arbitration",
      "Management of supervisory staff",
    ],
  },
  ADJOINT: {
    fr: [
      "Encadrement d'une équipe",
      "Coordination opérationnelle",
      "Responsabilité de mineurs",
      "Arbitrage et prise de décision",
      "Compte rendu à la direction",
      "Gestion de situations imprévues",
    ],
    en: [
      "Team supervision",
      "Operational coordination",
      "Duty of care for minors",
      "Decision-making and arbitration",
      "Reporting to senior management",
      "Handling of unforeseen situations",
    ],
  },
  CONSEILLER: {
    fr: [
      "Responsabilité continue de mineurs",
      "Animation et conduite de groupe",
      "Confidentialité des données personnelles",
      "Accompagnement individuel",
      "Compte rendu quotidien structuré",
      "Gestion de situations imprévues",
    ],
    en: [
      "Round-the-clock duty of care for minors",
      "Group facilitation and leadership",
      "Confidentiality of personal data",
      "Individual mentoring",
      "Structured daily reporting",
      "Handling of unforeseen situations",
    ],
  },
};

export const competences = (role: string) => COMPETENCES[role] ?? COMPETENCES.CONSEILLER;

// ---------- Formulation prête à copier dans un CV ----------
//
// Beaucoup de jeunes adultes ne savent pas valoriser ce type d'expérience.
// Leur donner la phrase est sans doute le service le plus concret rendu ici.

export function phraseCV(role: string, sexe: string, faits: FaitsAttestation): string {
  const intitule =
    role === "COORDINATEUR"
      ? fonction(sexe, "Coordinateur principal", "Coordinatrice principale")
      : role === "ADJOINT"
        ? fonction(sexe, "Coordinateur adjoint", "Coordinatrice adjointe")
        : fonction(sexe, "Conseiller / Encadrant", "Conseillère / Encadrante");

  const groupe =
    faits.jeunesEncadres > 0
      ? `d'un groupe de ${faits.jeunesEncadres} adolescents`
      : "d'un groupe d'adolescents";

  const a = ampleur(faits);

  const perimetre =
    role === "COORDINATEUR"
      ? `Codirection d'une conférence de ${a.participants} participants mineurs et ${a.encadrants} encadrants`
      : role === "ADJOINT"
        ? `Encadrement d'une équipe de conseillers${faits.compagnie ? ` et coordination de la ${faits.compagnie.toLowerCase()}` : ""}`
        : `Encadrement continu ${groupe} sur ${CONFERENCE.jours} jours, au sein d'une organisation de ${a.participants} participants`;

  return (
    `${intitule} · Conférence FSY 2026 Abidjan Ouest — ${CONFERENCE_DATES.duAu}\n` +
    `${perimetre}. Responsable de leur sécurité, du suivi individuel et du reporting ` +
    `quotidien auprès de la coordination.`
  );
}

// ---------- Code de vérification ----------
//
// Format A7K2-9M4X : lu et retapé sans ambiguïté, sans les caractères que l'on
// confond (0/O, 1/I/L). Assez long pour ne pas se deviner (32^8 combinaisons).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function codeDepuisOctets(octets: Uint8Array): string {
  const c = Array.from(octets.slice(0, 8))
    .map((o) => ALPHABET[o % ALPHABET.length])
    .join("");
  return `${c.slice(0, 4)}-${c.slice(4, 8)}`;
}

export const ROLES_ATTESTABLES: Role[] = ["COORDINATEUR", "ADJOINT", "CONSEILLER"];

// ---------- Spécimen ----------
//
// Le couple dirigeant délivre les attestations mais n'en reçoit pas : sans
// spécimen, il ne pourrait pas voir à quoi ressemble le document qu'il signe.
// Le code est réservé, la page de vérification le reconnaît et répond « ceci
// est un spécimen » — jamais « authentique ». Le document porte en travers la
// mention SPÉCIMEN, pour qu'un exemplaire imprimé ne puisse pas circuler.
export const CODE_SPECIMEN = "SPEC-IMEN";

export const faitsSpecimen = (): FaitsAttestation => ({
  nomComplet: "Prénom Nom",
  groupes: ["Groupe 1.1"],
  compagnie: null,
  jeunesEncadres: 10,
  rapportsRemis: RAPPORTS_POSSIBLES,
  rapportsPossibles: RAPPORTS_POSSIBLES,
  points: SEUIL_POINTS_EXCELLENCE,
  pointagesValides: 30,
  responsabilitesCars: [],
});

export function lireFaits(json: string): FaitsAttestation {
  try {
    return JSON.parse(json) as FaitsAttestation;
  } catch {
    return {
      nomComplet: "",
      groupes: [],
      compagnie: null,
      jeunesEncadres: 0,
      rapportsRemis: 0,
      rapportsPossibles: RAPPORTS_POSSIBLES,
      points: 0,
      pointagesValides: 0,
      responsabilitesCars: [],
    };
  }
}
