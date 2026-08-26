import type { Prisma } from "@prisma/client";

// Quels jeunes une personne a-t-elle le droit de voir ?
//
// La règle vivait dans les pages, sous forme de `if / else if` : un adjoint
// sans compagnie ne tombait dans aucune branche, son filtre restait vide, et il
// voyait **les six cent cinquante jeunes** avec leurs renseignements médicaux.
// Or l'inscription permet de se déclarer adjoint, et un adjoint fraîchement
// validé n'a pas encore de compagnie.
//
// Un filtre de portée doit donc être exhaustif et fermé par défaut : tout cas
// non prévu ne montre rien, plutôt que tout.

export type PorteeJeunes = {
  where: Prisma.JeuneWhereInput;
  libelle: string;
  /** Vrai quand la personne ne peut rien voir faute d'affectation. */
  vide: boolean;
};

export function porteeJeunes(user: {
  role: string;
  compagnieId: string | null;
  compagnie: { nom: string } | null;
  groupesDiriges: { id: string }[];
  /** Compagnies suivies en tant que coordonnateur adjoint de secteur. */
  compagniesCoordonnees?: { id: string; nom: string }[];
}): PorteeJeunes {
  if (user.role === "DIRIGEANT" || user.role === "COORDINATEUR") {
    return { where: {}, libelle: "Tous les jeunes", vide: false };
  }

  if (user.role === "ADJOINT") {
    // Le secteur de coordination (les fiches papier) fait foi dès qu'il
    // existe : le rattachement historique à une compagnie vient de l'ancienne
    // organisation et ne sert que de repli tant qu'aucun secteur n'est posé.
    const secteur = user.compagniesCoordonnees ?? [];
    const ids =
      secteur.length > 0
        ? secteur.map((c) => c.id)
        : user.compagnieId
          ? [user.compagnieId]
          : [];
    if (ids.length === 0) {
      return {
        where: { id: "-" }, // ne correspond à aucun identifiant
        libelle: "Aucune compagnie ne vous est encore attribuée",
        vide: true,
      };
    }
    return {
      where: { groupe: { compagnieId: { in: ids } } },
      libelle:
        ids.length === 1
          ? `Les jeunes de votre compagnie (${user.compagnie?.nom ?? secteur[0]?.nom ?? "—"})`
          : `Les jeunes de vos ${ids.length} compagnies`,
      vide: false,
    };
  }

  // Conseiller, et tout rôle qu'on ajouterait sans y penser : son groupe, ou rien.
  const groupes = user.groupesDiriges.map((g) => g.id);
  if (groupes.length === 0) {
    return {
      where: { id: "-" },
      libelle: "Aucun groupe ne vous est encore attribué",
      vide: true,
    };
  }
  return {
    where: { groupeId: { in: groupes } },
    libelle: "Les jeunes de votre groupe",
    vide: false,
  };
}
