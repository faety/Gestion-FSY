// Les listes de papier — celles qu'on tient à la main quand l'application n'a
// pas été renseignée.
//
// Deux documents, deux usages qui n'ont rien à voir :
//
//   • l'émargement par pieu : un cahier de présence, une page par pieu ou
//     district, les jeunes rangés par paroisse, et devant chaque nom une case
//     à signer pour chacun des six jours. C'est le document qui rétablit la
//     vérité quand le pointage numérique a manqué ;
//
//   • les effectifs des repas : une seule numérotation continue du premier
//     jeune à la dernière ligne blanche, jeunes puis encadrants puis tous les
//     autres — sono, cuisine, chauffeurs, visiteurs. Le dernier numéro écrit
//     est le nombre de personnes nourries. C'est tout l'intérêt de numéroter
//     les lignes vides d'avance : personne n'a plus à compter.
//
// Les deux nomment des mineurs : ils portent la mention de confidentialité et
// ne s'éditent que depuis la direction.
import { PDFFont, rgb } from "pdf-lib";
import { prisma } from "./db";
import { CONFERENCE, LIEU } from "./theme";
import { STATUT_ANNULE } from "./criteres";
import {
  A4,
  Composeur,
  ENCRE,
  FSY_SOMBRE,
  GRIS,
  GRIS_CLAIR,
  MARGE,
  enTeteDocument,
  majuscule,
  surWinAnsi,
} from "./pdf";

const BLANC = rgb(1, 1, 1);
const BANDE = rgb(0.93, 0.95, 0.98);
const UTILE = A4.largeur - 2 * MARGE;
const PIED = 46;

/** Lignes blanches ajoutées après chaque paroisse — pour les arrivés non inscrits. */
const BLANCS_PAR_PAROISSE = 2;
/** Lignes blanches en fin de pieu — pour une paroisse qui ne figure sur aucune liste. */
const BLANCS_PAR_PIEU = 6;
/** Lignes blanches du rapport des repas — sono, cuisine, chauffeurs, visiteurs. */
const BLANCS_AUTRES = 70;

type Colonne = { titre: string; largeur: number; centre?: boolean };

const fmtJour = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  timeZone: "UTC",
});

async function journeesDe(depuis: number) {
  const journees = await prisma.journeeConference.findMany({
    where: { numero: { gte: depuis } },
    orderBy: { numero: "asc" },
    select: { numero: true, date: true },
  });
  return journees.map((j) => ({
    numero: j.numero,
    libelle: j.numero === 0 ? "Veille" : `J${j.numero}`,
    date: fmtJour.format(j.date).replace(".", ""),
  }));
}

// ---------- Tracé du tableau ----------

function enTeteTableau(c: Composeur, colonnes: Colonne[], hauteur = 24) {
  let x = MARGE;
  c.page.drawRectangle({
    x: MARGE,
    y: c.y - hauteur,
    width: UTILE,
    height: hauteur,
    color: FSY_SOMBRE,
  });
  for (const col of colonnes) {
    const lignes = col.titre.split("\n");
    lignes.forEach((t, i) => {
      const largeurTexte = c.grasse.widthOfTextAtSize(surWinAnsi(t), 7.5);
      c.page.drawText(surWinAnsi(t), {
        x: col.centre ? x + (col.largeur - largeurTexte) / 2 : x + 4,
        y: c.y - (lignes.length === 1 ? hauteur / 2 + 2.5 : 9.5 + i * 8.5),
        size: 7.5,
        font: c.grasse,
        color: BLANC,
      });
    });
    x += col.largeur;
  }
  c.espace(hauteur);
}

