import { cache } from "react";
import { prisma } from "./db";
import { SIGNATAIRES } from "./attestations";

// Signatures manuscrites du couple dirigeant, tracées une fois dans
// l'application et apposées sur toutes les vraies attestations.
//
// `cache` : l'impression du lot rend soixante attestations dans la même
// requête ; la base n'est interrogée qu'une fois.
export const signaturesDuCouple = cache(async (): Promise<Record<string, string>> => {
  const lignes = await prisma.signatureDirigeant.findMany({
    where: { nom: { in: SIGNATAIRES.map((s) => s.nom) } },
  });
  return Object.fromEntries(lignes.map((l) => [l.nom, l.image]));
});
