// Les fiches papier des conseillers, rapprochées de la base.
//
// L'application n'a pas été renseignée pendant l'arrivée : les conseillers ont
// composé les compagnies au stylo, une fiche par compagnie et par sexe, puis
// les ont saisies. Ce module lit ces fiches (prisma/fiches-papier.json) et
// construit le plan : quel enfant de la base va dans quel groupe, quel
// conseiller dirige quoi — et surtout ce qu'on n'a PAS su rapprocher, dit
// clairement plutôt que décidé en silence.
//
// Les noms saisis portent les fautes de la transcription manuscrite —
// « MECHELLE » pour Michelle, « MDOH » pour Doh. Le rapprochement mot à mot
// exact des autres modules ne suffit donc pas : ici, deux mots se
// correspondent aussi à une lettre près, ou quand l'un prolonge l'autre.
// Garde-fou : au moins un mot commun de quatre lettres ou plus — « tra » et
// « bi », omniprésents dans les noms de l'Ouest, ne suffisent jamais seuls.
import { jetons } from "./rapprochement";

export type FichePapier = {
  compagnie: number;
  sexe: "F" | "M";
  conseiller: string | null;
  coordonnateurs: string[];
  jeunes: string[];
};

export type JeuneBase = {
  id: string;
  prenom: string;
  nom: string;
  sexe: string;
  annule: boolean;
  ajouteSurPlace: boolean;
};

export type ConseillerBase = { id: string; prenom: string; nom: string; sexe: string };

// ---------- Correspondance de mots, tolérante aux fautes de saisie ----------

/** Distance d'édition ≤ 1 (une lettre changée, ajoutée ou retirée). */
export function aUneLettrePres(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  const [petit, grand] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0, j = 0, ecarts = 0;
  while (i < petit.length && j < grand.length) {
    if (petit[i] === grand[j]) { i++; j++; continue; }
    if (++ecarts > 1) return false;
    if (petit.length === grand.length) { i++; j++; } else { j++; }
  }
  return true;
}

/** Deux mots de nom se valent-ils, fautes de saisie comprises ? */
export function motsSeValent(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) {
    if (a.startsWith(b) || b.startsWith(a)) return true;
    if (a.length >= 5 && b.length >= 5 && aUneLettrePres(a, b)) return true;
  }
  return false;
}

/** Mots communs entre deux noms : total, et « forts » (≥ 4 lettres). */
export function communsFlous(a: string[], b: string[]): { total: number; forts: number } {
  let total = 0, forts = 0;
  const pris = new Set<number>();
  for (const x of a) {
    for (let k = 0; k < b.length; k++) {
      if (pris.has(k) || !motsSeValent(x, b[k])) continue;
      pris.add(k);
      total++;
      if (x.length >= 4) forts++;
      break;
    }
  }
  return { total, forts };
}

// ---------- Le plan ----------

export type Placement = {
  nomFiche: string;
  jeuneId: string;
  nomBase: string;
  sur: boolean;
  reactiver: boolean;
  /** Plusieurs fiches d'un même enfant en base (doublon de saisie) : celui-ci a été retenu. */
  doublonBase: boolean;
};

export type Ambigu = { nomFiche: string; candidats: { id: string; nom: string }[] };

export type FichePlan = {
  compagnie: number;
  sexe: "F" | "M";
  conseillerSaisi: string | null;
  conseillerId: string | null;
  conseillerNom: string | null;
  conseillerMotif: string | null;
  coordonnateurs: string[];
  placements: Placement[];
  ambigus: Ambigu[];
  introuvables: string[];
};

export type PlanFiches = {
  fiches: FichePlan[];
  stats: {
    noms: number;
    places: number;
    surs: number;
    probables: number;
    ambigus: number;
    introuvables: number;
    reactives: number;
    conflitsResolus: number;
  };
};

type Candidat = { jeune: JeuneBase; total: number; forts: number; score: number };

function candidatsPour(mots: string[], base: JeuneBase[], motsBase: Map<string, string[]>) {
  const seuil = mots.length >= 2 ? 2 : 1;
  const liste: Candidat[] = [];
  for (const j of base) {
    const b = motsBase.get(j.id)!;
    const { total, forts } = communsFlous(mots, b);
    if (total < seuil || forts < 1) continue;
    const score = total / Math.min(mots.length, b.length);
    if (score >= 0.6) liste.push({ jeune: j, total, forts, score });
  }
  return liste.sort(
    (a, b) => b.score - a.score || b.total - a.total || b.forts - a.forts
  );
}

/** Les ex æquo désignent-ils en réalité la même personne (doublon en base) ? */
function memePersonne(a: JeuneBase, b: JeuneBase, motsBase: Map<string, string[]>): boolean {
  const { total, forts } = communsFlous(motsBase.get(a.id)!, motsBase.get(b.id)!);
  const score = total / Math.min(motsBase.get(a.id)!.length, motsBase.get(b.id)!.length);
  return score >= 0.99 && total >= 2 && forts >= 1;
}

/**
 * Construit le plan complet à partir des fiches et de l'état réel de la base.
 * Pur et déterministe : la page d'aperçu et l'application recalculent la même
 * chose, au moment où elles en ont besoin.
 */
