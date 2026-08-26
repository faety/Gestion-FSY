// ════════════════════════════════════════════════════════════════════════════
//  Attestations hors encadrement — fournisseurs et bénévoles
// ════════════════════════════════════════════════════════════════════════════
//
// Les attestations d'encadrement (attestations.ts) se calculent toutes seules :
// l'application connaît les groupes, les rapports remis, les pointages. Ici,
// rien de tel. Le traiteur, le transporteur, l'imprimeur, l'évêque qui a passé
// six jours à porter des cartons — l'application ne sait rien d'eux, et il
// serait faux de prétendre le contraire.
//
// Le document repose donc sur ce que le couple dirigeant déclare, et il le dit
// franchement à la page de vérification : « attestée par la direction de la
// conférence ». C'est la nature même d'une attestation de bonne exécution — le
// donneur d'ordre certifie ce qu'il a constaté, personne d'autre ne le peut.
//
// Deux familles de bénéficiaires, un seul document :
//
//   • FOURNISSEUR — une entreprise, un prestataire. Le document s'appelle
//     « attestation de bonne exécution » : c'est la pièce qu'un fournisseur
//     joint à un appel d'offres pour prouver une référence. Elle nomme le
//     donneur d'ordre, l'objet, la période, et conclut que la prestation a été
//     exécutée à satisfaction.
//
//   • PERSONNE — un bénévole, un membre d'équipe. Le document s'appelle
//     « attestation de service bénévole » : il nomme la fonction exercée et la
//     durée, sans jamais laisser croire à un contrat de travail.
//
// Le code de vérification, le QR et la page publique sont les mêmes que pour
// l'encadrement : un document qui ne se vérifie pas ne vaut rien.

import { CONFERENCE } from "./attestations";

export const GENRES = {
  FOURNISSEUR: {
    cle: "FOURNISSEUR",
    label: "Fournisseur ou prestataire",
    titre: "Attestation de bonne exécution",
    titreCourt: "Bonne exécution",
    // Ce que le vérificateur lira en tête de la page publique.
    resume: "Prestation exécutée pour la conférence",
  },
  PERSONNE: {
    cle: "PERSONNE",
    label: "Bénévole ou membre d'équipe",
    titre: "Attestation de service bénévole",
    titreCourt: "Service bénévole",
    resume: "Service bénévole rendu à la conférence",
  },
} as const;

export type CleGenre = keyof typeof GENRES;

export const genreValide = (c: string): c is CleGenre => c in GENRES;

// ---------- Catalogue des natures ----------
//
// Le couple n'a pas à rédiger un paragraphe juridique à minuit : il choisit la
// nature, l'objet s'écrit tout seul, et il le retouche s'il veut. `objet`
// s'insère après « a assuré » — d'où la forme nominale, sans majuscule.
//
// L'ordre suit celui qu'a dicté le couple dirigeant : nourriture, transport,
// communication, site et logistique, puis le reste.

export const NATURES = [
  {
    cle: "RESTAURATION",
    label: "Restauration — repas",
    icone: "🍽️",
    objet: "la fourniture et le service des repas de la conférence",
    fonction: "Restauration",
    objetPersonne: "la préparation et le service des repas de la conférence",
  },
  {
    cle: "TRANSPORT",
    label: "Transport",
    icone: "🚌",
    objet: "l'acheminement des participants et de l'encadrement, à l'aller comme au retour",
    fonction: "Transport",
    objetPersonne: "l'organisation et l'accompagnement des transports",
  },
  {
    cle: "COMMUNICATION",
    label: "Communication et impression",
    icone: "🖨️",
    objet: "la conception, l'impression et la fourniture des supports de communication",
    fonction: "Communication",
    objetPersonne: "la réalisation et la diffusion des supports de communication",
  },
  {
    cle: "SITE_LOGISTIQUE",
    label: "Site et logistique",
    icone: "🏕️",
    objet: "la mise à disposition du site, son aménagement et le soutien logistique de la conférence",
    fonction: "Logistique",
    objetPersonne: "l'aménagement du site et le soutien logistique quotidien",
  },
  {
    cle: "SONORISATION",
    label: "Sonorisation et technique",
    icone: "🔊",
    objet: "la sonorisation, l'éclairage et l'assistance technique des sessions",
    fonction: "Sonorisation et technique",
    objetPersonne: "la sonorisation et l'assistance technique des sessions",
  },
  {
    cle: "SECURITE",
    label: "Sécurité",
    icone: "🛡️",
    objet: "la surveillance et la sécurité du site et des participants",
    fonction: "Sécurité",
    objetPersonne: "la surveillance et la sécurité du site et des participants",
  },
  {
    cle: "HYGIENE",
    label: "Hygiène et entretien",
    icone: "🧹",
    objet: "l'entretien, l'hygiène et la propreté des installations",
    fonction: "Hygiène et entretien",
    objetPersonne: "l'entretien, l'hygiène et la propreté des installations",
  },
  {
    cle: "SANTE",
    label: "Santé et secours",
    icone: "⛑️",
    objet: "la veille sanitaire, les soins courants et les premiers secours",
    fonction: "Santé et secours",
    objetPersonne: "la veille sanitaire, les soins courants et les premiers secours",
  },
  {
    cle: "AUTRE",
    label: "Autre prestation",
    icone: "📌",
    objet: "",
    fonction: "",
    objetPersonne: "",
  },
] as const;

export type CleNature = (typeof NATURES)[number]["cle"];

export const nature = (cle: string) => NATURES.find((n) => n.cle === cle) ?? null;
export const natureValide = (cle: string): cle is CleNature =>
  NATURES.some((n) => n.cle === cle);

