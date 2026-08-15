// Programme officiel en PDF — réservé au couple dirigeant et aux
// coordinateurs principaux.
//
// Le document est composé au moment du téléchargement, depuis la base : il
// porte donc toutes les mises à jour — horaires confirmés, activités
// modifiées, annulées ou ajoutées sur place — et il le dit dans son en-tête,
// avec la date d'édition. Un jour précis ou la conférence entière, au choix.
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "./db";
import { CONFERENCE, LIEU, NB_JOURS, DATE_VEILLE } from "./theme";
import { ordreDuJourDe } from "./ordres-du-jour";
import { PUBLIC_LABELS, TYPE_LABELS } from "./roles";

// Couleurs de la charte (globals.css)
const FSY = rgb(0x1d / 255, 0x4e / 255, 0xd8 / 255);
const FSY_SOMBRE = rgb(0x1e / 255, 0x3a / 255, 0x8a / 255);
const ENCRE = rgb(0.12, 0.16, 0.23);
const GRIS = rgb(0.42, 0.45, 0.5);
const GRIS_CLAIR = rgb(0.88, 0.91, 0.95);
const ROUGE = rgb(0.72, 0.11, 0.11);
const AMBRE = rgb(0.7, 0.4, 0);


// Instructeurs des cours de Séminaires & Instituts (Abidjan West), tels que
// transmis par le couple dirigeant pour diffusion aux dirigeants de pieux.
const INSTRUCTEURS_SI = [
  "KOFFI RICHARD JEAN",
  "FERDINAND BLA KOUASSI — 05 46 67 43 21",
  "FAE G. DAHAKPOIN — 05 86 98 75 74",
  "SEHI REGINA — 07 87 24 06 45",
];

// Le rôle attendu par niveau, au neutre — le document n'est pas personnalisé.
const ROLE_NEUTRE: Record<string, string> = {
  DIRIGER: "dirige",
  ENSEIGNER: "enseigne",
  SUPERVISER: "supervise",
  AIDER: "aide",
  ASSISTER: "assiste",
  RECEVOIR: "reçoit les rapports d'appel",
  FACULTATIF: "facultatif",
  SI_ATTRIBUE: "si la tâche est attribuée",
  AUCUN: "non concernés",
};

