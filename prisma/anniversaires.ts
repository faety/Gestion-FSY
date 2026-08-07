// ============================================================================
// ANNIVERSAIRES PENDANT LA CONFÉRENCE — FSY 2026
// ============================================================================
// Les jeunes dont l'anniversaire tombe pendant la conférence, veille comprise,
// sont fêtés sur place. Pour chaque date concernée, trois annonces sont
// programmées à l'avance : J-2, J-1 et le jour même.
//
// La fenêtre se déduit des dates de la conférence : quand elle a été déplacée
// du 3 au 24 août, les dix anniversaires de la première période ont cédé la
// place à neuf autres, entièrement différents. Une fenêtre écrite en dur aurait
// fait fêter des jeunes dont ce n'était plus l'anniversaire, et oublié les
// autres.
// ============================================================================

import { DATE_FIN, DATE_VEILLE } from "../src/lib/theme";

export const FENETRE_ANNIVERSAIRES = {
  debut: { mois: DATE_VEILLE.getMonth() + 1, jour: DATE_VEILLE.getDate() },
  fin: { mois: DATE_FIN.getMonth() + 1, jour: DATE_FIN.getDate() },
  annee: DATE_FIN.getFullYear(),
};

export type JeuneAnniversaire = {
  prenom: string;
  nom: string;
  sexe: string;
  dateNaissance: Date;
  pieu: string;
  groupe?: string | null;
};

// Anniversaire dans la fenêtre de la conférence ? (jour et mois uniquement)
export function anniversairePendantConference(d: Date): boolean {
  const mois = d.getMonth() + 1;
  const jour = d.getDate();
  if (mois !== FENETRE_ANNIVERSAIRES.debut.mois) return false;
  return jour >= FENETRE_ANNIVERSAIRES.debut.jour && jour <= FENETRE_ANNIVERSAIRES.fin.jour;
}

// Âge atteint le jour de l'anniversaire, pendant la conférence
export function ageALaConference(dateNaissance: Date): number {
  return FENETRE_ANNIVERSAIRES.annee - dateNaissance.getFullYear();
}

const fmtJour = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function listeNoms(jeunes: JeuneAnniversaire[]): string {
  return jeunes
    .map((j) => {
      const age = ageALaConference(j.dateNaissance);
      const details = [`${age} ans`, j.groupe ?? j.pieu].filter(Boolean).join(", ");
      return `• ${j.prenom} ${j.nom} (${details})`;
    })
    .join("\n");
}

export type AnnonceAnniversaire = {
  titre: string;
  contenu: string;
  cible: string;
  datePublication: Date;
};

// Trois annonces programmées par date d'anniversaire : J-2, J-1, jour J.
// Cible : « staff des dirigeants » (couple dirigeant et coordinateurs
// principaux) pour la préparation ; tout le staff le jour même, pour que les
// conseillers et les compagnies puissent fêter les jeunes concernés.
export function annoncesAnniversaires(
  jeunes: JeuneAnniversaire[]
): AnnonceAnniversaire[] {
  // Regroupement par jour du mois
  const parJour = new Map<number, JeuneAnniversaire[]>();
  for (const j of jeunes) {
    if (!anniversairePendantConference(j.dateNaissance)) continue;
    const jour = j.dateNaissance.getDate();
    parJour.set(jour, [...(parJour.get(jour) ?? []), j]);
  }

  const annonces: AnnonceAnniversaire[] = [];
  for (const [jour, liste] of [...parJour.entries()].sort((a, b) => a[0] - b[0])) {
    liste.sort((a, b) => a.dateNaissance.getTime() - b.dateNaissance.getTime());
    const dateAnniv = new Date(FENETRE_ANNIVERSAIRES.annee, FENETRE_ANNIVERSAIRES.debut.mois - 1, jour);
    const libelleJour = fmtJour.format(dateAnniv);
    const nb = liste.length;
    const pluriel = nb > 1 ? "s" : "";
    const noms = listeNoms(liste);

    const publier = (joursAvant: number, heure: number) => {
      const d = new Date(dateAnniv);
      d.setDate(d.getDate() - joursAvant);
      d.setHours(heure, 0, 0, 0);
      return d;
    };

    annonces.push({
      titre: `J-2 · ${nb} anniversaire${pluriel} le ${libelleJour}`,
      contenu:
        `Dans deux jours, le ${libelleJour}, ${
          nb === 1 ? "un jeune fête son anniversaire" : `${nb} jeunes fêtent leur anniversaire`
        } :\n\n${noms}\n\n` +
        `À préparer dès maintenant : gâteau ou collation, moment de célébration à inscrire au programme du jour, et information des conseillers concernés.`,
      cible: "COORDINATEURS",
      datePublication: publier(2, 8),
    });

    annonces.push({
      titre: `J-1 · ${nb} anniversaire${pluriel} demain`,
      contenu:
        `Demain ${libelleJour} :\n\n${noms}\n\n` +
        `Dernières vérifications : gâteau ou collation prêt, moment de célébration confirmé avec les coordinateurs adjoints, conseillers prévenus.`,
      cible: "COORDINATEURS",
      datePublication: publier(1, 8),
    });

    annonces.push({
      titre: `🎂 Aujourd'hui : ${nb} anniversaire${pluriel} !`,
      contenu:
        `Nous fêtons aujourd'hui :\n\n${noms}\n\n` +
        `Conseillers : pensez à souhaiter un joyeux anniversaire à ${nb === 1 ? "ce jeune" : "ces jeunes"} avec votre groupe et votre compagnie.`,
      cible: "TOUS",
      datePublication: publier(0, 7),
    });
  }
  return annonces;
}