/**
 * La phrase proposée d'office, selon qui reçoit le document.
 *
 * Un traiteur « met à disposition » ; un bénévole de l'équipe logistique, non —
 * il porte des cartons. Écrire d'un évêque qu'il a mis un site à disposition
 * serait la première phrase que son entourage saurait fausse, et tout le
 * document s'écroulerait avec elle.
 */
export const objetPropose = (genre: string, cle: string) => {
  const n = nature(cle);
  if (!n) return "";
  return genre === "PERSONNE" ? n.objetPersonne : n.objet;
};

// ---------- Ce que le couple a annoncé vouloir délivrer ----------
//
// La liste dictée par le couple dirigeant, pour que la page puisse dire ce qui
// manque encore. Ce n'est pas une contrainte : on peut en délivrer d'autres,
// et n'en délivrer aucune. C'est un pense-bête, rien de plus — un fournisseur
// oublié le samedi soir ne se rattrape plus.
export const ATTENDUS: { nature: CleNature; combien: number; quoi: string }[] = [
  { nature: "RESTAURATION", combien: 2, quoi: "les deux fournisseurs de repas" },
  { nature: "TRANSPORT", combien: 1, quoi: "le transport" },
  { nature: "COMMUNICATION", combien: 1, quoi: "la communication" },
  { nature: "SITE_LOGISTIQUE", combien: 1, quoi: "le site et la logistique" },
];

// ---------- Faits figés à la délivrance ----------
//
// Comme pour l'encadrement : ce que porte le document ne bouge plus ensuite.
// Le nom du fournisseur peut changer d'orthographe dans un formulaire six mois
// plus tard, l'attestation délivrée garde le sien.
export type FaitsTiers = {
  /** Raison sociale d'une entreprise, ou nom complet d'une personne. */
  beneficiaire: string;
  /** « représenté par … » — une entreprise signe par quelqu'un. */
  representant?: string | null;
  /** La fonction exercée, pour une personne. */
  fonction?: string | null;
  /** L'objet, tel qu'il s'insère après « a assuré ». */
  objet: string;
  /** Un fait constaté par ligne : « 4 200 repas servis ». */
  precisions: string[];
  /** Période réellement couverte, en clair. Par défaut celle de la conférence. */
  periode: string;
  /** Ampleur de la conférence au moment de la délivrance. */
  participants?: number;
  encadrants?: number;
};

export const PERIODE_CONFERENCE = `du ${CONFERENCE.du} au ${CONFERENCE.au}`;

export function lireFaitsTiers(json: string): FaitsTiers {
  try {
    const f = JSON.parse(json) as FaitsTiers;
    return {
      ...f,
      precisions: Array.isArray(f.precisions) ? f.precisions : [],
      periode: f.periode || PERIODE_CONFERENCE,
    };
  } catch {
    return { beneficiaire: "", objet: "", precisions: [], periode: PERIODE_CONFERENCE };
  }
}

/** Une ligne par fait, vidée des blancs — ce que saisit le couple dans un champ libre. */
export const lignesPrecisions = (texte: string): string[] =>
  texte
    .split("\n")
    .map((l) => l.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 6);

// ---------- Le texte du document ----------
//
// Deux paragraphes, comme sur l'attestation d'encadrement : ce qui est attesté,
// puis la formule de clôture. Rien d'élogieux qu'on ne puisse démontrer — « à
// la satisfaction de la direction » est vrai et vérifiable ; « prestation
// exceptionnelle » n'engage que celui qui l'écrit et ne pèse rien.

const AMPLEUR_DEFAUT = { participants: CONFERENCE.participants, encadrants: CONFERENCE.encadrants };

export const ampleurTiers = (f: FaitsTiers) => ({
  participants: f.participants ?? AMPLEUR_DEFAUT.participants,
  encadrants: f.encadrants ?? AMPLEUR_DEFAUT.encadrants,
});

/** Le premier paragraphe : qui, quoi, quand, pour quel événement. */
export function corpsTiers(genre: string, f: FaitsTiers): string {
  const a = ampleurTiers(f);
  const cadre =
    `la conférence pour la jeunesse ${CONFERENCE.nom}, tenue ${f.periode} ` +
    `à ${CONFERENCE.lieu}, qui a réuni ${a.participants} participants mineurs ` +
    `encadrés par ${a.encadrants} responsables`;

  if (genre === "PERSONNE") {
    const enQualite = f.fonction ? `, en qualité de ${f.fonction.toLowerCase()},` : "";
    return (
      `a apporté bénévolement son concours${enQualite} à ${cadre}.\n\n` +
      `À ce titre : ${f.objet}. Ce service a été rendu à titre entièrement bénévole, ` +
      `sans contrepartie ni lien de subordination, et à l'entière satisfaction de la direction ` +
      `de la conférence, qui lui exprime ici sa reconnaissance.`
    );
  }

  const par = f.representant ? `, représenté par ${f.representant},` : "";
  return (
    `a assuré${par} ${f.objet} dans le cadre de ${cadre}.\n\n` +
    `La direction de la conférence atteste que cette prestation a été exécutée ` +
    `conformément à ce qui avait été convenu, dans les délais et à sa satisfaction. ` +
    `La présente attestation est délivrée pour servir et valoir ce que de droit.`
  );
}

/** Le titre imprimé en tête du document. */
export const titreTiers = (genre: string) =>
  (GENRES[genre as CleGenre] ?? GENRES.FOURNISSEUR).titre;

/** L'intitulé au-dessus du nom : « La direction atteste que ». */
export const ATTESTE = "Le couple dirigeant de la conférence atteste que";