const heureFmt = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const dateLongueFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Les polices standard n'encodent que WinAnsi : on remplace ce qui n'y figure
// pas plutôt que de laisser l'encodage échouer sur un caractère copié-collé.
const surWinAnsi = (texte: string) =>
  texte
    .replace(/[\u00A0\u2000-\u200B\u202F]/g, " ")
    .replace(/\u2192/g, "-")
    .replace(/[\u2010-\u2012]/g, "-")
    .replace(/[^\u0020-\u007E\u00A1-\u00FF\u0152\u0153\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/gu, "");

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const A4 = { largeur: 595.28, hauteur: 841.89 };
const MARGE = 46;
const BAS = 54;

type Activite = {
  titre: string;
  description: string | null;
  lieu: string | null;
  debut: Date;
  fin: Date | null;
  type: string;
  statut: string;
  publicCible: string;
  pourEncadrants: boolean;
  officielle: boolean;
  roleConseiller: string;
  roleAdjoint: string;
  roleCoordinateur: string;
  roleDirigeant: string;
  cibles: string[];
};

type Journee = { numero: number; date: Date; tenue: string | null; tenueEncadrants: string | null; note: string | null };

class Composeur {
  doc!: PDFDocument;
  page!: PDFPage;
  y = 0;
  normale!: PDFFont;
  grasse!: PDFFont;
  oblique!: PDFFont;

  async initialiser() {
    this.doc = await PDFDocument.create();
    this.normale = await this.doc.embedFont(StandardFonts.Helvetica);
    this.grasse = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.oblique = await this.doc.embedFont(StandardFonts.HelveticaOblique);
    this.nouvellePage();
  }

  nouvellePage() {
    this.page = this.doc.addPage([A4.largeur, A4.hauteur]);
    this.y = A4.hauteur - MARGE;
  }

  reserver(hauteur: number) {
    if (this.y - hauteur < BAS) this.nouvellePage();
  }

  decouper(texte: string, police: PDFFont, taille: number, largeur: number): string[] {
    const lignes: string[] = [];
    for (const brut of texte.split("\n")) {
      const mots = brut.split(/\s+/).filter(Boolean);
      let ligne = "";
      for (const mot of mots) {
        const essai = ligne ? `${ligne} ${mot}` : mot;
        if (police.widthOfTextAtSize(essai, taille) <= largeur || !ligne) ligne = essai;
        else {
          lignes.push(ligne);
          ligne = mot;
        }
      }
      lignes.push(ligne);
    }
    return lignes;
  }

  paragraphe(
    texte: string,
    {
      police = this.normale,
      taille = 9.5,
      couleur = ENCRE,
      x = MARGE,
      largeur = A4.largeur - 2 * MARGE,
      interligne = 1.35,
      barre = false,
    }: {
      police?: PDFFont;
      taille?: number;
      couleur?: ReturnType<typeof rgb>;
      x?: number;
      largeur?: number;
      interligne?: number;
      barre?: boolean;
    } = {}
  ) {
    const lignes = this.decouper(surWinAnsi(texte), police, taille, largeur);
    for (const ligne of lignes) {
      this.reserver(taille * interligne);
      this.y -= taille * interligne;
      this.page.drawText(ligne, { x, y: this.y, size: taille, font: police, color: couleur });
      if (barre) {
        this.page.drawLine({
          start: { x, y: this.y + taille * 0.32 },
          end: { x: x + police.widthOfTextAtSize(ligne, taille), y: this.y + taille * 0.32 },
          thickness: 0.7,
          color: couleur,
        });
      }
    }
  }

  espace(h: number) {
    this.y -= h;
  }
}

const nomJour = (numero: number) => (numero === 0 ? "Veille" : `Jour ${numero}`);

const badges = (a: Activite): { texte: string; couleur: ReturnType<typeof rgb> }[] => {
  const liste: { texte: string; couleur: ReturnType<typeof rgb> }[] = [];
  if (a.statut === "ANNULE") liste.push({ texte: "ANNULÉE", couleur: ROUGE });
  if (a.statut === "MODIFIE") liste.push({ texte: "Modifiée", couleur: AMBRE });
  if (a.statut === "A_CONFIRMER") liste.push({ texte: "À confirmer", couleur: GRIS });
  if (a.pourEncadrants) liste.push({ texte: "Encadrants", couleur: FSY_SOMBRE });
  if (a.publicCible !== "TOUS") liste.push({ texte: PUBLIC_LABELS[a.publicCible] ?? a.publicCible, couleur: FSY_SOMBRE });
  if (a.type === "PAR_GROUPE" || a.type === "PAR_COMPAGNIE")
    liste.push({ texte: TYPE_LABELS[a.type], couleur: FSY_SOMBRE });
  if (!a.officielle) liste.push({ texte: "Ajoutée sur place", couleur: GRIS });
  return liste;
};

const lignesRoles = (a: Activite): string | null => {
  const paires: [string, string][] = [
    ["Conseillers", a.roleConseiller],
    ["Adjoints", a.roleAdjoint],
    ["Coordinateurs", a.roleCoordinateur],
    ["Couple dirigeant", a.roleDirigeant],
  ];
  // Quand tout le monde assiste simplement (dirigeants libres), la ligne
  // n'apprend rien : on ne l'imprime pas.
  const banal = paires.every(
    ([niveau, role]) =>
      role === "ASSISTER" || (niveau === "Couple dirigeant" && role === "FACULTATIF")
  );
  if (banal) return null;
  return paires.map(([niveau, role]) => `${niveau} : ${ROLE_NEUTRE[role] ?? role.toLowerCase()}`).join("  ·  ");
};

export async function genererProgrammePdf(
  jour: number | null,
  editeur: { prenom: string; nom: string }
): Promise<{ octets: Uint8Array; nomFichier: string }> {
  const [toutes, journees] = await Promise.all([
    prisma.activite.findMany({
      orderBy: { debut: "asc" },
      include: { groupes: { include: { groupe: true } }, compagnie: true },
    }),
    prisma.journeeConference.findMany({ orderBy: { numero: "asc" } }),
  ]);

  const numeroDuJour = (d: Date) =>
    Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
      Date.UTC(DATE_VEILLE.getFullYear(), DATE_VEILLE.getMonth(), DATE_VEILLE.getDate())) / 86_400_000);

  const activites: (Activite & { numero: number })[] = toutes.map((a) => ({
    titre: a.titre,
    description: a.description,
    lieu: a.lieu,
    debut: a.debut,
    fin: a.fin,
    type: a.type,
    statut: a.statut,
    publicCible: a.publicCible,
    pourEncadrants: a.pourEncadrants,
    officielle: a.officielle,
    roleConseiller: a.roleConseiller,
    roleAdjoint: a.roleAdjoint,
    roleCoordinateur: a.roleCoordinateur,
    roleDirigeant: a.roleDirigeant,
    cibles: [...(a.compagnie ? [a.compagnie.nom] : []), ...a.groupes.map((g) => g.groupe.nom)],
    numero: numeroDuJour(a.debut),
  }));

  const numeros =
    jour === null
      ? [...new Set(activites.map((a) => a.numero))].filter((n) => n >= 0 && n <= NB_JOURS).sort((x, y) => x - y)
      : [jour];

  const c = new Composeur();
  await c.initialiser();

  // ---------- En-tête du document ----------
  let logo: PDFImage | null = null;
  try {
    const octetsLogo = await readFile(path.join(process.cwd(), "public", "logo-fsy-2026.png"));
    logo = await c.doc.embedPng(octetsLogo);
  } catch {
    // Sans logo, le document reste complet : l'en-tête est textuel.
  }
  if (logo) {
    const h = 42;
    const l = (logo.width / logo.height) * h;
    c.page.drawImage(logo, { x: MARGE, y: c.y - h, width: l, height: h });
  }
  const xTitre = logo ? MARGE + 54 : MARGE;
  c.page.drawText("Programme officiel — FSY 2026 Abidjan Ouest", {
    x: xTitre,
    y: c.y - 16,
    size: 15,
    font: c.grasse,
    color: FSY_SOMBRE,
  });
  c.page.drawText(surWinAnsi(`${majuscule(CONFERENCE.duAuAvecVeille)} · ${LIEU.nom}, ${LIEU.villePays}`), {
    x: xTitre,
    y: c.y - 32,
    size: 10,
    font: c.normale,
    color: GRIS,
  });
  c.espace(48);

  const maintenant = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Abidjan",
  }).format(new Date());
  c.paragraphe(
    `Édité le ${maintenant} par ${editeur.prenom} ${editeur.nom} — état du programme à cet instant, toutes mises à jour comprises (horaires confirmés, activités modifiées, annulées ou ajoutées).`,
    { police: c.oblique, taille: 8.5, couleur: GRIS }
  );
  c.espace(6);

  // ---------- Jours ----------
  const fichesImprimees = new Set<string>();
  for (const numero of numeros) {
    const duJour = activites.filter((a) => a.numero === numero);
    const journee: Journee | undefined = journees.find((j) => j.numero === numero);
    const date = journee?.date ?? new Date(Date.UTC(
      DATE_VEILLE.getFullYear(), DATE_VEILLE.getMonth(), DATE_VEILLE.getDate() + numero));

    // Bandeau du jour
    c.reserver(46);
    c.espace(10);
    c.page.drawRectangle({
      x: MARGE,
      y: c.y - 24,
      width: A4.largeur - 2 * MARGE,
      height: 24,
      color: FSY,
    });
    c.page.drawText(
      surWinAnsi(`${nomJour(numero)} — ${majuscule(dateLongueFmt.format(date))}`),
      { x: MARGE + 10, y: c.y - 17, size: 11.5, font: c.grasse, color: rgb(1, 1, 1) }
    );
    c.espace(30);

    if (journee?.tenue || journee?.tenueEncadrants) {
      const tenues = [
        ...(journee.tenue ? [`Tenue des jeunes : ${journee.tenue}`] : []),
        ...(journee.tenueEncadrants ? [`Encadrants : ${journee.tenueEncadrants}`] : []),
      ].join("  ·  ");
      c.paragraphe(tenues, { taille: 8.5, couleur: GRIS });
    }
    if (journee?.note) c.paragraphe(journee.note, { police: c.oblique, taille: 8.5, couleur: GRIS });
    c.espace(4);

    if (duJour.length === 0) {
      c.paragraphe("Aucune activité enregistrée pour ce jour.", { police: c.oblique, couleur: GRIS });
      continue;
    }

    for (const a of duJour) {
      const annulee = a.statut === "ANNULE";
      const heure = a.fin
        ? `${heureFmt.format(a.debut)} – ${heureFmt.format(a.fin)}`
        : heureFmt.format(a.debut);

      // L'activité ne se coupe pas juste après son titre : on réserve de quoi
      // poser l'heure, le titre et une ligne de plus.
      c.reserver(34);
      c.espace(9);

      const xTexte = MARGE + 88;
      const largeurTexte = A4.largeur - MARGE - xTexte;

      // Heure dans la marge, titre en gras à droite
      const yLigne = c.y - 10.5;
      c.page.drawText(surWinAnsi(heure), {
        x: MARGE,
        y: yLigne,
        size: 9,
        font: c.grasse,
        color: annulee ? GRIS : FSY_SOMBRE,
      });
      const lignesTitre = c.decouper(surWinAnsi(a.titre), c.grasse, 10.5, largeurTexte);
      let premiere = true;
      for (const ligne of lignesTitre) {
        c.reserver(14);
        c.y -= premiere ? 14 : 13;
        premiere = false;
        c.page.drawText(ligne, {
          x: xTexte,
          y: c.y,
          size: 10.5,
          font: c.grasse,
          color: annulee ? GRIS : ENCRE,
        });
        if (annulee) {
          c.page.drawLine({
            start: { x: xTexte, y: c.y + 3.4 },
            end: { x: xTexte + c.grasse.widthOfTextAtSize(ligne, 10.5), y: c.y + 3.4 },
            thickness: 0.8,
            color: GRIS,
          });
        }
      }

      // Badges et lieu, sur une ligne discrète
      const etiquettes = badges(a);
      const morceaux = [
        ...etiquettes.map((b) => b.texte),
        ...(a.lieu ? [a.lieu] : []),
        ...(a.cibles.length > 0 ? [a.cibles.join(", ")] : []),
      ];
      if (morceaux.length > 0) {
        c.paragraphe(morceaux.join("  ·  "), {
          taille: 8.5,
          couleur: annulee ? GRIS : etiquettes[0]?.couleur ?? GRIS,
          x: xTexte,
          largeur: largeurTexte,
        });
      }

      if (a.description) {
        c.paragraphe(a.description, {
          taille: 9,
          couleur: annulee ? GRIS : ENCRE,
          x: xTexte,
          largeur: largeurTexte,
        });
      }

      const roles = lignesRoles(a);
      if (roles && !annulee) {
        c.paragraphe(roles, {
          police: c.oblique,
          taille: 8,
          couleur: GRIS,
          x: xTexte,
          largeur: largeurTexte,
        });
      }

      // Ordre du jour suggéré par le manuel de l'encadrant — attaché à
      // l'affichage, jamais en base : les modifications des coordinateurs
      // restent maîtresses des horaires et des textes.
      //
      // Comme dans le manuel, une fiche déjà imprimée telle quelle ne se
      // répète pas : l'appel revient deux fois par jour, ses consignes une
      // seule fois par document.
      const fiche = annulee ? null : ordreDuJourDe(a.titre, a.numero, a.debut.getUTCHours());
      const cleFiche = fiche ? `${a.titre}|${fiche.points.join("|")}` : "";
      if (fiche && fichesImprimees.has(cleFiche)) {
        c.paragraphe(
          `${fiche.nature === "ordre" ? "Ordre du jour suggéré" : "Repères"} : voir la même réunion plus haut.`,
          { police: c.oblique, taille: 8, couleur: GRIS, x: xTexte, largeur: largeurTexte }
        );
      } else if (fiche) {
        fichesImprimees.add(cleFiche);
        c.espace(3);
        if (fiche.alerte) {
          c.paragraphe(`! ${fiche.alerte}`, {
            police: c.grasse,
            taille: 8,
            couleur: AMBRE,
            x: xTexte,
            largeur: largeurTexte,
          });
        }
        c.paragraphe(
          `${fiche.nature === "ordre" ? "Ordre du jour suggéré" : "Repères"} — manuel de l'encadrant`,
          { police: c.grasse, taille: 8, couleur: FSY_SOMBRE, x: xTexte, largeur: largeurTexte }
        );
        if (fiche.objet) {
          c.paragraphe(fiche.objet, {
            police: c.oblique,
            taille: 8,
            couleur: GRIS,
            x: xTexte,
            largeur: largeurTexte,
          });
        }
        for (const point of fiche.points) {
          const sous = point.startsWith("◦");
          c.paragraphe(sous ? point : `• ${point}`, {
            taille: 8,
            couleur: sous ? GRIS : ENCRE,
            x: xTexte + (sous ? 14 : 4),
            largeur: largeurTexte - (sous ? 14 : 4),
          });
        }
        if (fiche.formations) {
          c.paragraphe(`Sujets de formation suggérés : ${fiche.formations.join(" · ")}.`, {
            police: c.oblique,
            taille: 7.5,
            couleur: GRIS,
            x: xTexte + 4,
            largeur: largeurTexte - 4,
          });
        }
      }

      // Filet de séparation
      c.espace(7);
      c.reserver(2);
      c.page.drawLine({
        start: { x: MARGE, y: c.y },
        end: { x: A4.largeur - MARGE, y: c.y },
        thickness: 0.5,
        color: GRIS_CLAIR,
      });
    }
    c.espace(6);
  }

  // ---------- Pieds de page ----------
  const pages = c.doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(
      surWinAnsi(`FSY 2026 Abidjan Ouest — Programme (${jour === null ? "conférence entière" : nomJour(jour)})`),
      { x: MARGE, y: 30, size: 7.5, font: c.normale, color: GRIS }
    );
    const numerotation = `Page ${i + 1} / ${pages.length}`;
    page.drawText(numerotation, {
      x: A4.largeur - MARGE - c.normale.widthOfTextAtSize(numerotation, 7.5),
      y: 30,
      size: 7.5,
      font: c.normale,
      color: GRIS,
    });
  });

  const sansAccents = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  const nomFichier =
    jour === null
      ? "FSY2026-programme-complet.pdf"
      : `FSY2026-programme-${sansAccents(`${nomJour(jour)}-${dateLongueFmt.format(
          journees.find((j) => j.numero === jour)?.date ??
            new Date(Date.UTC(DATE_VEILLE.getFullYear(), DATE_VEILLE.getMonth(), DATE_VEILLE.getDate() + jour))
        )}`)}.pdf`;

  return { octets: await c.doc.save(), nomFichier };
}

