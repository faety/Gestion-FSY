// Hiérarchie des rôles FSY 2026 (du plus au moins élevé)
export const ROLES = ["DIRIGEANT", "COORDINATEUR", "ADJOINT", "CONSEILLER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  DIRIGEANT: "Couple dirigeant",
  COORDINATEUR: "Coordinateur principal",
  ADJOINT: "Coordinateur adjoint",
  CONSEILLER: "Conseiller / Conseillère",
};

const ROLE_LEVEL: Record<Role, number> = {
  DIRIGEANT: 4,
  COORDINATEUR: 3,
  ADJOINT: 2,
  CONSEILLER: 1,
};

export function roleAuMoins(role: string, minimum: Role): boolean {
  return (ROLE_LEVEL[role as Role] ?? 0) >= ROLE_LEVEL[minimum];
}

// Un utilisateur peut-il modifier directement le programme / les assignations ?
// DIRIGEANT et COORDINATEUR toujours ; un ADJOINT seulement si le couple
// dirigeant lui a accordé le droit "MODIFICATION_DIRECTE".
export function peutModifierDirectement(user: {
  role: string;
  droitsSupplementaires: string;
}): boolean {
  if (roleAuMoins(user.role, "COORDINATEUR")) return true;
  try {
    const droits: string[] = JSON.parse(user.droitsSupplementaires);
    return droits.includes("MODIFICATION_DIRECTE");
  } catch {
    return false;
  }
}

export const CIBLES_ANNONCE = ["TOUS", "COORDINATEURS", "ADJOINTS", "CONSEILLERS"] as const;

export const CIBLE_LABELS: Record<string, string> = {
  TOUS: "Tout le monde",
  COORDINATEURS: "Coordinateurs principaux",
  ADJOINTS: "Coordinateurs adjoints",
  CONSEILLERS: "Conseillers",
};

// ---------- Programme ----------

export const PUBLIC_LABELS: Record<string, string> = {
  TOUS: "Tout le monde",
  GARCONS: "Jeunes Gens",
  FILLES: "Jeunes Filles",
};

export const TYPE_LABELS: Record<string, string> = {
  GENERAL: "Tout le monde",
  PAR_GROUPE: "Par groupe",
  PAR_COMPAGNIE: "Par compagnie",
  COMPAGNIE: "Compagnie",
  GROUPE: "Groupe",
  MULTI_GROUPE: "Plusieurs groupes",
};

// Types que les coordinateurs peuvent choisir en créant une activité
export const TYPES_CREATION = [
  "GENERAL",
  "PAR_COMPAGNIE",
  "PAR_GROUPE",
  "COMPAGNIE",
  "GROUPE",
  "MULTI_GROUPE",
] as const;

// ---------- Rôle attendu pour une activité (manuel de l'encadrant) ----------

export const ROLE_ACTIVITE_LABELS: Record<string, string> = {
  DIRIGER: "Vous dirigez",
  ENSEIGNER: "Vous enseignez",
  SUPERVISER: "Vous supervisez",
  AIDER: "Vous aidez",
  ASSISTER: "Vous assistez",
  RECEVOIR: "Vous recevez l'appel",
  FACULTATIF: "Si vous le souhaitez",
  SI_ATTRIBUE: "Si la tâche vous est attribuée",
};

// Rôles qui engagent une responsabilité directe : mis en avant dans l'interface
const ROLES_ACTIFS = ["DIRIGER", "ENSEIGNER", "SUPERVISER", "RECEVOIR"];
export const roleEstActif = (role: string) => ROLES_ACTIFS.includes(role);

type RolesActivite = {
  roleConseiller: string;
  roleAdjoint: string;
  roleCoordinateur: string;
  roleDirigeant: string;
};

// Rôle attendu de cet utilisateur pour cette activité (null = ne le concerne pas)
export function monRoleActivite(role: string, a: RolesActivite): string | null {
  const valeur =
    role === "CONSEILLER"
      ? a.roleConseiller
      : role === "ADJOINT"
        ? a.roleAdjoint
        : role === "COORDINATEUR"
          ? a.roleCoordinateur
          : a.roleDirigeant;
  return valeur === "AUCUN" ? null : valeur;
}

// Une activité concerne-t-elle un groupe de ce sexe ?
// ("M" = garçons, "F" = filles ; une activité TOUS concerne les deux)
export function activitePourSexe(publicCible: string, sexe: string): boolean {
  if (publicCible === "TOUS") return true;
  return publicCible === (sexe === "M" ? "GARCONS" : "FILLES");
}

// Une activité me concerne-t-elle ? Combine le rôle attendu (les réunions
// d'encadrants qui ne me concernent pas sont masquées) et, pour un conseiller,
// le public et les groupes visés.
export function activitePourMoi(
  activite: {
    type: string;
    publicCible: string;
    compagnieId: string | null;
    groupeIds: string[];
    pourEncadrants: boolean;
  } & RolesActivite,
  role: string,
  mesGroupes: { id: string; sexe: string; compagnieId: string | null }[]
): boolean {
  if (monRoleActivite(role, activite) === null) return false;
  if (activite.pourEncadrants) return true;
  return activitePourMesGroupes(activite, mesGroupes);
}

// Une activité concerne-t-elle les groupes que dirige ce conseiller ?
export function activitePourMesGroupes(
  activite: {
    type: string;
    publicCible: string;
    compagnieId: string | null;
    groupeIds: string[];
  },
  mesGroupes: { id: string; sexe: string; compagnieId: string | null }[]
): boolean {
  if (mesGroupes.length === 0) return true; // pas de groupe dirigé : on montre tout
  const bonPublic = mesGroupes.some((g) => activitePourSexe(activite.publicCible, g.sexe));
  if (!bonPublic) return false;
  switch (activite.type) {
    case "GENERAL":
    case "PAR_GROUPE":
    case "PAR_COMPAGNIE":
      return true;
    case "COMPAGNIE":
      return mesGroupes.some((g) => g.compagnieId && g.compagnieId === activite.compagnieId);
    default:
      return mesGroupes.some((g) => activite.groupeIds.includes(g.id));
  }
}

// Une annonce est-elle visible pour ce rôle ?
export function annonceVisible(cible: string, role: string): boolean {
  if (cible === "TOUS") return true;
  if (roleAuMoins(role, "COORDINATEUR")) return true; // les dirigeants voient tout
  if (cible === "ADJOINTS") return role === "ADJOINT";
  if (cible === "CONSEILLERS") return role === "CONSEILLER";
  return false;
}
