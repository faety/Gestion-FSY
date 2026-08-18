// Le document remis au fournisseur des repas.
//
// Il sort de l'application pour aller chez quelqu'un d'extérieur à la
// conférence : il ne contient donc que ce qui sert à préparer et à servir un
// plat — pas un mot de médical, pas une date de naissance, pas un numéro de
// téléphone de famille. La cuisine a besoin de savoir combien de plats adapter
// et à qui les remettre ; le reste ne la regarde pas.
//
// Deux lectures dans un seul document :
//   • le tableau des quantités, pour préparer ;
//   • la liste nominative, pour servir le bon plat à la bonne personne — une
//     assiette sans arachide ne sert à rien si l'on ignore devant qui la poser.
import { rgb } from "pdf-lib";
import { prisma } from "./db";
import { CONFERENCE, LIEU } from "./theme";
import { estAnnule } from "./criteres";
import { signatureDuCouple } from "./couple";
import { comptesParEviction, lignesRepas, type LigneRepas } from "./repas";
import {
  A4,
  Composeur,
  ENCRE,
  FSY,
  FSY_SOMBRE,
  GRIS,
  GRIS_CLAIR,
  MARGE,
  ROUGE,
  enTeteDocument,
  majuscule,
  surWinAnsi,
} from "./pdf";

const BLANC = rgb(1, 1, 1);
const LARGEUR_UTILE = A4.largeur - 2 * MARGE;

