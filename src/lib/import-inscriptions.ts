// Lecture du fichier d'inscription, tel qu'il sort du système d'inscription.
//
// Les renseignements médicaux, les contraintes alimentaires et les contacts
// d'urgence ne sont pas versionnés : ils concernent des mineurs, et
// scripts/importer-sensibles.ts les charge depuis data/, un dossier absent du
// dépôt comme du déploiement. Sur la base de production, ils manquent donc — et
// la page Santé reste vide alors que c'est précisément là qu'on les cherche.
//
// Verser le fichier depuis l'application règle cela sans machine, sans accès à
// la base et sans qu'aucun fichier ne soit conservé nulle part : il est lu en
// mémoire, écrit dans la base, et rien n'en subsiste.

import ExcelJS from "exceljs";
import { jetons, proximite } from "./rapprochement";
import { renseignementUtile } from "./renseignements";

const sansAccents = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export type Tableau = { feuille: string; entetes: string[]; lignes: string[][] };

/** Nom de la feuille à préférer : les exports de la conférence l'appellent « Tous ». */
const FEUILLE_PREFEREE = /^(tous|toutes|all|participants|inscriptions)$/i;

export async function lireClasseur(donnees: Buffer, nomFichier: string): Promise<Tableau> {
  if (/\.csv$/i.test(nomFichier)) return lireCsv(donnees.toString("utf-8"));

  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(donnees as unknown as ArrayBuffer);
  const feuilles = classeur.worksheets.filter((f) => f.rowCount > 1);
  if (feuilles.length === 0) throw new Error("Le classeur ne contient aucune feuille remplie.");
  const feuille =
    feuilles.find((f) => FEUILLE_PREFEREE.test(f.name.trim())) ??
    feuilles.reduce((a, b) => (b.rowCount > a.rowCount ? b : a));

  const lignes: string[][] = [];
  feuille.eachRow((rang) => {
    const valeurs: string[] = [];
    rang.eachCell({ includeEmpty: true }, (cellule, i) => {
      valeurs[i - 1] = texteDeCellule(cellule.value);
    });
    lignes.push(valeurs);
  });
  return decouper(feuille.name, lignes);
}

function texteDeCellule(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return String(v.result ?? "");
    if ("richText" in v && Array.isArray(v.richText)) {
      return v.richText.map((r: { text: string }) => r.text).join("");
    }
    if ("hyperlink" in v && "text" in v) return String(v.text ?? "");
  }
  return String(v);
}

function lireCsv(texte: string): Tableau {
  // Séparateur deviné sur la première ligne : les exports français sortent en
  // point-virgule, les anglais en virgule.
  const premiere = texte.split(/\r?\n/, 1)[0] ?? "";
  const sep = (premiere.match(/;/g)?.length ?? 0) > (premiere.match(/,/g)?.length ?? 0) ? ";" : ",";
  const lignes: string[][] = [];
  let champ = "";
  let ligne: string[] = [];
  let entreGuillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') entreGuillemets = false;
      else champ += c;
      continue;
    }
    if (c === '"') entreGuillemets = true;
    else if (c === sep) { ligne.push(champ); champ = ""; }
    else if (c === "\n") { ligne.push(champ); lignes.push(ligne); ligne = []; champ = ""; }
    else if (c !== "\r") champ += c;
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return decouper("CSV", lignes);
}

/**
 * Sépare l'en-tête du contenu.
 *
 * Les exports commencent souvent par un titre, une date d'extraction, une ligne
 * vide : la vraie ligne d'en-tête est la première qui porte au moins trois
 * libellés non vides et pas de nombre isolé.
 */
function decouper(feuille: string, lignes: string[][]): Tableau {
  let debut = 0;
  for (let i = 0; i < Math.min(lignes.length, 20); i++) {
    const remplies = lignes[i].filter((c) => c?.trim()).length;
    if (remplies >= 3) { debut = i; break; }
  }
  const entetes = (lignes[debut] ?? []).map((c) => (c ?? "").trim());
  return {
    feuille,
    entetes,
    lignes: lignes.slice(debut + 1).filter((l) => l.some((c) => c?.trim())),
  };
}

// ---------- Reconnaissance des colonnes ----------

export type Champ =
  | "prenom"
  | "nom"
  | "naissance"
  | "telephone"
  | "email"
  | "medical"
  | "alimentaire"
  | "contactNom"
  | "contactTelephone";

// Chaque champ est reconnu par des mots-clés, du plus caractéristique au moins.
// L'ordre compte : « nom » apparaît aussi dans « prénom », donc les libellés les
// plus spécifiques doivent être essayés d'abord.
const INDICES: { champ: Champ; motifs: RegExp[] }[] = [
  { champ: "contactTelephone", motifs: [/(contact|urgence|parent|tuteur|responsable|emergency|guardian)[^a-z]*(tel|num|phone|mobile|portable)/, /(tel|num|phone)[^a-z]*(contact|urgence|parent|tuteur|emergency)/] },
  { champ: "contactNom", motifs: [/(contact|urgence|parent|tuteur|responsable|emergency|guardian)[^a-z]*(nom|name)/, /^(contact|personne a prevenir|emergency contact)/] },
  { champ: "medical", motifs: [/sante|health|medical|medicale|maladie|traitement|handicap|condition physique|physical/] },
  { champ: "alimentaire", motifs: [/alimentaire|aliment|regime|diet|food|repas|nourriture|allergie alimentaire/] },
  { champ: "naissance", motifs: [/naissance|birth|^dob$|date de naiss/] },
  { champ: "prenom", motifs: [/prenom|first ?name|given ?name/] },
  { champ: "nom", motifs: [/^nom$|nom de famille|last ?name|sur ?name|family ?name|^nom /] },
  { champ: "email", motifs: [/e[- ]?mail|courriel|adresse electronique/] },
  { champ: "telephone", motifs: [/telephone|^tel|numero|phone|mobile|portable|whatsapp/] },
];

