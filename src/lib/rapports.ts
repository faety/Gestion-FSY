// Modèle du rapport quotidien des encadrants.
//
// Le questionnaire est décrit ici de façon déclarative : un seul endroit à
// modifier pour ajouter une question, et le formulaire comme la synthèse
// finale s'adaptent automatiquement. Les réponses sont stockées en JSON dans
// RapportQuotidien.reponses, ce qui évite une migration de base à chaque
// ajustement du questionnaire.
//
// Principe de conception : le rapport doit se remplir en deux minutes, sur un
// téléphone, à la fin d'une journée fatigante. Presque tout se fait au doigt —
// échelles, cases à cocher, listes — et seuls deux champs de texte sont
// proposés, volontairement courts.

import { ROLES, type Role } from "./roles";

export type TypeQuestion =
  | "ECHELLE" // une seule option parmi une échelle illustrée
  | "OUI_NON" // oui / non, avec précision facultative si "non"
  | "CHOIX" // liste déroulante
  | "CASES" // cases à cocher, plusieurs réponses
  | "ETAT" // pour chaque point : ça va / il y a un souci / non concerné
  | "NOMBRE" // un effectif — l'appel des présents
  | "TEXTE"; // texte court

export type Question = {
  id: string;
  label: string;
  type: TypeQuestion;
  aide?: string;
  options?: string[];
  // Texte libre à ouvrir quand la réponse est "Non" (type OUI_NON)
  siNon?: string;
  // Question posée seulement si une autre a reçu une réponse donnée
  depend?: { question: string; valeur: string };
  roles: readonly Role[];
};

export type Section = {
  id: string;
  titre: string;
  icone: string;
  description?: string;
  questions: Question[];
};

const TOUS = ROLES;
const CONSEILLERS = ["CONSEILLER"] as const;
const ADJOINTS = ["ADJOINT"] as const;
const ENCADRANTS_TERRAIN = ["CONSEILLER", "ADJOINT"] as const;
const RESPONSABLES = ["ADJOINT", "COORDINATEUR", "DIRIGEANT"] as const;
const DIRECTION = ["COORDINATEUR", "DIRIGEANT"] as const;

// ---------- Échelle d'ambiance ----------

export const AMBIANCES = [
  { cle: "EXCELLENTE", emoji: "🤩", label: "Excellente", couleur: "bg-green-500", note: 5 },
  { cle: "BONNE", emoji: "🙂", label: "Bonne", couleur: "bg-emerald-400", note: 4 },
  { cle: "CORRECTE", emoji: "😐", label: "Correcte", couleur: "bg-amber-400", note: 3 },
  { cle: "DIFFICILE", emoji: "😕", label: "Difficile", couleur: "bg-orange-500", note: 2 },
  { cle: "CRITIQUE", emoji: "😣", label: "Très difficile", couleur: "bg-red-500", note: 1 },
] as const;

export type CleAmbiance = (typeof AMBIANCES)[number]["cle"];
export const ambiance = (cle: string) => AMBIANCES.find((a) => a.cle === cle);

// ---------- États de l'intendance ----------

export const ETATS = [
  { cle: "OK", label: "Ça va", emoji: "✅" },
  { cle: "SOUCI", label: "Souci", emoji: "⚠️" },
  { cle: "NC", label: "Non concerné", emoji: "—" },
] as const;

export const POINTS_INTENDANCE = [
  "Repas servis à l'heure",
  "Quantité de nourriture suffisante",
  "Eau potable disponible",
  "Dortoirs propres et en nombre suffisant",
  "Sanitaires et douches fonctionnels",
  "Électricité et éclairage",
  "Sonorisation et matériel des salles",
  "Sécurité du site et contrôle des entrées",
  "Propreté générale et ramassage des déchets",
  "Trousse de premiers secours accessible",
  // Les rapports de détériorations du manuel : « ça va » = rien à signaler.
  "Locaux sans nouvelle détérioration",
];

// ---------- Sections du questionnaire ----------

