// Hiérarchie des rôles, du plus au moins élevé.
export const ROLES = ["ADMIN", "GESTIONNAIRE", "MEMBRE"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  GESTIONNAIRE: "Gestionnaire",
  MEMBRE: "Membre",
};

// Le même libellé, accordé au genre de la personne. Les libellés neutres
// conviennent aux listes, qui désignent une catégorie ; mais un document ou
// une page qui nomme quelqu'un doit s'accorder — une femme qui lit
// « Administrateur » sur son attestation y voit le travail d'un autre.
const ROLE_LABELS_F: Partial<Record<Role, string>> = {
  ADMIN: "Administratrice",
};

const ROLE_LABELS_M: Partial<Record<Role, string>> = {};

/** Libellé du rôle accordé au genre. `sexe` vaut "M" ou "F". */
export function libelleRoleAccorde(role: string, sexe: string): string {
  const r = role as Role;
  const accorde = sexe === "F" ? ROLE_LABELS_F[r] : ROLE_LABELS_M[r];
  return accorde ?? ROLE_LABELS[r] ?? role;
}

const ROLE_LEVEL: Record<Role, number> = { ADMIN: 3, GESTIONNAIRE: 2, MEMBRE: 1 };

export function roleAuMoins(role: string, minimum: Role): boolean {
  return (ROLE_LEVEL[role as Role] ?? 0) >= ROLE_LEVEL[minimum];
}

export const roleValide = (r: string): r is Role => (ROLES as readonly string[]).includes(r);