export type Correspondance = Partial<Record<Champ, number>>;

/** Devine à quelle colonne correspond chaque champ. */
export function reconnaitreColonnes(entetes: string[]): Correspondance {
  const normalisees = entetes.map((e) => sansAccents(e).replace(/[^a-z0-9]+/g, " ").trim());
  const trouve: Correspondance = {};
  const pris = new Set<number>();
  for (const { champ, motifs } of INDICES) {
    for (const motif of motifs) {
      const i = normalisees.findIndex((e, k) => !pris.has(k) && e && motif.test(e));
      if (i >= 0) { trouve[champ] = i; pris.add(i); break; }
    }
  }
  return trouve;
}

export type Fiche = {
  ligne: number;
  prenom: string;
  nom: string;
  naissance: string | null;
  telephone: string | null;
  email: string | null;
  medical: string | null;
  alimentaire: string | null;
  contactNom: string | null;
  contactTelephone: string | null;
};

const cellule = (l: string[], i: number | undefined) =>
  i === undefined ? null : (l[i] ?? "").trim() || null;

/** Date au format AAAA-MM-JJ, quelle que soit l'écriture d'origine. */
export function normaliserDate(v: string | null): string | null {
  if (!v) return null;
  const t = v.trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function extraireFiches(tableau: Tableau, c: Correspondance): Fiche[] {
  return tableau.lignes
    .map((l, i) => ({
      ligne: i + 2,
      prenom: cellule(l, c.prenom) ?? "",
      nom: cellule(l, c.nom) ?? "",
      naissance: normaliserDate(cellule(l, c.naissance)),
      telephone: cellule(l, c.telephone),
      email: cellule(l, c.email),
      medical: renseignementUtile(cellule(l, c.medical)),
      alimentaire: renseignementUtile(cellule(l, c.alimentaire)),
      contactNom: cellule(l, c.contactNom),
      contactTelephone: cellule(l, c.contactTelephone),
    }))
    .filter((f) => f.prenom || f.nom);
}

// ---------- Rapprochement avec les jeunes en base ----------

export type JeuneConnu = {
  id: string;
  prenom: string;
  nom: string;
  naissance: string | null;
};

export type Appariement = {
  fiche: Fiche;
  jeuneId: string | null;
  jeuneNom: string | null;
  /** "date" = nom et date concordent ; "nom" = nom seul ; "ambigu" / "introuvable". */
  sur: "date" | "nom" | "ambigu" | "introuvable";
  concurrents?: string[];
};

/**
 * À quel jeune une ligne du fichier se rapporte-t-elle ?
 *
 * Le nom d'abord, la date de naissance comme juge de paix : les deux listes
 * officielles inversaient prénom et patronyme, et certaines familles n'ont pas
 * redonné tous les prénoms. Quand deux jeunes revendiquent la même ligne avec
 * la même force — deux sœurs, deux cousins du même nom — on ne tranche pas :
 * attribuer une allergie médicamenteuse à la mauvaise personne est exactement
 * ce qu'il ne faut pas risquer.
 */
export function apparier(fiches: Fiche[], jeunes: JeuneConnu[]): Appariement[] {
  const index = jeunes.map((j) => ({ j, mots: jetons(j.prenom, j.nom) }));
  return fiches.map((fiche) => {
    const mots = jetons(fiche.prenom, fiche.nom);
    const notes = index
      .map(({ j, mots: b }) => ({
        j,
        communs: mots.filter((m) => b.includes(m)).length,
        score: proximite(mots, b),
        memeDate: Boolean(fiche.naissance && j.naissance && fiche.naissance === j.naissance),
      }))
      .filter((n) => n.communs >= 2 && (n.score >= 0.8 || (n.memeDate && n.score >= 0.5)))
      .sort(
        (x, y) =>
          Number(y.memeDate) - Number(x.memeDate) || y.score - x.score || y.communs - x.communs
      );

    if (notes.length === 0) return { fiche, jeuneId: null, jeuneNom: null, sur: "introuvable" };

    const meilleur = notes[0];
    const exaequo = notes.filter(
      (n) => n.memeDate === meilleur.memeDate && n.score === meilleur.score && n.communs === meilleur.communs
    );
    if (exaequo.length > 1) {
      return {
        fiche,
        jeuneId: null,
        jeuneNom: null,
        sur: "ambigu",
        concurrents: exaequo.slice(0, 4).map((n) => `${n.j.prenom} ${n.j.nom}`),
      };
    }
    return {
      fiche,
      jeuneId: meilleur.j.id,
      jeuneNom: `${meilleur.j.prenom} ${meilleur.j.nom}`,
      sur: meilleur.memeDate ? "date" : "nom",
    };
  });
}