export const SECTIONS: Section[] = [
  {
    id: "ambiance",
    titre: "L'ambiance du jour",
    icone: "🌤️",
    description: "Une seule réponse : votre ressenti général sur la journée.",
    questions: [
      {
        id: "ambiance",
        label: "Comment s'est passée la journée ?",
        type: "ECHELLE",
        roles: TOUS,
      },
    ],
  },
  {
    id: "jeunes",
    titre: "Mes jeunes",
    icone: "👥",
    questions: [
      // L'appel des présents remonte de niveau en niveau (manuel de
      // l'encadrant) : les conseillers comptent, les adjoints reçoivent leurs
      // rapports et font rapport aux coordinateurs. Le rapport quotidien
      // enregistre ce compte à chaque maillon.
      {
        id: "appelMidi",
        label: "Appel d'après déjeuner : jeunes présents",
        type: "NOMBRE",
        aide: "Le compte fait au rassemblement en compagnie — celui que vous signalez à votre adjoint sans attendre.",
        roles: CONSEILLERS,
      },
      {
        id: "appelSoir",
        label: "Appel du soir : jeunes présents",
        type: "NOMBRE",
        aide: "Au dortoir. L'appel du soir signifie aussi que personne n'en sort.",
        roles: CONSEILLERS,
      },
      {
        id: "presences",
        label: "Tous vos jeunes ont répondu aux appels d'aujourd'hui ?",
        type: "OUI_NON",
        siNon: "Qui manquait, à quel appel, et qu'avez-vous fait ?",
        roles: ENCADRANTS_TERRAIN,
      },
      {
        id: "appelsRecus",
        label: "Chaque conseiller vous a fait rapport de l'appel (midi et soir) ?",
        type: "OUI_NON",
        aide: "Puis vous faites rapport aux coordinateurs avant « Réfléchir et revoir » — c'est la chaîne du manuel.",
        siNon: "Quels rapports manquent, et où en est le compte ?",
        roles: ADJOINTS,
      },
      {
        id: "effectifSoir",
        label: "Total des jeunes comptés dans votre périmètre à l'appel du soir",
        type: "NOMBRE",
        roles: ADJOINTS,
      },
      {
        id: "participation",
        label: "Participation aux activités",
        type: "CHOIX",
        options: ["Très active", "Active", "Correcte", "Faible", "Très faible"],
        roles: ENCADRANTS_TERRAIN,
      },
      {
        id: "incidents",
        label: "Incidents de la journée",
        type: "CASES",
        aide: "Cochez « Aucun incident » si tout s'est bien passé.",
        options: [
          "Aucun incident",
          "Conflit entre jeunes",
          "Mal du pays, tristesse",
          "Règles non respectées",
          "Téléphone trouvé chez un jeune, objet interdit",
          "Blessure ou accident",
          "Sortie du site sans autorisation",
          "Retards répétés",
        ],
        roles: ENCADRANTS_TERRAIN,
      },
      {
        id: "sante",
        label: "Santé et bien-être",
        type: "CASES",
        options: [
          "Aucun souci de santé",
          "Fatigue générale",
          "Maux de tête ou de ventre",
          "Fièvre, suspicion de paludisme",
          "Blessure légère",
          "Passage à l'infirmerie",
          "Traitement médical à poursuivre",
          "Manque de sommeil",
        ],
        roles: ENCADRANTS_TERRAIN,
      },
    ],
  },
  {
    id: "spirituel",
    titre: "Vie spirituelle",
    icone: "🕊️",
    questions: [
      {
        id: "devotions",
        label: "Ce qui a été tenu aujourd'hui",
        type: "CASES",
        options: [
          "Dévotion du matin",
          "Classe suivie en entier",
          "Veillée ou dévotion du soir",
          "« Réfléchir et revoir » tenu avec les jeunes",
          "Prière en groupe",
          "Étude des Écritures",
          "Entretien personnel avec un jeune",
        ],
        roles: TOUS,
      },
      {
        id: "temoignage",
        label: "Un jeune a vécu ou partagé quelque chose de marquant ?",
        type: "OUI_NON",
        aide: "Ces moments alimentent le rapport final de la conférence.",
        siNon: "",
        roles: TOUS,
      },
      {
        id: "temoignageDetail",
        label: "Racontez-le en deux lignes",
        type: "TEXTE",
        depend: { question: "temoignage", valeur: "Oui" },
        roles: TOUS,
      },
    ],
  },
  {
    id: "intendance",
    titre: "Intendance et logistique",
    icone: "🍽️",
    description: "Un appui par ligne. Les soucis remontent aux coordinateurs.",
    questions: [
      {
        id: "intendance",
        label: "État des points d'intendance",
        type: "ETAT",
        options: POINTS_INTENDANCE,
        roles: TOUS,
      },
    ],
  },
  {
    id: "equipe",
    titre: "Mon équipe d'encadrement",
    icone: "🤝",
    questions: [
      {
        id: "etatEquipe",
        label: "État de votre équipe",
        type: "CHOIX",
        options: ["Très bonne forme", "Bonne forme", "Fatiguée", "En difficulté"],
        roles: RESPONSABLES,
      },
      {
        id: "presenceEncadrants",
        label: "Tous les encadrants de votre périmètre étaient à leur poste ?",
        type: "OUI_NON",
        siNon: "Qui manquait, et comment avez-vous fait ?",
        roles: RESPONSABLES,
      },
      {
        id: "rapportsAdjoints",
        label: "Tous les adjoints ont fait rapport de l'appel du soir ?",
        type: "OUI_NON",
        aide: "Impératif pour que tous les jeunes soient comptabilisés. Un jeune manquant se signale immédiatement au couple dirigeant.",
        siNon: "Quels rapports manquent, et où en est le compte ?",
        roles: DIRECTION,
      },
      {
        id: "coordination",
        label: "Coordination",
        type: "CASES",
        options: [
          "Réunion du matin tenue",
          "Réunion de l'après-midi tenue",
          "Réunion du soir tenue",
          "Consignes transmises à temps",
          "Programme respecté",
          "Retards importants sur le programme",
          "Manque d'information de la part de la direction",
        ],
        roles: RESPONSABLES,
      },
    ],
  },
  {
    id: "direction",
    titre: "Décisions et arbitrages",
    icone: "🧭",
    questions: [
      {
        id: "decisions",
        label: "Décisions prises aujourd'hui",
        type: "TEXTE",
        roles: DIRECTION,
      },
      {
        id: "arbitrages",
        label: "Points à arbitrer demain",
        type: "TEXTE",
        roles: DIRECTION,
      },
    ],
  },
];