export async function genererRapportRepasPdf(editeur: {
  prenom: string;
  nom: string;
}): Promise<{ octets: Uint8Array; nomFichier: string; nbConcernes: number }> {
  const [jeunes, total, signature] = await Promise.all([
    prisma.jeune.findMany({
      where: { OR: [{ medical: { not: null } }, { alimentaire: { not: null } }] },
      select: {
        id: true,
        prenom: true,
        nom: true,
        sexe: true,
        medical: true,
        alimentaire: true,
        statutInscription: true,
        groupe: { select: { nom: true, compagnie: { select: { nom: true } } } },
      },
    }),
    prisma.jeune.count({ where: { statutInscription: { not: "Annulé(e)" } } }),
    signatureDuCouple(),
  ]);

  // Les inscriptions annulées ne comptent pas : faire préparer un plat pour
  // quelqu'un qui ne vient pas, c'est un plat de moins pour un autre.
  const lignes = lignesRepas(jeunes.filter((j) => !estAnnule(j.statutInscription)));
  const comptes = comptesParEviction(lignes);
  const aLire = lignes.filter((l) => l.aLire);

  const c = new Composeur();
  await c.initialiser();

  await enTeteDocument(
    c,
    "Repas — allergies et régimes",
    `${CONFERENCE.nom} · ${majuscule(CONFERENCE.duAuComplet)}`
  );

  const maintenant = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Abidjan",
  }).format(new Date());

  c.paragraphe(
    `Document destiné au fournisseur des repas de la conférence, établi le ${maintenant} ` +
      `par ${editeur.prenom} ${editeur.nom}. Lieu de service : ${LIEU.nom}, ${LIEU.villePays}. ` +
      `${total} jeunes attendus, dont ${lignes.length} demandent un repas adapté.`,
    { police: c.oblique, taille: 8.5, couleur: GRIS }
  );

  // ---------- Aides à la composition ----------
  const section = (titre: string) => {
    c.reserver(52);
    c.espace(12);
    c.page.drawRectangle({ x: MARGE, y: c.y - 20, width: LARGEUR_UTILE, height: 20, color: FSY });
    c.page.drawText(surWinAnsi(titre), {
      x: MARGE + 8,
      y: c.y - 14,
      size: 10.5,
      font: c.grasse,
      color: BLANC,
    });
    c.espace(26);
  };

  const encadre = (titre: string, texte: string, couleur = ROUGE) => {
    const lignesTexte = c.decouper(surWinAnsi(texte), c.normale, 9, LARGEUR_UTILE - 20);
    const hauteur = 22 + lignesTexte.length * 12;
    c.reserver(hauteur + 8);
    c.espace(6);
    c.page.drawRectangle({
      x: MARGE,
      y: c.y - hauteur,
      width: LARGEUR_UTILE,
      height: hauteur,
      borderColor: couleur,
      borderWidth: 1,
      color: rgb(1, 0.97, 0.97),
    });
    c.page.drawText(surWinAnsi(titre), {
      x: MARGE + 10,
      y: c.y - 15,
      size: 9.5,
      font: c.grasse,
      color: couleur,
    });
    let yy = c.y - 29;
    for (const l of lignesTexte) {
      c.page.drawText(l, { x: MARGE + 10, y: yy, size: 9, font: c.normale, color: ENCRE });
      yy -= 12;
    }
    c.espace(hauteur + 4);
  };

  // ════════ Ce qu'il faut prévoir ════════
  section("Ce qu'il faut prévoir à chaque service");

  if (comptes.length === 0 && lignes.length === 0) {
    c.paragraphe(
      "Aucun régime particulier n'est déclaré à ce jour. Ce document sera réédité si une " +
        "inscription change avant la conférence.",
      { taille: 9.5 }
    );
  }

  for (const e of comptes) {
    const lignesConsigne = c.decouper(
      surWinAnsi(e.consigne),
      c.normale,
      8.5,
      LARGEUR_UTILE - 118
    );
    const hauteur = Math.max(26, 14 + lignesConsigne.length * 10.5);
    c.reserver(hauteur + 4);
    c.page.drawRectangle({
      x: MARGE,
      y: c.y - hauteur,
      width: LARGEUR_UTILE,
      height: hauteur,
      color: rgb(0.97, 0.98, 1),
    });
    // Le nombre d'abord : c'est ce que la cuisine cherche du regard.
    c.page.drawText(`${e.nombre}`, {
      x: MARGE + 10,
      y: c.y - 19,
      size: 15,
      font: c.grasse,
      color: FSY_SOMBRE,
    });
    c.page.drawText(surWinAnsi(e.allergie ? `${e.titre}  (allergie déclarée)` : e.titre), {
      x: MARGE + 44,
      y: c.y - 15,
      size: 9.5,
      font: c.grasse,
      color: e.allergie ? ROUGE : ENCRE,
    });
    let yy = c.y - 26;
    for (const l of lignesConsigne) {
      c.page.drawText(l, { x: MARGE + 44, y: yy, size: 8.5, font: c.normale, color: GRIS });
      yy -= 10.5;
    }
    c.espace(hauteur + 4);
  }

  if (comptes.length > 0) {
    c.espace(4);
    c.paragraphe(
      "Un même jeune peut figurer sur deux lignes : les nombres ci-dessus ne s'additionnent pas. " +
        `Au total, ${lignes.length} repas sont à adapter à chaque service.`,
      { police: c.oblique, taille: 8.5, couleur: GRIS }
    );
  }

  if (comptes.some((e) => e.allergie)) {
    encadre(
      "Allergies — le contact suffit",
      "Les lignes marquées « allergie » ne sont pas des préférences. Une trace laissée par un " +
        "ustensile, une planche ou un bain de friture peut provoquer une réaction grave en " +
        "quelques minutes. Préparer ces plats en premier, avec du matériel propre, et les " +
        "couvrir et nommer dès la sortie de cuisine."
    );
  }

  // ════════ La liste nominative ════════
  if (lignes.length > 0) {
    section("À qui remettre ces plats");
    c.paragraphe(
      "Chaque assiette adaptée doit trouver la bonne personne. Les jeunes sont répartis en " +
        "compagnies, qui passent au réfectoire par groupes : la compagnie est indiquée pour que " +
        "le plat parte avec le bon service.",
      { taille: 9, couleur: GRIS }
    );
    c.espace(6);
    tableau(c, lignes);
  }

  // ════════ Ce qui reste à lire ════════
  if (aLire.length > 0) {
    section("Déclarations à lire avant le premier service");
    c.paragraphe(
      "Ces familles ont écrit quelque chose que le classement automatique n'a pas reconnu. " +
        "Rien n'est écarté : la conférence en parlera avec le fournisseur avant le premier repas.",
      { police: c.oblique, taille: 8.5, couleur: GRIS }
    );
    c.espace(4);
    for (const l of aLire) {
      // Une allergie à un aliment que la liste ne connaît pas reste une
      // allergie : elle garde le rouge, même ici.
      c.paragraphe(`•  ${l.nom}${l.compagnie ? ` (${l.compagnie})` : ""} — « ${l.declaration} »`, {
        taille: 9,
        police: l.allergie ? c.grasse : c.normale,
        couleur: l.allergie ? ROUGE : ENCRE,
        x: MARGE + 4,
        largeur: LARGEUR_UTILE - 4,
      });
    }
  }

  // ════════ Confidentialité et contact ════════
  section("Confidentialité et contact");
  c.paragraphe(
    "Ce document nomme des mineurs et ce qu'ils ne peuvent pas manger. Il est remis au seul " +
      "fournisseur des repas, pour le seul service de cette conférence. Merci de ne pas le " +
      "diffuser au-delà de l'équipe de cuisine, de ne pas l'afficher en salle, et de le " +
      "détruire à la fin de la conférence.",
    { taille: 9 }
  );
  c.espace(6);
  c.paragraphe(
    `Pour toute question, une correction ou un cas ajouté après cette édition : ${signature}, ` +
      `couple dirigeant de la conférence — ${LIEU.nom}, ${LIEU.villePays}.`,
    { taille: 9, police: c.grasse, couleur: FSY_SOMBRE }
  );
  c.espace(4);
  c.paragraphe(
    "Cette liste est établie à partir des déclarations faites par les familles à l'inscription. " +
      "Elle peut évoluer jusqu'au dernier jour : la version qui fait foi est celle de la date " +
      "portée en tête.",
    { police: c.oblique, taille: 8.5, couleur: GRIS }
  );

  numeroterPages(c);

  const octets = await c.doc.save();
  return {
    octets,
    nomFichier: `FSY2026-repas-allergies-et-regimes.pdf`,
    nbConcernes: lignes.length,
  };
}

