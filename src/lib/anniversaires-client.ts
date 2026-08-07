// Qui fête son anniversaire pendant la conférence ?
//
// La règle : de la veille — jour d'arrivée des encadrants — au dernier jour,
// bornes comprises. Pour 2026, du 23 au 29 août inclus.
//
// Elle se déduit des dates de la conférence plutôt que d'être écrite en dur.
// Quand la conférence a été déplacée du 3-8 août au 24-29 août, les dix jeunes
// fêtés dans la première période ont cédé la place à neuf autres, entièrement
// différents ; une fenêtre figée aurait fêté des jeunes dont ce n'était plus
// l'anniversaire, et oublié les nouveaux.
//
// C'est la seule définition : le module d'amorçage, qui programme les annonces
// J-2, J-1 et jour J, s'en sert aussi. Deux règles pour une même question
// finiraient par diverger.
import { DATE_FIN, DATE_VEILLE } from "./theme";

/** Rang d'une date dans l'année, mois et jour seulement : 23 août → 823. */
const rang = (mois: number, jour: number) => mois * 100 + jour;

const DEBUT = rang(DATE_VEILLE.getMonth() + 1, DATE_VEILLE.getDate());
const FIN = rang(DATE_FIN.getMonth() + 1, DATE_FIN.getDate());

export const FENETRE = {
  debut: { mois: DATE_VEILLE.getMonth() + 1, jour: DATE_VEILLE.getDate() },
  fin: { mois: DATE_FIN.getMonth() + 1, jour: DATE_FIN.getDate() },
  annee: DATE_FIN.getFullYear(),
};

/**
 * L'anniversaire tombe-t-il pendant la conférence ? Seuls le jour et le mois
 * comptent — c'est un anniversaire, pas une date de naissance.
 *
 * La comparaison porte sur le rang dans l'année et non sur le seul quantième :
 * une conférence à cheval sur deux mois (30 août - 4 septembre, par exemple)
 * donnerait sinon une réponse fausse sans que rien ne le signale.
 */
export function anniversairePendantConference(d: Date): boolean {
  const r = rang(d.getMonth() + 1, d.getDate());
  // Une conférence à cheval sur le nouvel an : la fenêtre enjambe le 31/12.
  return DEBUT <= FIN ? r >= DEBUT && r <= FIN : r >= DEBUT || r <= FIN;
}

/** Âge atteint le jour de l'anniversaire, pendant la conférence. */
export const ageALaConference = (naissance: Date) => FENETRE.annee - naissance.getFullYear();