// Sections et questions visibles pour un rôle donné
export function sectionsPour(role: string): Section[] {
  return SECTIONS.map((s) => ({
    ...s,
    questions: s.questions.filter((q) => (q.roles as readonly string[]).includes(role)),
  })).filter((s) => s.questions.length > 0);
}

// ---------- Points et récompenses ----------

export const HEURE_LIMITE = 22; // remise « à l'heure » : avant 22 h

export const BAREME = [
  { cle: "REMIS", points: 10, label: "Rapport remis" },
  { cle: "A_LHEURE", points: 5, label: `Remis avant ${HEURE_LIMITE} h` },
  { cle: "A_MARCHE", points: 3, label: "« Ce qui a marché » renseigné" },
  { cle: "A_AMELIORER", points: 3, label: "« Ce qui a moins marché » renseigné" },
  { cle: "PHOTO", points: 4, label: "Au moins une photo" },
  { cle: "INTENDANCE", points: 5, label: "Intendance entièrement renseignée" },
  { cle: "SERIE", points: 5, label: "Rapport de la veille également remis" },
] as const;

export const POINTS_MAX = BAREME.reduce((n, b) => n + b.points, 0);

export type DetailPoints = { cle: string; label: string; points: number }[];

export function calculerPoints(rapport: {
  aMarche: string;
  aAmeliorer: string;
  nbPhotos: number;
  reponses: Record<string, unknown>;
  heure: number;
  veilleRemise: boolean;
}): { total: number; detail: DetailPoints } {
  const gagne = (cle: string) => {
    switch (cle) {
      case "REMIS":
        return true;
      case "A_LHEURE":
        return rapport.heure < HEURE_LIMITE;
      case "A_MARCHE":
        return rapport.aMarche.trim().length >= 15;
      case "A_AMELIORER":
        return rapport.aAmeliorer.trim().length >= 15;
      case "PHOTO":
        return rapport.nbPhotos > 0;
      case "INTENDANCE": {
        const etats = rapport.reponses.intendance;
        if (!etats || typeof etats !== "object") return false;
        const valeurs = etats as Record<string, string>;
        return POINTS_INTENDANCE.every((p) => valeurs[p]);
      }
      case "SERIE":
        return rapport.veilleRemise;
      default:
        return false;
    }
  };

  const detail = BAREME.filter((b) => gagne(b.cle)).map((b) => ({
    cle: b.cle,
    label: b.label,
    points: b.points,
  }));
  return { total: detail.reduce((n, d) => n + d.points, 0), detail };
}

// ---------- Niveaux ----------

export const NIVEAUX = [
  { seuil: 0, nom: "Nouveau", emoji: "🌱" },
  { seuil: 25, nom: "Régulier", emoji: "⭐" },
  { seuil: 60, nom: "Fiable", emoji: "🌟" },
  { seuil: 105, nom: "Pilier", emoji: "🏅" },
  { seuil: 150, nom: "Référence", emoji: "🏆" },
] as const;

export function niveau(points: number) {
  return [...NIVEAUX].reverse().find((n) => points >= n.seuil)!;
}

// La journée 0 est la veille de la conférence : « Jour 0 » n'aurait pas de sens
// pour les encadrants, on l'écrit partout de la même façon.
export const libelleJour = (numero: number) => (numero === 0 ? "Veille" : `Jour ${numero}`);
export const libelleJourCourt = (numero: number) => (numero === 0 ? "Veille" : `J${numero}`);

// ---------- Lecture des réponses ----------

export function lireReponses(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const enTableau = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
export const enTexte = (v: unknown): string => (typeof v === "string" ? v : "");
export const enObjet = (v: unknown): Record<string, string> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};

// Libellé d'une question, pour la synthèse finale
export function libelleQuestion(id: string): string {
  for (const s of SECTIONS) {
    const q = s.questions.find((x) => x.id === id);
    if (q) return q.label;
  }
  return id;
}
