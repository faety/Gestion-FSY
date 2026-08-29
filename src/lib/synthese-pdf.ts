// Rapport final de la conférence en PDF — réservé au couple dirigeant et aux
// coordinateurs principaux.
//
// C'est le « rapport historique » que le manuel demande de transmettre au
// couple consultant de l'interrégion le dernier jour : ce qui a bien et moins
// bien fonctionné, l'état du centre, et les conseils aux prochains comités.
// Le document est composé au moment du téléchargement, depuis les mêmes
// rapports quotidiens que la page /rapports/final : les deux ne peuvent pas
// se contredire.
import { rgb } from "pdf-lib";
import { prisma } from "./db";
import { CONFERENCE, LIEU } from "./theme";
import { A4, Composeur, ENCRE, FSY, FSY_SOMBRE, GRIS, MARGE, enTeteDocument, majuscule, surWinAnsi } from "./pdf";
import { construireSynthese, type Comptage } from "./synthese";
import { libelleJour } from "./rapports";
import { signatureDuCouple } from "./couple";

const BLANC = rgb(1, 1, 1);
const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long" });

export async function genererRapportFinalPdf(editeur: {
  prenom: string;
  nom: string;
}): Promise<{ octets: Uint8Array; nomFichier: string }> {
  const [rapports, journees, nbEncadrants, signature] = await Promise.all([
    prisma.rapportQuotidien.findMany({
      orderBy: [{ jour: "asc" }, { createdAt: "asc" }],
      include: {
        auteur: { select: { id: true, prenom: true, nom: true, role: true } },
        photos: { select: { id: true, publicId: true, image: true } },
      },
    }),
    prisma.journeeConference.findMany({
      orderBy: { numero: "asc" },
      select: { numero: true, date: true },
    }),
    prisma.user.count({ where: { actif: true } }),
    signatureDuCouple(),
  ]);
  const s = construireSynthese(rapports, journees, nbEncadrants);

  const c = new Composeur();
  await c.initialiser();

  await enTeteDocument(
    c,
    "Rapport final — FSY 2026 Abidjan Ouest",
    `${majuscule(CONFERENCE.duAuAvecVeille)} · ${LIEU.nom}, ${LIEU.villePays}`
  );

  const maintenant = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Abidjan",
  }).format(new Date());
  c.paragraphe(
    `Rapport historique de la conférence, destiné au soixante-dix d'interrégion et au couple consultant. ` +
      `Édité le ${maintenant} par ${editeur.prenom} ${editeur.nom}, à partir des ${s.nbRapports} rapports quotidiens ` +
      `remis dans l'application par ${s.nbAuteurs} encadrants (sur ${s.nbEncadrants}).`,
    { police: c.oblique, taille: 8.5, couleur: GRIS }
  );
  c.espace(6);

  // ---------- Aides à la composition ----------
  const section = (titre: string) => {
    c.reserver(46);
    c.espace(10);
    c.page.drawRectangle({
      x: MARGE,
      y: c.y - 20,
      width: A4.largeur - 2 * MARGE,
      height: 20,
      color: FSY,
    });
    c.page.drawText(surWinAnsi(titre), {
      x: MARGE + 8,
      y: c.y - 14,
      size: 10.5,
      font: c.grasse,
      color: BLANC,
    });
    c.espace(26);
  };
  const sousTitre = (t: string) => {
    c.reserver(24);
    c.espace(4);
    c.paragraphe(t, { police: c.grasse, taille: 9.5, couleur: FSY_SOMBRE });
  };
  const puces = (lignes: string[]) => {
    for (const l of lignes) {
      c.paragraphe(`•  ${l}`, { x: MARGE + 4, largeur: A4.largeur - 2 * MARGE - 4 });
    }
  };
  const comptage = (titre: string, donnees: Comptage[]) => {
    if (donnees.length === 0) return;
    sousTitre(titre);
    puces(donnees.map((d) => `${d.label} : ${d.nombre}`));
  };

  // ---------- Vue d'ensemble ----------
  section("Vue d'ensemble");
  puces([
    `${s.nbRapports} rapports quotidiens remis par ${s.nbAuteurs} encadrants sur ${s.nbEncadrants}.`,
    ...(s.ambianceMoyenne !== null
      ? [`Ambiance moyenne déclarée : ${s.ambianceMoyenne.toFixed(1)} sur 5.`]
      : []),
    ...s.parRole
      .filter((r) => r.remis > 0)
      .map((r) => `${r.label} : ${r.remis} rapport(s), ${r.auteurs} personne(s).`),
  ]);
  sousTitre("Remise des rapports, jour par jour");
  puces(
    s.parJour.map(
      (j) =>
        `${j.libelle} (${fmtDate.format(j.date)}) : ${j.remis}/${j.attendus} rapports` +
        (j.moyenneAmbiance !== null ? ` — ambiance ${j.moyenneAmbiance.toFixed(1)}/5` : "")
    )
  );

  // ---------- Effectifs ----------
  if (s.appels.length > 0) {
    section("Appels des présents");
    c.paragraphe(
      "Effectifs comptés et rapportés par la chaîne d'appel ; chaque total ne vaut que pour les rapports remis, dont le nombre est donné.",
      { police: c.oblique, taille: 8.5, couleur: GRIS }
    );
    c.espace(2);
    puces(
      s.appels.map((a) => {
        const morceaux = [
          ...(a.soir.rapports > 0
            ? [`soir : ${a.soir.total} jeunes comptés par ${a.soir.rapports} conseiller(s)`]
            : []),
          ...(a.midi.rapports > 0
            ? [`${a.depart ? "départ" : "midi"} : ${a.midi.total} par ${a.midi.rapports} conseiller(s)`]
            : []),
          ...(a.perimetresAdjoints.rapports > 0
            ? [`périmètres des adjoints : ${a.perimetresAdjoints.total} sur ${a.perimetresAdjoints.rapports} rapport(s)`]
            : []),
        ];
        return `${a.libelle} — ${morceaux.join(" ; ")}`;
      })
    );
  }

  // ---------- Le centre ----------
  section("État du centre et intendance");
  const renseignes = s.intendance.filter((i) => i.souci > 0 || i.ok > 0);
  if (renseignes.length === 0) {
    c.paragraphe("Aucun point d'intendance renseigné.", { police: c.oblique, couleur: GRIS });
  } else {
    puces(
      renseignes.map(
        (i) =>
          `${i.point} : ${i.souci} signalement(s) de souci, ${i.ok} fois « ça va »` +
          (i.jours.length > 0 ? ` (${i.jours.join(", ")})` : "")
      )
    );
  }

  // ---------- La conférence au quotidien ----------
  const vieRenseignee =
    [s.incidents, s.sante, s.participation, s.devotions, s.coordination, s.etatEquipe].some(
      (d) => d.length > 0
    ) || s.demandesAide.length > 0;
  if (vieRenseignee) section("Vie de la conférence");
  comptage("Incidents relevés", s.incidents);
  comptage("Santé et bien-être", s.sante);
  comptage("Participation des jeunes", s.participation);
  comptage("Vie spirituelle", s.devotions);
  comptage("Coordination de l'encadrement", s.coordination);
  comptage("État des équipes", s.etatEquipe);
  if (s.demandesAide.length > 0) {
    sousTitre("Demandes d'aide");
    puces(
      s.demandesAide.map(
        (d) => `${libelleJour(d.jour)} — ${d.auteur} (${d.role}) : ${d.detail || "sans précision"}`
      )
    );
  }

  // ---------- Ce qui a bien et moins bien fonctionné ----------
  if (s.verbatim.length > 0) {
    section("Ce qui a bien et moins bien fonctionné");
    for (const v of s.verbatim) {
      sousTitre(`${v.libelle} — ${fmtDate.format(v.date)}`);
      if (v.aMarche.length > 0) {
        c.paragraphe("A bien fonctionné :", { taille: 9, couleur: GRIS });
        puces(v.aMarche.map((x) => `${x.texte} (${x.auteur})`));
      }
      if (v.aAmeliorer.length > 0) {
        c.paragraphe("À améliorer :", { taille: 9, couleur: GRIS });
        puces(v.aAmeliorer.map((x) => `${x.texte} (${x.auteur})`));
      }
    }
  }

  // ---------- Signalements et arbitrages ----------
  if (s.absences.length > 0 || s.decisions.length > 0 || s.temoignages.length > 0 || s.bilans.length > 0) {
    section("Faits marquants, décisions et signalements");
    if (s.temoignages.length > 0) {
      sousTitre("Moments marquants");
      puces(s.temoignages.map((t) => `${libelleJour(t.jour)} — ${t.auteur} : ${t.texte}`));
    }
    if (s.bilans.length > 0) {
      sousTitre("Impressions générales, recueillies au départ");
      puces(s.bilans.map((t) => `${t.auteur} (${t.role}) : ${t.texte}`));
    }
    if (s.decisions.length > 0) {
      sousTitre("Décisions et arbitrages");
      puces(s.decisions.map((d) => `${libelleJour(d.jour)} — ${d.type} (${d.auteur}) : ${d.texte}`));
    }
    if (s.absences.length > 0) {
      sousTitre("Absences signalées");
      puces(s.absences.map((a) => `${libelleJour(a.jour)} — ${a.quoi} (${a.auteur}) : ${a.texte}`));
    }
  }

  // ---------- Conseils aux prochains comités ----------
  section("Conseils pour les prochains comités");
  if (s.conseils.length === 0) {
    c.paragraphe(
      "Aucun conseil consigné pour l'instant — la question figure au rapport quotidien des coordinateurs principaux et du couple dirigeant.",
      { police: c.oblique, couleur: GRIS }
    );
  } else {
    puces(s.conseils.map((x) => `${x.texte} (${libelleJour(x.jour)}, ${x.auteur})`));
  }

  if (s.photos.length > 0) {
    c.espace(6);
    c.paragraphe(
      `${s.photos.length} photo(s) jointes aux rapports quotidiens, consultables dans l'application.`,
      { police: c.oblique, taille: 8.5, couleur: GRIS }
    );
  }

  // ---------- Signature ----------
  c.reserver(70);
  c.espace(18);
  const dateSignature = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Africa/Abidjan",
  }).format(new Date());
  c.paragraphe(`Fait à ${LIEU.ville}, le ${dateSignature}.`, { taille: 9.5, couleur: ENCRE });
  c.espace(4);
  c.paragraphe("Pour le couple dirigeant de la conférence,", { taille: 9.5, couleur: ENCRE });
  c.paragraphe(signature, { police: c.grasse, taille: 11, couleur: FSY_SOMBRE });

  // ---------- Pied de page ----------
  const pages = c.doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(surWinAnsi(`Rapport final FSY 2026 Abidjan Ouest — page ${i + 1} / ${pages.length}`), {
      x: MARGE,
      y: 30,
      size: 7.5,
      font: c.normale,
      color: GRIS,
    });
  });

  return {
    octets: await c.doc.save(),
    nomFichier: "rapport-final-fsy-2026.pdf",
  };
}
