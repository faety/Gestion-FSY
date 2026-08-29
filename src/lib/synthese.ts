// Synthèse des rapports quotidiens → rapport final de la conférence.
//
// Toute l'agrégation est faite ici, à partir des rapports bruts : la page
// d'affichage et l'export texte partent du même objet, donc ils ne peuvent pas
// se contredire.

import { ROLE_LABELS, type Role } from "./roles";
import { NB_JOURS } from "./theme";
import {
  AMBIANCES,
  POINTS_INTENDANCE,
  SECTIONS,
  ambiance,
  enObjet,
  enTableau,
  enTexte,
  libelleJour,
  libelleJourCourt,
  lireReponses,
} from "./rapports";

export type RapportBrut = {
  id: string;
  jour: number;
  date: Date;
  ambiance: string;
  reponses: string;
  aMarche: string;
  aAmeliorer: string;
  besoinAide: boolean;
  detailAide: string | null;
  points: number;
  auteur: { id: string; prenom: string; nom: string; role: string };
  photos: { id: string; publicId: string | null; image: string | null }[];
};

export type Journee = { numero: number; date: Date };

export type Comptage = { label: string; nombre: number };

const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long" });
const nomComplet = (a: RapportBrut["auteur"]) => `${a.prenom} ${a.nom}`;

// Recense les options cochées pour une question donnée, sur tous les rapports
function compterCases(rapports: RapportBrut[], idQuestion: string): Comptage[] {
  const total = new Map<string, number>();
  for (const r of rapports) {
    for (const o of enTableau(lireReponses(r.reponses)[idQuestion])) {
      total.set(o, (total.get(o) ?? 0) + 1);
    }
  }
  return [...total.entries()]
    .map(([label, nombre]) => ({ label, nombre }))
    .sort((a, b) => b.nombre - a.nombre);
}

function compterChoix(rapports: RapportBrut[], idQuestion: string): Comptage[] {
  const total = new Map<string, number>();
  for (const r of rapports) {
    const v = enTexte(lireReponses(r.reponses)[idQuestion]);
    if (v) total.set(v, (total.get(v) ?? 0) + 1);
  }
  return [...total.entries()]
    .map(([label, nombre]) => ({ label, nombre }))
    .sort((a, b) => b.nombre - a.nombre);
}

