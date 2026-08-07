// Fenêtre des anniversaires fêtés pendant la conférence : de la veille au
// dernier jour, bornes incluses. Version utilisable côté client (le module
// prisma/anniversaires.ts sert à l'amorçage et à la génération des annonces).
import { DATE_FIN, DATE_VEILLE } from "./theme";

export const FENETRE = {
  mois: DATE_VEILLE.getMonth() + 1,
  jourDebut: DATE_VEILLE.getDate(),
  jourFin: DATE_FIN.getDate(),
  annee: DATE_FIN.getFullYear(),
};

export function anniversairePendantConference(d: Date): boolean {
  return (
    d.getMonth() + 1 === FENETRE.mois &&
    d.getDate() >= FENETRE.jourDebut &&
    d.getDate() <= FENETRE.jourFin
  );
}
