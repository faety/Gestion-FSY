// Thème de l'année FSY 2026, tel qu'il figure dans les manuels officiels.
// Défini ici pour que l'application et le script de peuplement de la base
// partagent la même source.
export const THEME_FSY = {
  reference: "Moïse 6:34",
  titre: "Marche avec moi",
  texte:
    "Voici, mon Esprit est sur toi, c'est pourquoi je justifierai toutes tes paroles. " +
    "Les montagnes fuiront devant toi et les fleuves se détourneront de leur cours. " +
    "Tu demeureras en moi et moi en toi ; c'est pourquoi, marche avec moi.",
};

// ════════════════════════════════════════════════════════════════════════════
//  Quand et où — source unique
// ════════════════════════════════════════════════════════════════════════════
//
// La date était écrite en dur dans une douzaine de fichiers : la page publique,
// les gabarits d'e-mail, les attestations, le critère d'âge, la fenêtre des
// anniversaires, le programme, le pied de page. Quand la conférence a été
// déplacée du 3 au 24 août, il a fallu les retrouver un par un — et il en
// serait resté. Tout se dérive donc d'ici.
//
// Le déplacement s'est fait à trois semaines près, ce qui a conservé les jours
// de la semaine : le premier jour reste un lundi, le quatrième reste un jeudi
// (vêtements du dimanche), le dernier reste un samedi. Le programme des manuels
// tient donc tel quel. Si une date future ne tombait pas sur un lundi, il
// faudrait reprendre les tenues et les réunions du dimanche.

/** Premier jour de la conférence. Le mois est celui de JavaScript : 7 = août. */
export const PREMIER_JOUR = { annee: 2026, mois: 7, jour: 24 } as const;

/** Six jours de conférence, précédés d'un jour zéro réservé aux encadrants. */
export const NB_JOURS = 6;

export const LIEU = {
  nom: "Foyer des Jeunes de Jacqueville",
  ville: "Jacqueville",
  pays: "Côte d'Ivoire",
  villePays: "Jacqueville, Côte d'Ivoire",
  villePaysEn: "Jacqueville, Ivory Coast",
};

/** Date d'un jour de la conférence. Jour 0 = veille, jour 1 = premier jour. */
export function dateDuJour(jour: number, heure = "00:00"): Date {
  const [h, m] = heure.split(":").map(Number);
  return new Date(PREMIER_JOUR.annee, PREMIER_JOUR.mois, PREMIER_JOUR.jour + jour - 1, h, m);
}

export const DATE_DEBUT = dateDuJour(1);
export const DATE_FIN = dateDuJour(NB_JOURS);
export const DATE_VEILLE = dateDuJour(0);

const fr = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", options);
const en = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", options);

const complet = fr({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const courtSansAnnee = fr({ day: "numeric", month: "long" });
const avecAnnee = fr({ day: "numeric", month: "long", year: "numeric" });
const anglais = en({ day: "numeric", month: "long", year: "numeric" });

export const CONFERENCE = {
  nom: "FSY 2026 — Abidjan Ouest",
  zone: "Abidjan Ouest",
  lieu: LIEU.nom,
  /** « lundi 24 août 2026 » */
  debut: complet.format(DATE_DEBUT),
  /** « samedi 29 août 2026 » */
  fin: complet.format(DATE_FIN),
  /** « dimanche 23 août 2026 » — veille, encadrants uniquement */
  veille: complet.format(DATE_VEILLE),
  /** « 24 au 29 août 2026 » */
  duAu: `${courtSansAnnee.format(DATE_DEBUT).replace(/\s\S+$/, "")} au ${avecAnnee.format(DATE_FIN)}`,
  /** « du lundi 24 au samedi 29 août 2026 » */
  duAuComplet: `du ${complet.format(DATE_DEBUT).replace(/\s\d{4}$/, "").replace(/\s\S+$/, "")} au ${complet.format(DATE_FIN)}`,
  /**
   * « du dimanche 23 au samedi 29 août 2026 » — l'étendue du programme.
   *
   * Le programme commence la veille : les encadrants arrivent, visitent le
   * site et se réunissent. La conférence des jeunes, elle, court du 24 au 29.
   * Les deux plages sont justes, chacune à sa place, et les confondre ferait
   * arriver les encadrants un jour trop tard.
   */
  duAuAvecVeille: `du ${complet.format(DATE_VEILLE).replace(/\s\d{4}$/, "").replace(/\s\S+$/, "")} au ${complet.format(DATE_FIN)}`,
  /** Pour les attestations */
  du: avecAnnee.format(DATE_DEBUT),
  au: avecAnnee.format(DATE_FIN),
  duEn: anglais.format(DATE_DEBUT),
  auEn: anglais.format(DATE_FIN),
  jours: NB_JOURS,
};