export function construireSynthese(
  rapports: RapportBrut[],
  journees: Journee[],
  nbEncadrants: number
) {
  // ---------- Remise des rapports, jour par jour ----------
  const parJour = journees.map((j) => {
    const duJour = rapports.filter((r) => r.jour === j.numero);
    const notes: number[] = duJour.map((r) => ambiance(r.ambiance)?.note ?? 0).filter((n) => n > 0);
    return {
      numero: j.numero,
      date: j.date,
      libelle: libelleJour(j.numero),
      remis: duJour.length,
      attendus: nbEncadrants,
      moyenneAmbiance: notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null,
      rapports: duJour,
    };
  });

  // ---------- Remise par rôle ----------
  const parRole = (["DIRIGEANT", "COORDINATEUR", "ADJOINT", "CONSEILLER"] as Role[]).map(
    (role) => {
      const duRole = rapports.filter((r) => r.auteur.role === role);
      return {
        role,
        label: ROLE_LABELS[role],
        remis: duRole.length,
        auteurs: new Set(duRole.map((r) => r.auteur.id)).size,
      };
    }
  );

  // ---------- Intendance : ce qui a posé problème ----------
  const intendance = POINTS_INTENDANCE.map((point) => {
    let ok = 0;
    let souci = 0;
    const jours = new Set<number>();
    for (const r of rapports) {
      const etat = enObjet(lireReponses(r.reponses).intendance)[point];
      if (etat === "OK") ok++;
      else if (etat === "SOUCI") {
        souci++;
        jours.add(r.jour);
      }
    }
    return {
      point,
      ok,
      souci,
      jours: [...jours].sort((a, b) => a - b).map(libelleJourCourt),
    };
  }).sort((a, b) => b.souci - a.souci);

  // ---------- Appels des présents ----------
  //
  // Les comptes remontés par la chaîne du manuel : les conseillers comptent
  // leur groupe (midi et soir), les adjoints totalisent leur périmètre. On
  // additionne ce qui a été rapporté, en disant sur combien de rapports le
  // total repose — un total sans sa base se lirait comme un effectif complet.
  const nombre = (v: unknown) => {
    const n = Number(enTexte(v));
    return Number.isFinite(n) && n >= 0 && enTexte(v).trim() !== "" ? n : null;
  };
  const sommeDe = (liste: RapportBrut[], cle: string) => {
    let total = 0;
    let rapportsComptes = 0;
    for (const r of liste) {
      const n = nombre(lireReponses(r.reponses)[cle]);
      if (n !== null) {
        total += n;
        rapportsComptes++;
      }
    }
    return { total, rapports: rapportsComptes };
  };
  const appels = journees
    .map((j) => {
      const duJour = rapports.filter((r) => r.jour === j.numero);
      const conseillers = duJour.filter((r) => r.auteur.role === "CONSEILLER");
      const adjoints = duJour.filter((r) => r.auteur.role === "ADJOINT");
      // Le dernier jour n'a ni appel de midi ni appel du soir : son
      // questionnaire est celui du départ, et c'est le compte du départ qui
      // occupe la ligne.
      const depart = j.numero === NB_JOURS;
      return {
        numero: j.numero,
        libelle: libelleJour(j.numero),
        depart,
        midi: sommeDe(conseillers, depart ? "compteDepart" : "appelMidi"),
        soir: sommeDe(conseillers, "appelSoir"),
        perimetresAdjoints: sommeDe(adjoints, depart ? "effectifDepart" : "effectifSoir"),
      };
    })
    .filter((a) => a.midi.rapports + a.soir.rapports + a.perimetresAdjoints.rapports > 0);

  // ---------- Incidents, santé, vie spirituelle ----------
  const incidents = compterCases(rapports, "incidents");
  const sante = compterCases(rapports, "sante");
  const devotions = compterCases(rapports, "devotions");
  const coordination = compterCases(rapports, "coordination");
  const participation = compterChoix(rapports, "participation");
  const etatEquipe = compterChoix(rapports, "etatEquipe");

  // ---------- Demandes d'aide ----------
  const demandesAide = rapports
    .filter((r) => r.besoinAide)
    .map((r) => ({
      jour: r.jour,
      auteur: nomComplet(r.auteur),
      role: ROLE_LABELS[r.auteur.role as Role],
      detail: r.detailAide ?? "",
    }))
    .sort((a, b) => b.jour - a.jour);

  // ---------- Verbatim ----------
  const verbatim = journees
    .map((j) => ({
      numero: j.numero,
      libelle: libelleJour(j.numero),
      date: j.date,
      aMarche: rapports
        .filter((r) => r.jour === j.numero && r.aMarche.trim())
        .map((r) => ({ auteur: nomComplet(r.auteur), role: r.auteur.role, texte: r.aMarche })),
      aAmeliorer: rapports
        .filter((r) => r.jour === j.numero && r.aAmeliorer.trim())
        .map((r) => ({ auteur: nomComplet(r.auteur), role: r.auteur.role, texte: r.aAmeliorer })),
    }))
    .filter((v) => v.aMarche.length > 0 || v.aAmeliorer.length > 0);

  // ---------- Absences signalées ----------
  // Les précisions saisies quand la réponse est « Non » : qui manquait, et pourquoi.
  const absences = rapports
    .flatMap((r) =>
      (
        [
          ["presences", "Jeunes"],
          ["presenceEncadrants", "Encadrants"],
          ["appelsRecus", "Rapports d'appel des conseillers"],
          ["rapportsAdjoints", "Rapports d'appel des adjoints"],
          // Le questionnaire du départ : un « Non » ici est l'alerte la plus
          // grave de la conférence — un jeune non retrouvé au moment des cars.
          ["compteConfirme", "Compte du départ"],
          ["comptesDepartRecus", "Comptes du départ des conseillers"],
        ] as const
      ).map(([cle, quoi]) => ({
        jour: r.jour,
        quoi,
        auteur: nomComplet(r.auteur),
        texte: enTexte(lireReponses(r.reponses)[`${cle}_precision`]),
        signale: enTexte(lireReponses(r.reponses)[cle]) === "Non",
      }))
    )
    .filter((a) => a.signale && a.texte.trim())
    .sort((a, b) => a.jour - b.jour);

  const temoignages = rapports
    .map((r) => ({
      jour: r.jour,
      auteur: nomComplet(r.auteur),
      texte: enTexte(lireReponses(r.reponses).temoignageDetail),
    }))
    .filter((t) => t.texte.trim())
    .sort((a, b) => a.jour - b.jour);

  // Les impressions générales du dernier jour — le questionnaire du départ les
  // recueille pendant qu'elles sont fraîches, le rapport final les restitue.
  const bilans = rapports
    .map((r) => ({
      jour: r.jour,
      auteur: nomComplet(r.auteur),
      role: ROLE_LABELS[r.auteur.role as Role],
      texte: enTexte(lireReponses(r.reponses).bilanConference),
    }))
    .filter((t) => t.texte.trim());

  const decisions = rapports
    .flatMap((r) =>
      (["decisions", "arbitrages"] as const).map((cle) => ({
        jour: r.jour,
        auteur: nomComplet(r.auteur),
        type: cle === "decisions" ? ("Décision" as const) : ("À arbitrer" as const),
        texte: enTexte(lireReponses(r.reponses)[cle]),
      }))
    )
    .filter((d) => d.texte.trim())
    .sort((a, b) => a.jour - b.jour);

  // Conseils aux prochains comités : le manuel les exige dans le rapport
  // historique transmis au couple consultant de l'interrégion.
  const conseils = rapports
    .map((r) => ({
      jour: r.jour,
      auteur: nomComplet(r.auteur),
      texte: enTexte(lireReponses(r.reponses).conseilsFuturs),
    }))
    .filter((c) => c.texte.trim())
    .sort((a, b) => a.jour - b.jour);

  // Les URL d'affichage sont calculées par la page : la synthèse reste
  // indépendante du service de stockage.
  const photos = rapports.flatMap((r) =>
    r.photos.map((p) => ({
      id: p.id,
      publicId: p.publicId,
      image: p.image,
      jour: r.jour,
      auteur: nomComplet(r.auteur),
    }))
  );

  const notesGlobales: number[] = rapports
    .map((r) => ambiance(r.ambiance)?.note ?? 0)
    .filter((n) => n > 0);

  return {
    nbRapports: rapports.length,
    nbAuteurs: new Set(rapports.map((r) => r.auteur.id)).size,
    nbEncadrants,
    ambianceMoyenne:
      notesGlobales.length > 0
        ? notesGlobales.reduce((a, b) => a + b, 0) / notesGlobales.length
        : null,
    repartitionAmbiance: AMBIANCES.map((a) => ({
      ...a,
      nombre: rapports.filter((r) => r.ambiance === a.cle).length,
    })),
    parJour,
    parRole,
    appels,
    intendance,
    incidents,
    sante,
    devotions,
    coordination,
    participation,
    etatEquipe,
    demandesAide,
    absences,
    verbatim,
    temoignages,
    bilans,
    decisions,
    conseils,
    photos,
  };
}