/** Une ligne du tableau. `valeurs` vide = case à remplir à la main. */
function ligneTableau(
  c: Composeur,
  colonnes: Colonne[],
  valeurs: (string | null)[],
  {
    hauteur = 21,
    police,
    fond,
    taille = 9,
  }: { hauteur?: number; police?: PDFFont; fond?: ReturnType<typeof rgb>; taille?: number } = {}
) {
  if (fond) {
    c.page.drawRectangle({ x: MARGE, y: c.y - hauteur, width: UTILE, height: hauteur, color: fond });
  }
  let x = MARGE;
  colonnes.forEach((col, i) => {
    // Les filets verticaux séparent les cases : sans eux, on ne sait plus dans
    // quelle colonne de jour on signe.
    if (i > 0) {
      c.page.drawLine({
        start: { x, y: c.y },
        end: { x, y: c.y - hauteur },
        thickness: 0.5,
        color: GRIS_CLAIR,
      });
    }
    const v = valeurs[i];
    if (v) {
      const f = police ?? c.normale;
      let texte = surWinAnsi(v);
      // Un nom trop long est coupé plutôt que débordé sur la case voisine.
      while (f.widthOfTextAtSize(texte, taille) > col.largeur - 7 && texte.length > 4) {
        texte = texte.slice(0, -2);
      }
      const l = f.widthOfTextAtSize(texte, taille);
      c.page.drawText(texte, {
        x: col.centre ? x + (col.largeur - l) / 2 : x + 4,
        y: c.y - hauteur + (hauteur - taille) / 2 + 1.5,
        size: taille,
        font: f,
        color: ENCRE,
      });
    }
    x += col.largeur;
  });
  c.page.drawLine({
    start: { x: MARGE, y: c.y - hauteur },
    end: { x: A4.largeur - MARGE, y: c.y - hauteur },
    thickness: 0.5,
    color: GRIS_CLAIR,
  });
  c.espace(hauteur);
}

/** Bandeau de section à l'intérieur d'un tableau (une paroisse, un groupe). */
function bandeSection(c: Composeur, texte: string, droite?: string) {
  const h = 18;
  c.page.drawRectangle({ x: MARGE, y: c.y - h, width: UTILE, height: h, color: BANDE });
  c.page.drawText(surWinAnsi(texte), {
    x: MARGE + 5,
    y: c.y - 12.5,
    size: 8.5,
    font: c.grasse,
    color: FSY_SOMBRE,
  });
  if (droite) {
    const l = c.normale.widthOfTextAtSize(surWinAnsi(droite), 8);
    c.page.drawText(surWinAnsi(droite), {
      x: A4.largeur - MARGE - l - 5,
      y: c.y - 12.5,
      size: 8,
      font: c.normale,
      color: GRIS,
    });
  }
  c.espace(h);
}

function pied(c: Composeur, titre: string) {
  const pages = c.doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(surWinAnsi(`${CONFERENCE.nom} — ${titre} · document confidentiel`), {
      x: MARGE,
      y: 28,
      size: 7,
      font: c.normale,
      color: GRIS,
    });
    const n = `page ${i + 1} sur ${pages.length}`;
    page.drawText(n, {
      x: A4.largeur - MARGE - c.normale.widthOfTextAtSize(n, 7),
      y: 28,
      size: 7,
      font: c.normale,
      color: GRIS,
    });
  });
}

const horodatage = () =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Abidjan",
  }).format(new Date());

// ════════════════════════════════════════════════════════════════════════════
//  1. Émargement par pieu et par paroisse
// ════════════════════════════════════════════════════════════════════════════