/** La liste nominative, en colonnes, avec ses en-têtes répétés à chaque page. */
function tableau(c: Composeur, lignes: LigneRepas[]) {
  const colonnes = [
    { titre: "Nom", x: MARGE + 4, largeur: 150 },
    { titre: "Compagnie", x: MARGE + 158, largeur: 92 },
    { titre: "À éviter", x: MARGE + 254, largeur: LARGEUR_UTILE - 258 },
  ];

  const enTete = () => {
    c.reserver(30);
    c.page.drawRectangle({
      x: MARGE,
      y: c.y - 16,
      width: LARGEUR_UTILE,
      height: 16,
      color: FSY_SOMBRE,
    });
    for (const col of colonnes) {
      c.page.drawText(surWinAnsi(col.titre), {
        x: col.x,
        y: c.y - 11.5,
        size: 8.5,
        font: c.grasse,
        color: BLANC,
      });
    }
    c.espace(18);
  };

  enTete();
  let rang = 0;
  for (const l of lignes) {
    const cellules = [
      c.decouper(surWinAnsi(l.nom), c.normale, 8.5, colonnes[0].largeur),
      c.decouper(surWinAnsi(l.compagnie ?? "—"), c.normale, 8.5, colonnes[1].largeur),
      c.decouper(surWinAnsi(l.declaration), c.normale, 8.5, colonnes[2].largeur),
    ];
    const hauteur = Math.max(...cellules.map((x) => x.length)) * 11 + 5;

    // Changement de page : la ligne ne se coupe pas en deux, et l'en-tête
    // revient — une liste d'allergies sans titres de colonnes se relit mal.
    if (c.y - hauteur < 54) {
      c.nouvellePage();
      enTete();
    }
    if (rang % 2 === 1) {
      c.page.drawRectangle({
        x: MARGE,
        y: c.y - hauteur + 2,
        width: LARGEUR_UTILE,
        height: hauteur,
        color: rgb(0.965, 0.975, 0.99),
      });
    }
    // Une allergie se lit en rouge et en gras : même photocopié en noir et
    // blanc, le nom ressort plus sombre que les autres.
    const grave = l.allergie;
    cellules.forEach((textes, i) => {
      let yy = c.y - 9;
      for (const t of textes) {
        c.page.drawText(t, {
          x: colonnes[i].x,
          y: yy,
          size: 8.5,
          font: i === 0 || grave ? c.grasse : c.normale,
          color: grave && i === 2 ? ROUGE : ENCRE,
        });
        yy -= 11;
      }
    });
    c.page.drawLine({
      start: { x: MARGE, y: c.y - hauteur + 1 },
      end: { x: A4.largeur - MARGE, y: c.y - hauteur + 1 },
      thickness: 0.5,
      color: GRIS_CLAIR,
    });
    c.espace(hauteur);
    rang++;
  }
}

/** « page n sur N » en pied de chaque page, et le rappel de ce qu'on tient. */
function numeroterPages(c: Composeur) {
  const pages = c.doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(
      surWinAnsi(`${CONFERENCE.nom} — repas, allergies et régimes · document confidentiel`),
      { x: MARGE, y: 30, size: 7.5, font: c.normale, color: GRIS }
    );
    const n = `page ${i + 1} sur ${pages.length}`;
    page.drawText(n, {
      x: A4.largeur - MARGE - c.normale.widthOfTextAtSize(n, 7.5),
      y: 30,
      size: 7.5,
      font: c.normale,
      color: GRIS,
    });
  });
}