export type Synthese = ReturnType<typeof construireSynthese>;

// ---------- Export texte (Markdown) ----------

export function syntheseEnTexte(s: Synthese, titre: string): string {
  const l: string[] = [];
  const liste = (c: Comptage[]) => c.map((x) => `- ${x.label} : ${x.nombre}`);
  const bloc = (titre: string, lignes: string[]) => {
    if (lignes.length === 0) return;
    l.push(`## ${titre}`, "", ...lignes, "");
  };

  l.push(`# ${titre}`, "");
  l.push(
    `${s.nbRapports} rapports quotidiens remis par ${s.nbAuteurs} encadrants sur ${s.nbEncadrants}.`,
    ""
  );
  if (s.ambianceMoyenne !== null) {
    l.push(`Ambiance moyenne de la conférence : ${s.ambianceMoyenne.toFixed(1)} sur 5.`, "");
  }

  bloc(
    "Remise des rapports, jour par jour",
    s.parJour.map(
      (j) =>
        `- ${j.libelle} (${fmtDate.format(j.date)}) : ${j.remis}/${j.attendus} rapports` +
        (j.moyenneAmbiance !== null
          ? ` — ambiance ${j.moyenneAmbiance.toFixed(1)}/5`
          : "")
    )
  );

  bloc(
    "Remise par niveau de responsabilité",
    s.parRole.filter((r) => r.remis > 0).map((r) => `- ${r.label} : ${r.remis} rapports (${r.auteurs} personnes)`)
  );

  bloc(
    "Appels des présents",
    s.appels.map((a) => {
      const morceaux = [
        ...(a.soir.rapports > 0
          ? [`soir : ${a.soir.total} jeunes comptés par ${a.soir.rapports} conseiller(s)`]
          : []),
        ...(a.midi.rapports > 0
          ? [`${a.depart ? "départ" : "midi"} : ${a.midi.total} par ${a.midi.rapports} conseiller(s)`]
          : []),
        ...(a.perimetresAdjoints.rapports > 0
          ? [
              `périmètres des adjoints : ${a.perimetresAdjoints.total} sur ${a.perimetresAdjoints.rapports} rapport(s)`,
            ]
          : []),
      ];
      return `- ${a.libelle} — ${morceaux.join(" ; ")}`;
    })
  );

  bloc(
    "Intendance et logistique",
    s.intendance
      .filter((i) => i.souci > 0 || i.ok > 0)
      .map(
        (i) =>
          `- ${i.point} : ${i.souci} signalement(s) de souci, ${i.ok} fois « ça va »` +
          (i.jours.length > 0 ? ` (jours ${i.jours.join(", ")})` : "")
      )
  );

  bloc("Incidents relevés", liste(s.incidents));
  bloc("Santé et bien-être", liste(s.sante));
  bloc("Participation des jeunes", liste(s.participation));
  bloc("Vie spirituelle", liste(s.devotions));
  bloc("Coordination de l'encadrement", liste(s.coordination));
  bloc("État des équipes", liste(s.etatEquipe));

  bloc(
    "Demandes d'aide",
    s.demandesAide.map(
      (d) => `- ${libelleJour(d.jour)} — ${d.auteur} (${d.role}) : ${d.detail || "sans précision"}`
    )
  );

  if (s.verbatim.length > 0) {
    l.push("## Ce que les encadrants ont écrit", "");
    for (const v of s.verbatim) {
      l.push(`### ${v.libelle} — ${fmtDate.format(v.date)}`, "");
      if (v.aMarche.length > 0) {
        l.push("**Ce qui a marché**", "");
        l.push(...v.aMarche.map((x) => `- ${x.auteur} : ${x.texte}`), "");
      }
      if (v.aAmeliorer.length > 0) {
        l.push("**Ce qui a moins marché**", "");
        l.push(...v.aAmeliorer.map((x) => `- ${x.auteur} : ${x.texte}`), "");
      }
    }
  }

  bloc(
    "Absences signalées",
    s.absences.map((a) => `- ${libelleJour(a.jour)} — ${a.quoi} (${a.auteur}) : ${a.texte}`)
  );

  bloc(
    "Moments marquants rapportés",
    s.temoignages.map((t) => `- ${libelleJour(t.jour)} — ${t.auteur} : ${t.texte}`)
  );

  bloc(
    "Impressions générales, recueillies au départ",
    s.bilans.map((t) => `- ${t.auteur} (${t.role}) : ${t.texte}`)
  );

  bloc(
    "Décisions et arbitrages",
    s.decisions.map((d) => `- ${libelleJour(d.jour)} — ${d.type} (${d.auteur}) : ${d.texte}`)
  );

  bloc(
    "Conseils pour les prochains comités",
    s.conseils.map((c) => `- ${libelleJour(c.jour)} — ${c.auteur} : ${c.texte}`)
  );

  if (s.photos.length > 0) {
    l.push(
      `_${s.photos.length} photo(s) jointes aux rapports, à consulter dans l'application._`,
      ""
    );
  }

  return l.join("\n");
}

// Questions du modèle absentes de la synthèse : garde-fou pour ne pas oublier
// une question ajoutée au questionnaire sans l'agréger ici.
export const QUESTIONS_AGREGEES = [
  "ambiance",
  "appelMidi",
  "appelSoir",
  "appelsRecus",
  "effectifSoir",
  "rapportsAdjoints",
  "presences",
  "participation",
  "incidents",
  "sante",
  "devotions",
  "temoignage",
  "temoignageDetail",
  "intendance",
  "etatEquipe",
  "presenceEncadrants",
  "coordination",
  "decisions",
  "arbitrages",
  "conseilsFuturs",
];

export const questionsNonAgregees = () =>
  SECTIONS.flatMap((s) => s.questions.map((q) => q.id)).filter(
    (id) => !QUESTIONS_AGREGEES.includes(id)
  );
