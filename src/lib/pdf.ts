// Socle commun des documents PDF de l'application (programme, rapport final) :
// couleurs de la charte, mise en page A4, découpe des paragraphes et en-tête
// au logo. Chaque document reste composé dans son propre fichier ; ici ne vit
// que ce qu'ils partagent.
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";

// Couleurs de la charte (globals.css)
export const FSY = rgb(0x1d / 255, 0x4e / 255, 0xd8 / 255);
export const FSY_SOMBRE = rgb(0x1e / 255, 0x3a / 255, 0x8a / 255);
export const ENCRE = rgb(0.12, 0.16, 0.23);
export const GRIS = rgb(0.42, 0.45, 0.5);
export const GRIS_CLAIR = rgb(0.88, 0.91, 0.95);
export const ROUGE = rgb(0.72, 0.11, 0.11);
export const AMBRE = rgb(0.7, 0.4, 0);

export const A4 = { largeur: 595.28, hauteur: 841.89 };
export const MARGE = 46;
export const BAS = 54;

// Les polices standard n'encodent que WinAnsi : on remplace ce qui n'y figure
// pas plutôt que de laisser l'encodage échouer sur un caractère copié-collé.
export const surWinAnsi = (texte: string) =>
  texte
    .replace(/[\u00A0\u2000-\u200B\u202F]/g, " ")
    .replace(/\u2192/g, "-")
    .replace(/[\u2010-\u2012]/g, "-")
    .replace(/[^\u0020-\u007E\u00A1-\u00FF\u0152\u0153\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/gu, "");

export const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export class Composeur {
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

/**
 * En-tête standard des documents : logo (si présent), titre en bleu sombre et
 * sous-titre gris. Sans logo, le document reste complet — l'en-tête est textuel.
 */
export async function enTeteDocument(c: Composeur, titre: string, sousTitre: string) {
  let logo: PDFImage | null = null;
  try {
    const octetsLogo = await readFile(path.join(process.cwd(), "public", "logo-fsy-2026.png"));
    logo = await c.doc.embedPng(octetsLogo);
  } catch {
    // Pas de logo sur le disque : tant pis, on écrit sans lui.
  }
  if (logo) {
    const h = 42;
    const l = (logo.width / logo.height) * h;
    c.page.drawImage(logo, { x: MARGE, y: c.y - h, width: l, height: h });
  }
  const xTitre = logo ? MARGE + 54 : MARGE;
  c.page.drawText(surWinAnsi(titre), {
    x: xTitre,
    y: c.y - 16,
    size: 15,
    font: c.grasse,
    color: FSY_SOMBRE,
  });
  c.page.drawText(surWinAnsi(sousTitre), {
    x: xTitre,
    y: c.y - 32,
    size: 10,
    font: c.normale,
    color: GRIS,
  });
  c.espace(48);
}
