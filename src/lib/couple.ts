import { cache } from "react";
import { prisma } from "./db";
import { SIGNATURE_DEFAUT } from "./report";

/**
 * Qui signe au nom du couple dirigeant.
 *
 * Un message d'excuses signé « la direction » n'engage personne. Les noms sont
 * donc lus en base plutôt qu'écrits en dur : ils restent justes si le couple
 * change, et le message ne devient jamais faux.
 */
export const signatureDuCouple = cache(async (): Promise<string> => {
  try {
    const comptes = await prisma.user.findMany({
      where: { role: "DIRIGEANT", actif: true },
      orderBy: { prenom: "asc" },
      select: { prenom: true, nom: true },
    });
    // Un doublon de compte ne doit pas faire signer quelqu'un deux fois : la
    // signature se lit, elle ne compte pas les enregistrements.
    const vus = new Set<string>();
    const couple = comptes.filter((c) => {
      const cle = `${c.prenom} ${c.nom}`.toLowerCase();
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    });
    if (couple.length === 0) return SIGNATURE_DEFAUT;
    // Même patronyme : « Armande et Bérenger Dahakpoin » plutôt que de le
    // répéter. C'est ainsi qu'un couple signe.
    const noms = [...new Set(couple.map((c) => c.nom))];
    if (couple.length === 2 && noms.length === 1) {
      return `${couple[0].prenom} et ${couple[1].prenom} ${noms[0]}`;
    }
    return couple.map((c) => `${c.prenom} ${c.nom}`).join(" et ");
  } catch {
    // La page publique doit s'afficher même si la base ne répond pas.
    return SIGNATURE_DEFAUT;
  }
});