export function construirePlanFiches(
  fiches: FichePapier[],
  jeunes: JeuneBase[],
  conseillers: ConseillerBase[]
): PlanFiches {
  const motsBase = new Map(jeunes.map((j) => [j.id, jetons(j.prenom, j.nom)]));
  const motsConseillers = new Map(conseillers.map((c) => [c.id, jetons(c.prenom, c.nom)]));

  type Pretendant = { fiche: FichePlan; placement: Placement; score: number; total: number };
  const pretendants = new Map<string, Pretendant[]>();
  const plans: FichePlan[] = [];
  const stats = {
    noms: 0, places: 0, surs: 0, probables: 0, ambigus: 0,
    introuvables: 0, reactives: 0, conflitsResolus: 0,
  };

  for (const f of fiches) {
    const plan: FichePlan = {
      compagnie: f.compagnie,
      sexe: f.sexe,
      conseillerSaisi: f.conseiller,
      conseillerId: null,
      conseillerNom: null,
      conseillerMotif: null,
      coordonnateurs: f.coordonnateurs,
      placements: [],
      ambigus: [],
      introuvables: [],
    };

    // Le conseiller de la fiche, parmi les comptes du même sexe que le groupe.
    if (f.conseiller) {
      const mots = jetons(f.conseiller, "");
      const cands = conseillers
        .filter((c) => c.sexe === f.sexe)
        .map((c) => {
          const { total, forts } = communsFlous(mots, motsConseillers.get(c.id)!);
          return { c, total, forts, score: total / Math.min(mots.length, motsConseillers.get(c.id)!.length) };
        })
        .filter((x) => x.total >= (mots.length >= 2 ? 2 : 1) && x.forts >= 1 && x.score >= 0.6)
        .sort((a, b) => b.score - a.score || b.total - a.total);
      if (cands.length === 0) {
        plan.conseillerMotif = "aucun compte trouvé — groupe sans conseiller pour l'instant";
      } else if (
        cands.length > 1 &&
        cands[1].score === cands[0].score &&
        cands[1].total === cands[0].total
      ) {
        plan.conseillerMotif =
          "plusieurs comptes possibles : " + cands.slice(0, 3).map((x) => `${x.c.prenom} ${x.c.nom}`).join(", ");
      } else {
        plan.conseillerId = cands[0].c.id;
        plan.conseillerNom = `${cands[0].c.prenom} ${cands[0].c.nom}`;
      }
    }

    for (const nomFiche of f.jeunes) {
      stats.noms++;
      const mots = jetons(nomFiche, "");
      // Même sexe que la fiche, strictement : une fiche de garçons qui ne
      // trouve qu'une fille n'a pas trouvé — elle a échoué.
      const dansLeSexe = jeunes.filter((j) => j.sexe === f.sexe);
      // Les annulés participent à la recherche : un annulé qui figure sur une
      // fiche est là — c'est le cas « réactiver » déjà connu de l'ajout sur place.
      const cands = candidatsPour(mots, dansLeSexe, motsBase);
      const reactiver = false;
      if (cands.length === 0) {
        plan.introuvables.push(nomFiche);
        stats.introuvables++;
        continue;
      }
      void reactiver;
      const premier = cands[0];
      let exaequo = cands.filter((x) => x.score === premier.score && x.total === premier.total);
      if (exaequo.length > 1) {
        // Des ex æquo qui sont la même personne saisie deux fois en base : on
        // retient la fiche la plus « officielle » (pas ajoutée sur place).
        const tousMemePersonne = exaequo.every((x) =>
          memePersonne(x.jeune, exaequo[0].jeune, motsBase)
        );
        if (tousMemePersonne) {
          const officiels = exaequo.filter((x) => !x.jeune.ajouteSurPlace && !x.jeune.annule);
          exaequo = [officiels[0] ?? exaequo[0]];
        } else {
          plan.ambigus.push({
            nomFiche,
            candidats: exaequo.slice(0, 6).map((x) => ({
              id: x.jeune.id,
              nom: `${x.jeune.prenom} ${x.jeune.nom}`,
            })),
          });
          stats.ambigus++;
          continue;
        }
      }
      const retenu = exaequo[0];
      const placement: Placement = {
        nomFiche,
        jeuneId: retenu.jeune.id,
        nomBase: `${retenu.jeune.prenom} ${retenu.jeune.nom}`,
        sur: retenu.score >= 0.99 && retenu.total >= 2,
        reactiver: reactiver || retenu.jeune.annule,
        doublonBase: false,
      };
      plan.placements.push(placement);
      const liste = pretendants.get(retenu.jeune.id) ?? [];
      liste.push({ fiche: plan, placement, score: retenu.score, total: retenu.total });
      pretendants.set(retenu.jeune.id, liste);
    }
    plans.push(plan);
  }

  // Deux fiches qui réclament le même enfant : la mieux rapprochée l'emporte,
  // l'autre redevient introuvable — deux conseillers ne peuvent pas avoir le
  // même jeune, et choisir en silence serait pire que le dire.
  for (const [, liste] of pretendants) {
    if (liste.length < 2) continue;
    liste.sort((a, b) => b.score - a.score || b.total - a.total);
    for (const perdant of liste.slice(1)) {
      const p = perdant.fiche;
      p.placements = p.placements.filter((x) => x !== perdant.placement);
      p.introuvables.push(perdant.placement.nomFiche);
      stats.introuvables++;
      stats.conflitsResolus++;
    }
  }

  for (const p of plans) {
    for (const x of p.placements) {
      stats.places++;
      if (x.sur) stats.surs++;
      else stats.probables++;
      if (x.reactiver) stats.reactives++;
    }
  }
  return { fiches: plans, stats };
}
