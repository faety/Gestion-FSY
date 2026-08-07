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

// La règle est définie une seule fois, dans src/lib/anniversaires-client.ts :
// l'application et l'amorçage doivent répondre la même chose à « qui fête son
// anniversaire pendant la conférence ? ». Deux implémentations finiraient par
// diverger, et personne ne s'en apercevrait avant le jour venu.
export {
  FENETRE as FENETRE_ANNIVERSAIRES,
  ageALaConference,
  anniversairePendantConference,
} from "../src/lib/anniversaires-client";
import {
  FENETRE,
  ageALaConference,
  anniversairePendantConference,
} from "../src/lib/anniversaires-client";

export type JeuneAnniversaire = {
  prenom: string;
  nom: string;
  sexe: string;
  dateNaissance: Date;
  pieu: string;
  groupe?: string | null;
};

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
  // Regroupement par date, mois compris : une conférence à cheval sur deux mois
  // — 30 août au 4 septembre, par exemple — mêlerait sinon le 1er septembre au
  // 1er août, et l'annonce tomberait un mois trop tôt.
  const parDate = new Map<string, JeuneAnniversaire[]>();
  for (const j of jeunes) {
    if (!anniversairePendantConference(j.dateNaissance)) continue;
    const cle = `${j.dateNaissance.getMonth() + 1}-${j.dateNaissance.getDate()}`;
    parDate.set(cle, [...(parDate.get(cle) ?? []), j]);
  }

  const annonces: AnnonceAnniversaire[] = [];
  const ordre = (cle: string) => {
    const [m, d] = cle.split("-").map(Number);
    return m * 100 + d;
  };
  for (const [cle, liste] of [...parDate.entries()].sort((a, b) => ordre(a[0]) - ordre(b[0]))) {
    liste.sort((a, b) => a.dateNaissance.getTime() - b.dateNaissance.getTime());
    const [mois, jour] = cle.split("-").map(Number);
    // L'année de la conférence, pas celle de naissance : c'est l'anniversaire
    // qui se fête, à la date où il tombe cette année-là.
    const dateAnniv = new Date(FENETRE.annee, mois - 1, jour);
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
