// Socle des documents PDF composés côté serveur avec pdf-lib : couleurs de la
// charte, page A4, découpe des paragraphes, en-tête au logo, QR code.
//
// Deux façons de produire un PDF, à choisir selon le document :
//   • pdf-lib (ce fichier) : texte et tableaux simples, léger, tourne sur
//     Vercel sans navigateur. Rapports, listes, reçus.
//   • HTML imprimable (components/FeuilleImprimable.tsx) : mise en page
//     riche, polices web, l'utilisateur fait « Enregistrer en PDF » depuis son
//     navigateur. Attestations, diplômes, affiches.
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { APP } from "./app";

const hex = (h: string) =>
  rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

export const COULEUR = hex(APP.couleur);
export const COULEUR_SOMBRE = hex(APP.couleurSombre);
export const ENCRE = rgb(0.12, 0.16, 0.23);
export const GRIS = rgb(0.42, 0.45, 0.5);
export const GRIS_CLAIR = rgb(0.88, 0.91, 0.95);
export const ROUGE = rgb(0.72, 0.11, 0.11);

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
    }: {
      police?: PDFFont;
      taille?: number;
      couleur?: ReturnType<typeof rgb>;
      x?: number;
      largeur?: number;
      interligne?: number;
    } = {}
  ) {
    for (const ligne of this.decouper(surWinAnsi(texte), police, taille, largeur)) {
      this.reserver(taille * interligne);
      this.y -= taille * interligne;
      this.page.drawText(ligne, { x, y: this.y, size: taille, font: police, color: couleur });
    }
  }

  titre(texte: string) {
    this.espace(6);
    this.paragraphe(texte, { police: this.grasse, taille: 12.5, couleur: COULEUR_SOMBRE });
    this.espace(3);
  }

  /** Tableau simple : colonnes en points, en-tête grisé, lignes qui passent à la page suivante. */
  tableau(colonnes: { titre: string; largeur: number }[], lignes: string[][], taille = 9) {
    const h = taille * 1.9;
    const enTete = () => {
      this.reserver(h);
      this.page.drawRectangle({ x: MARGE, y: this.y - h, width: A4.largeur - 2 * MARGE, height: h, color: GRIS_CLAIR });
      let x = MARGE + 4;
      for (const c of colonnes) {
        this.page.drawText(surWinAnsi(c.titre), { x, y: this.y - h + taille * 0.6, size: taille, font: this.grasse, color: ENCRE });
        x += c.largeur;
      }
      this.y -= h;
    };
    enTete();
    for (const ligne of lignes) {
      if (this.y - h < BAS) {
        this.nouvellePage();
        enTete();
      }
      let x = MARGE + 4;
      ligne.forEach((cellule, i) => {
        const l = colonnes[i].largeur - 8;
        const [premiere] = this.decouper(surWinAnsi(cellule), this.normale, taille, l);
        this.page.drawText(premiere ?? "", { x, y: this.y - h + taille * 0.6, size: taille, font: this.normale, color: ENCRE });
        x += colonnes[i].largeur;
      });
      this.page.drawLine({ start: { x: MARGE, y: this.y - h }, end: { x: A4.largeur - MARGE, y: this.y - h }, thickness: 0.4, color: GRIS_CLAIR });
      this.y -= h;
    }
  }

  espace(h: number) {
    this.y -= h;
  }

  /** QR code carré, coin haut-gauche en (x, y). */
  async qr(contenu: string, x: number, y: number, cote: number) {
    const png = await QRCode.toBuffer(contenu, { margin: 0, width: 512, errorCorrectionLevel: "M" });
    const image = await this.doc.embedPng(png);
    this.page.drawImage(image, { x, y: y - cote, width: cote, height: cote });
  }

  async octets(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

/**
 * En-tête standard des documents : logo (si présent dans public/), titre en
 * couleur sombre et sous-titre gris. Sans logo, l'en-tête est textuel.
 */
export async function enTeteDocument(c: Composeur, titre: string, sousTitre: string) {
  let logo: PDFImage | null = null;
  try {
    const octets = await readFile(path.join(process.cwd(), "public", APP.logo.replace(/^\//, "")));
    logo = APP.logo.endsWith(".jpg") || APP.logo.endsWith(".jpeg")
      ? await c.doc.embedJpg(octets)
      : await c.doc.embedPng(octets);
  } catch {
    // Pas de logo sur le disque : on écrit sans lui.
  }
  if (logo) {
    const h = 42;
    c.page.drawImage(logo, { x: MARGE, y: c.y - h, width: (logo.width / logo.height) * h, height: h });
  }
  const xTitre = logo ? MARGE + 54 : MARGE;
  c.page.drawText(surWinAnsi(titre), { x: xTitre, y: c.y - 16, size: 15, font: c.grasse, color: COULEUR_SOMBRE });
  c.page.drawText(surWinAnsi(sousTitre), { x: xTitre, y: c.y - 32, size: 10, font: c.normale, color: GRIS });
  c.espace(48);
}

/** Réponse HTTP prête à servir depuis une route : `return reponsePdf(octets, "rapport.pdf")`. */
export function reponsePdf(octets: Uint8Array, nomFichier: string, enLigne = true) {
  return new Response(new Uint8Array(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${enLigne ? "inline" : "attachment"}; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
