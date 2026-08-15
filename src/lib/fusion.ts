// Fusion de comptes : tout ce qui référence un compte absorbé passe au compte
// gardé.
//
// Partagé entre l'action de fusion (page Administration) et l'amorçage, qui
// résorbe à chaque déploiement les comptes d'attente devenus doublons. Une
// seule liste de tables pour les deux chemins : quand un modèle gagne une
// référence vers User, c'est ici qu'on l'ajoute, et les deux fusions suivent.
import type { Prisma } from "@prisma/client";

/** Domaine des identifiants fabriqués à l'amorçage : aucune boîte derrière. */
export const DOMAINE_ATTENTE = "@fsy2026.ci";

export const estAdresseDAttente = (email: string) =>
  email.trim().toLowerCase().endsWith(DOMAINE_ATTENTE);

/**
 * Reporte sur `versId` toute référence portée par `deId`.
 *
 * Ne touche pas aux comptes eux-mêmes : l'appelant décide de ce que devient
 * l'absorbé. À lui aussi de vérifier avant d'appeler que les deux comptes ne
 * portent pas chacun une attestation — elle est unique par compte, le
 * transfert échouerait.
 */
export async function transfererReferences(
  tx: Prisma.TransactionClient,
  deId: string,
  versId: string
) {
  // Un même encadrant affecté deux fois au même pointage romprait l'unicité
  // (car, étape, personne) : on retire d'abord les affectations que le compte
  // gardé possède déjà.
  const deja = await tx.affectationCar.findMany({
    where: { userId: versId },
    select: { carId: true, etape: true },
  });
  if (deja.length > 0) {
    await tx.affectationCar.deleteMany({
      where: { userId: deId, OR: deja.map((d) => ({ carId: d.carId, etape: d.etape })) },
    });
  }

  await Promise.all([
    tx.groupe.updateMany({ where: { conseillerId: deId }, data: { conseillerId: versId } }),
    tx.affectationCar.updateMany({ where: { userId: deId }, data: { userId: versId } }),
    tx.mouvement.updateMany({ where: { valideParId: deId }, data: { valideParId: versId } }),
    tx.annonce.updateMany({ where: { creeParId: deId }, data: { creeParId: versId } }),
    tx.activite.updateMany({ where: { creeParId: deId }, data: { creeParId: versId } }),
    tx.modificationProgramme.updateMany({ where: { proposeParId: deId }, data: { proposeParId: versId } }),
    tx.modificationProgramme.updateMany({ where: { valideParId: deId }, data: { valideParId: versId } }),
    tx.rapportQuotidien.updateMany({ where: { auteurId: deId }, data: { auteurId: versId } }),
    tx.attestation.updateMany({ where: { userId: deId }, data: { userId: versId } }),
    tx.attestation.updateMany({ where: { delivreeParId: deId }, data: { delivreeParId: versId } }),
    tx.auditLog.updateMany({ where: { userId: deId }, data: { userId: versId } }),
    tx.clotureEtapeCar.updateMany({ where: { clotureParId: deId }, data: { clotureParId: versId } }),
    tx.tachePreparation.updateMany({ where: { faitParId: deId }, data: { faitParId: versId } }),
    tx.responsabilite.updateMany({ where: { userId: deId }, data: { userId: versId } }),
    tx.reinitialisationMotDePasse.deleteMany({ where: { userId: deId } }),
  ]);
}