export async function genererEmargementPdf(
  editeur: { prenom: string; nom: string },
  { presentsSeulement = false }: { presentsSeulement?: boolean } = {}
): Promise<{ octets: Uint8Array; nomFichier: string; nbJeunes: number }> {
  const [pieux, jours, arrives] = await Promise.all([
    prisma.pieu.findMany({
      orderBy: { nom: "asc" },
      select: {
        nom: true,
        jeunes: {
          where: { statutInscription: { not: STATUT_ANNULE } },
          orderBy: [{ nom: "asc" }, { prenom: "asc" }],
          select: {
            id: true,
            prenom: true,
            nom: true,
            sexe: true,
            paroisse: true,
            presenceManuelle: true,
            absenceConstatee: true,
          },
        },
      },
    }),
    journeesDe(1),
    prisma.mouvement.findMany({
      where: { type: "ARRIVEE" },
      select: { jeuneId: true },
      distinct: ["jeuneId"],
    }),
  ]);
  const pointes = new Set(arrives.map((a) => a.jeuneId));
  const estPresent = (j: { id: string; presenceManuelle: boolean; absenceConstatee: boolean }) =>
    (pointes.has(j.id) || j.presenceManuelle) && !j.absenceConstatee;

  const largeurJour = (UTILE - 26 - 176 - 26) / jours.length;
  const colonnes: Colonne[] = [
    { titre: "N°", largeur: 26, centre: true },
    { titre: "Nom et prénoms", largeur: 176 },
    { titre: "F/G", largeur: 26, centre: true },
    ...jours.map((j) => ({
      titre: `${j.libelle}\n${j.date}`,
      largeur: largeurJour,
      centre: true,
    })),
  ];

  const c = new Composeur();
  await c.initialiser();
  let total = 0;

  for (const [index, pieu] of pieux.entries()) {
    const jeunes = presentsSeulement ? pieu.jeunes.filter(estPresent) : pieu.jeunes;
    // Une page par pieu : la feuille part avec le responsable du pieu, elle ne
    // doit pas porter le nom d'enfants d'ailleurs.
    if (index > 0) c.nouvellePage();

    await enTeteDocument(
      c,
      `Émargement — ${pieu.nom}`,
      `${CONFERENCE.nom} · ${majuscule(CONFERENCE.duAuComplet)}`
    );
    c.paragraphe(
      `${jeunes.length} jeune(s) ${presentsSeulement ? "signalés présents" : "attendus"} · ` +
        `Une signature ou une croix par jour et par jeune. Les lignes vides sont là pour ceux qui ` +
        `sont arrivés sans figurer sur la liste : écrivez leur nom dans leur paroisse. ` +
        `Édité le ${horodatage()} par ${editeur.prenom} ${editeur.nom}.`,
      { police: c.oblique, taille: 8, couleur: GRIS }
    );
    c.espace(8);

    // Une même page peut porter plusieurs paroisses ; l'en-tête revient à
    // chaque page, sinon on ne sait plus quelle colonne est quel jour.
    const paroisses = [...new Set(jeunes.map((j) => j.paroisse ?? "Paroisse non précisée"))].sort(
      (a, b) => a.localeCompare(b, "fr")
    );
    enTeteTableau(c, colonnes);
    let numero = 0;

    const placer = (hauteur: number) => {
      if (c.y - hauteur < PIED) {
        c.nouvellePage();
        enTeteTableau(c, colonnes);
      }
    };

    for (const paroisse of paroisses) {
      const dedans = jeunes.filter((j) => (j.paroisse ?? "Paroisse non précisée") === paroisse);
      placer(18 + 21);
      bandeSection(c, paroisse, `${dedans.length} inscrit(s)`);
      for (const j of dedans) {
        placer(21);
        numero++;
        ligneTableau(c, colonnes, [
          String(numero),
          `${j.prenom} ${j.nom}`,
          j.sexe === "F" ? "F" : "G",
          ...jours.map(() => null),
        ]);
      }
      for (let i = 0; i < BLANCS_PAR_PAROISSE; i++) {
        placer(21);
        numero++;
        ligneTableau(c, colonnes, [String(numero), null, null, ...jours.map(() => null)]);
      }
    }

    // Une paroisse dont personne n'était inscrit : elle n'a pas de bandeau
    // au-dessus, il lui faut donc de la place à la fin.
    placer(18 + 21);
    bandeSection(c, "Autre paroisse — à préciser à côté du nom", "arrivés hors liste");
    for (let i = 0; i < BLANCS_PAR_PIEU; i++) {
      placer(21);
      numero++;
      ligneTableau(c, colonnes, [String(numero), null, null, ...jours.map(() => null)]);
    }

    // Les totaux du jour, écrits à la main au bas de la feuille : c'est ce
    // chiffre-là qu'on remonte le soir.
    placer(24);
    ligneTableau(
      c,
      colonnes,
      ["", "TOTAL ÉMARGÉ CE JOUR →", "", ...jours.map(() => null)],
      { hauteur: 24, police: c.grasse, fond: BANDE, taille: 8.5 }
    );
    c.espace(10);
    c.paragraphe(
      `Feuille remise à : ______________________________     Signature du responsable de pieu : ______________________________`,
      { taille: 8, couleur: GRIS }
    );
    total += jeunes.length;
  }

  pied(c, "émargement par pieu");
  return {
    octets: await c.doc.save(),
    nomFichier: `FSY2026-emargement-par-pieu${presentsSeulement ? "-presents" : ""}.pdf`,
    nbJeunes: total,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  2. Effectifs des repas — tout le monde, d'une seule numérotation
// ════════════════════════════════════════════════════════════════════════════

export async function genererEffectifsRepasPdf(editeur: {
  prenom: string;
  nom: string;
}): Promise<{ octets: Uint8Array; nomFichier: string; total: number }> {
  const [pieux, jours, encadrants, auteurs] = await Promise.all([
    prisma.pieu.findMany({
      orderBy: { nom: "asc" },
      select: {
        nom: true,
        jeunes: {
          where: { statutInscription: { not: STATUT_ANNULE } },
          orderBy: [{ paroisse: "asc" }, { nom: "asc" }, { prenom: "asc" }],
          select: { prenom: true, nom: true, paroisse: true },
        },
      },
    }),
    // La veille compte : les encadrants étaient là et ont mangé.
    journeesDe(0),
    prisma.user.findMany({
      where: { valide: true },
      orderBy: [{ role: "asc" }, { nom: "asc" }],
      select: { id: true, prenom: true, nom: true, role: true, actif: true },
    }),
    prisma.rapportQuotidien.findMany({ select: { auteurId: true }, distinct: ["auteurId"] }),
  ]);
  const aRemisUnRapport = new Set(auteurs.map((a) => a.auteurId));
  // « Présent » se lit de deux façons, et l'une rattrape l'autre : marqué
  // présent dans l'application, ou ayant remis un rapport — on ne remet pas de
  // rapport depuis chez soi.
  const presents = encadrants.filter((e) => e.actif || aRemisUnRapport.has(e.id));

  const largeurJour = (UTILE - 28 - 168 - 104) / jours.length;
  const colonnes: Colonne[] = [
    { titre: "N°", largeur: 28, centre: true },
    { titre: "Nom et prénoms", largeur: 168 },
    { titre: "Provenance", largeur: 104 },
    ...jours.map((j) => ({ titre: `${j.libelle}\n${j.date}`, largeur: largeurJour, centre: true })),
  ];

  const c = new Composeur();
  await c.initialiser();

  await enTeteDocument(
    c,
    "Effectifs des repas",
    `${CONFERENCE.nom} · ${majuscule(CONFERENCE.duAuComplet)}`
  );
  c.paragraphe(
    `Toutes les personnes nourries pendant la conférence, d'une seule numérotation continue : ` +
      `jeunes, encadrants, puis toute personne servie sur place. Une croix par repas pris. ` +
      `Le dernier numéro rempli donne le nombre total de personnes — il n'y a rien à compter. ` +
      `Lieu : ${LIEU.nom}. Édité le ${horodatage()} par ${editeur.prenom} ${editeur.nom}.`,
    { police: c.oblique, taille: 8, couleur: GRIS }
  );
  c.espace(8);

  enTeteTableau(c, colonnes);
  const placer = (hauteur: number) => {
    if (c.y - hauteur < PIED) {
      c.nouvellePage();
      enTeteTableau(c, colonnes);
    }
  };

  let numero = 0;
  const ligne = (nom: string | null, provenance: string | null) => {
    placer(19);
    numero++;
    ligneTableau(c, colonnes, [String(numero), nom, provenance, ...jours.map(() => null)], {
      hauteur: 19,
      taille: 8.5,
    });
  };

  // ---------- Les jeunes ----------
  placer(18 + 19);
  bandeSection(c, "JEUNES");
  const debutJeunes = numero + 1;
  for (const pieu of pieux) {
    if (pieu.jeunes.length === 0) continue;
    placer(18 + 19);
    bandeSection(c, pieu.nom, `${pieu.jeunes.length} jeune(s)`);
    for (const j of pieu.jeunes) ligne(`${j.prenom} ${j.nom}`, j.paroisse ?? "—");
  }
  const finJeunes = numero;

  // ---------- Les encadrants ----------
  placer(18 + 19);
  bandeSection(c, "ENCADRANTS PRÉSENTS", `${presents.length} personne(s)`);
  const debutEncadrants = numero + 1;
  const libelleRole: Record<string, string> = {
    DIRIGEANT: "Couple dirigeant",
    COORDINATEUR: "Coord. principal",
    ADJOINT: "Coord. adjoint",
    CONSEILLER: "Conseiller",
  };
  for (const e of presents) ligne(`${e.prenom} ${e.nom}`, libelleRole[e.role] ?? e.role);
  // De la place pour les encadrants que l'application ne connaît pas encore.
  for (let i = 0; i < 12; i++) ligne(null, null);
  const finEncadrants = numero;

  // ---------- Tous les autres ----------
  placer(18 + 19);
  bandeSection(
    c,
    "AUTRES PERSONNES NOURRIES",
    "sono, cuisine, chauffeurs, sécurité, visiteurs, invités"
  );
  const debutAutres = numero + 1;
  for (let i = 0; i < BLANCS_AUTRES; i++) ligne(null, null);
  const finAutres = numero;

  // ---------- Récapitulatif ----------
  c.nouvellePage();
  await enTeteDocument(
    c,
    "Effectifs des repas — récapitulatif",
    `${CONFERENCE.nom} · à remplir au terme du service`
  );
  c.paragraphe(
    "Reportez ici, jour par jour, le nombre de croix de chaque section. Le total de la dernière " +
      "colonne est le nombre de repas servis ce jour-là ; le nombre de personnes nourries au " +
      "total est le dernier numéro rempli dans les pages précédentes.",
    { taille: 9, couleur: GRIS }
  );
  c.espace(10);

  const largeurRecap = (UTILE - 150) / jours.length;
  const colonnesRecap: Colonne[] = [
    { titre: "", largeur: 150 },
    ...jours.map((j) => ({ titre: `${j.libelle}\n${j.date}`, largeur: largeurRecap, centre: true })),
  ];
  enTeteTableau(c, colonnesRecap, 26);
  for (const intitule of [
    `Jeunes (n° ${debutJeunes} à ${finJeunes})`,
    `Encadrants (n° ${debutEncadrants} à ${finEncadrants})`,
    `Autres (n° ${debutAutres} à ${finAutres})`,
  ]) {
    ligneTableau(c, colonnesRecap, [intitule, ...jours.map(() => null)], { hauteur: 30, taille: 9 });
  }
  ligneTableau(c, colonnesRecap, ["TOTAL DES REPAS SERVIS", ...jours.map(() => null)], {
    hauteur: 34,
    police: c.grasse,
    fond: BANDE,
    taille: 10,
  });

  c.espace(16);
  c.paragraphe(
    `Numérotation imprimée : ${debutJeunes} à ${finAutres}. Le dernier numéro effectivement ` +
      `rempli est le nombre de personnes nourries.`,
    { police: c.grasse, taille: 9.5, couleur: FSY_SOMBRE }
  );
  c.espace(6);
  c.paragraphe(
    `Jeunes attendus imprimés : ${finJeunes}. Encadrants connus présents : ${presents.length} ` +
      `(marqués présents dans l'application ou ayant remis un rapport quotidien), ` +
      `plus 12 lignes libres. Lignes libres pour les autres personnes : ${BLANCS_AUTRES}.`,
    { taille: 8.5, couleur: GRIS }
  );
  c.espace(10);
  c.page.drawRectangle({
    x: MARGE,
    y: c.y - 46,
    width: UTILE,
    height: 46,
    borderColor: GRIS_CLAIR,
    borderWidth: 1,
  });
  c.page.drawText(surWinAnsi("Établi par : ________________________________"), {
    x: MARGE + 12,
    y: c.y - 20,
    size: 9,
    font: c.normale,
    color: ENCRE,
  });
  c.page.drawText(surWinAnsi("Visa du couple dirigeant : ________________________________"), {
    x: MARGE + 12,
    y: c.y - 36,
    size: 9,
    font: c.normale,
    color: ENCRE,
  });
  c.espace(56);
  c.paragraphe(
    "Ce document nomme des mineurs. Il reste dans le cadre du service des repas de cette " +
      "conférence et se détruit à la fin.",
    { police: c.oblique, taille: 8, couleur: GRIS }
  );

  pied(c, "effectifs des repas");
  return {
    octets: await c.doc.save(),
    nomFichier: "FSY2026-effectifs-repas.pdf",
    total: finAutres,
  };
}
