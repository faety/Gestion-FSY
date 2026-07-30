// Fenêtre des anniversaires fêtés pendant la conférence : du 2 au 8 août 2026,
// bornes incluses. Version utilisable côté client (le module prisma/anniversaires.ts
// sert à l'amorçage et à la génération des annonces).
export const FENETRE = { mois: 8, jourDebut: 2, jourFin: 8, annee: 2026 };

export function anniversairePendantConference(d: Date): boolean {
  return (
    d.getMonth() + 1 === FENETRE.mois &&
    d.getDate() >= FENETRE.jourDebut &&
    d.getDate() <= FENETRE.jourFin
  );
}