/**
 * Version condensée du programme — pour les dirigeants de pieux et les
 * partenaires : une ligne par activité, l'essentiel des heures et des jours,
 * les instructeurs S&I en tête, et les mentions « modifiée », « à confirmer »
 * ou « ANNULÉE » pour que les ajustements se voient. Composée depuis la base
 * au moment du téléchargement, comme la version détaillée.
 */
export async function genererProgrammeCondensePdf(editeur: {
  prenom: string;
  nom: string;
}): Promise<{ octets: Uint8Array; nomFichier: string }> {
  const [toutes, journees] = await Promise.all([
    prisma.activite.findMany({ orderBy: { debut: "asc" } }),
    prisma.journeeConference.findMany({ orderBy: { numero: "asc" } }),
  ]);

  const numeroDuJour = (d: Date) =>
    Math.floor(
      (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
        Date.UTC(DATE_VEILLE.getFullYear(), DATE_VEILLE.getMonth(), DATE_VEILLE.getDate())) /
        86_400_000
    );

  const c = new Composeur();
  await c.initialiser();
  const BLANC = rgb(1, 1, 1);
  const CLAIR = rgb(0.9, 0.93, 0.97);

  let logo: PDFImage | null = null;
  try {
    logo = await c.doc.embedPng(await readFile(path.join(process.cwd(), "public", "logo-fsy-2026.png")));
  } catch {
    // Sans logo, l'en-tête reste textuel.
  }
  if (logo) {
    const h = 44;
    c.page.drawImage(logo, { x: MARGE, y: c.y - h + 10, width: (logo.width / logo.height) * h, height: h });
  }
  const xTitre = logo ? MARGE + 56 : MARGE;
  c.page.drawText("Programme complet de la conférence", { x: xTitre, y: c.y - 14, size: 16, font: c.grasse, color: FSY_SOMBRE });
  c.page.drawText(surWinAnsi(`FSY 2026 — Abidjan Ouest · « Marche avec moi » (Moïse 6:34)`), { x: xTitre, y: c.y - 30, size: 10, font: c.normale, color: GRIS });
  c.page.drawText(surWinAnsi(`${majuscule(CONFERENCE.duAuComplet)} (veille des encadrants le ${CONFERENCE.duAuAvecVeille.replace(/^du /, "").split(" au ")[0]}) · ${LIEU.nom}, ${LIEU.ville}`), { x: xTitre, y: c.y - 43, size: 9, font: c.normale, color: GRIS });
  c.espace(56);
  c.page.drawLine({ start: { x: MARGE, y: c.y }, end: { x: A4.largeur - MARGE, y: c.y }, thickness: 1.1, color: FSY });
  c.espace(6);

  const maintenant = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Abidjan" }).format(new Date());
  c.paragraphe(
    `Édité le ${maintenant} par ${editeur.prenom} ${editeur.nom} — état vivant du programme, tous les ajustements de l'équipe compris. Les activités « Encadrants » ne concernent pas les jeunes ; JF/JG : Jeunes Filles / Jeunes Gens.`,
    { police: c.oblique, taille: 8.5, couleur: GRIS }
  );
  c.espace(8);

  // Encadré des instructeurs S&I
  const hautBoite = c.y;
  c.espace(4);
  c.paragraphe("Cours de Séminaires & Instituts — Instructeurs (Abidjan West)", { police: c.grasse, taille: 10.5, couleur: FSY_SOMBRE, x: MARGE + 10 });
  for (const i of INSTRUCTEURS_SI) {
    c.paragraphe(`•  ${i}`, { taille: 9.5, x: MARGE + 14 });
  }
  c.espace(6);
  c.page.drawRectangle({ x: MARGE, y: c.y, width: A4.largeur - 2 * MARGE, height: hautBoite - c.y, borderColor: FSY, borderWidth: 0.9 });
  c.espace(10);

  for (let n = 0; n <= NB_JOURS; n++) {
    const duJour = toutes.filter((a) => numeroDuJour(a.debut) === n);
    if (duJour.length === 0) continue;
    const j = journees.find((x) => x.numero === n);
    const date = j?.date ?? new Date(Date.UTC(DATE_VEILLE.getFullYear(), DATE_VEILLE.getMonth(), DATE_VEILLE.getDate() + n));
    c.reserver(50);
    c.espace(8);
    c.page.drawRectangle({ x: MARGE, y: c.y - 18, width: A4.largeur - 2 * MARGE, height: 20, color: FSY });
    c.page.drawText(surWinAnsi(`${nomJour(n)} — ${majuscule(dateLongueFmt.format(date))}`), { x: MARGE + 8, y: c.y - 13, size: 10.5, font: c.grasse, color: BLANC });
    c.espace(26);
    if (j?.tenue || j?.tenueEncadrants) {
      const tenues = [j?.tenue ? `Tenue des jeunes : ${j.tenue}` : null, j?.tenueEncadrants ? `Encadrants : ${j.tenueEncadrants}` : null].filter(Boolean).join("  ·  ");
      c.paragraphe(tenues!, { police: c.oblique, taille: 8, couleur: GRIS });
      c.espace(2);
    }
    let raye = false;
    for (const a of duJour) {
      const heure = a.fin ? `${heureFmt.format(a.debut)} - ${heureFmt.format(a.fin)}` : heureFmt.format(a.debut);
      const tags = [
        a.pourEncadrants ? "Encadrants" : null,
        a.publicCible === "FILLES" ? "JF" : a.publicCible === "GARCONS" ? "JG" : null,
        a.statut === "A_CONFIRMER" ? "à confirmer" : a.statut === "MODIFIE" ? "modifiée" : a.statut === "ANNULE" ? "ANNULÉE" : null,
        !a.officielle ? "ajoutée" : null,
      ].filter(Boolean);
      const annulee = a.statut === "ANNULE";
      c.reserver(13);
      c.y -= 12.5;
      if (raye) {
        c.page.drawRectangle({ x: MARGE, y: c.y - 3, width: A4.largeur - 2 * MARGE, height: 12.4, color: CLAIR, opacity: 0.55 });
      }
      raye = !raye;
      c.page.drawText(surWinAnsi(heure), { x: MARGE + 4, y: c.y, size: 8.4, font: c.grasse, color: annulee ? GRIS : FSY_SOMBRE });
      let ligne = surWinAnsi(a.titre + (tags.length ? `   [${tags.join(" · ")}]` : ""));
      const largeurLigne = A4.largeur - 2 * MARGE - 92;
      while (c.normale.widthOfTextAtSize(ligne, 8.6) > largeurLigne) ligne = ligne.slice(0, -2);
      const couleur = annulee ? GRIS : a.statut === "MODIFIE" ? AMBRE : ENCRE;
      c.page.drawText(ligne, { x: MARGE + 88, y: c.y, size: 8.6, font: annulee ? c.oblique : c.normale, color: couleur });
      if (annulee) {
        c.page.drawLine({ start: { x: MARGE + 88, y: c.y + 2.8 }, end: { x: MARGE + 88 + c.normale.widthOfTextAtSize(ligne, 8.6), y: c.y + 2.8 }, thickness: 0.7, color: GRIS });
      }
    }
    c.espace(4);
  }

  const pages = c.doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(surWinAnsi("FSY 2026 Abidjan Ouest — Programme complet (version condensée) · fsy.ci"), { x: MARGE, y: 30, size: 7.5, font: c.normale, color: GRIS });
    const numerotation = `Page ${i + 1} / ${pages.length}`;
    page.drawText(numerotation, { x: A4.largeur - MARGE - c.normale.widthOfTextAtSize(numerotation, 7.5), y: 30, size: 7.5, font: c.normale, color: GRIS });
  });

  return { octets: await c.doc.save(), nomFichier: "FSY2026-programme-complet-condense.pdf" };
}
