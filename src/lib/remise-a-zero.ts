// Ce que la remise à zéro d'après-essais peut effacer.
//
// Volontairement découpé : après une répétition, on veut souvent garder les
// affectations décidées ensemble tout en effaçant les pointages et les rapports
// d'essai. Les comptes, les jeunes, les groupes, les compagnies et le programme
// officiel ne figurent pas dans cette liste — ils ne sont jamais touchés.
export const CHOSES_A_EFFACER = [
  {
    cle: "rapports",
    label: "Rapports quotidiens",
    detail: "Réponses, points, classement et photos jointes",
  },
  {
    cle: "pointages",
    label: "Pointages aux cars",
    detail: "Toutes les validations d'arrivée et de départ",
  },
  {
    cle: "affectationsCars",
    label: "Qui coche à quel car",
    detail: "Les personnes désignées pour chaque étape",
  },
  {
    cle: "conseillers",
    label: "Conseillers affectés aux groupes",
    detail: "Les 72 groupes redeviennent sans conseiller",
  },
  {
    cle: "adjoints",
    label: "Adjoints affectés aux compagnies",
    detail: "Les 36 compagnies redeviennent sans adjoint",
  },
  {
    cle: "programme",
    label: "Modifications du programme",
    detail: "Activités ajoutées à la main et propositions en attente",
  },
  {
    cle: "annonces",
    label: "Annonces écrites à la main",
    detail: "Les annonces d'anniversaire automatiques sont conservées",
  },
  { cle: "audit", label: "Journal d'audit", detail: "L'historique des actions" },
] as const;

export type ChoseAEffacer = (typeof CHOSES_A_EFFACER)[number]["cle"];

// Ce qu'une répétition produit, et qu'on efface le plus souvent
export const DONNEES_DESSAI: ChoseAEffacer[] = ["rapports", "pointages", "affectationsCars"];
