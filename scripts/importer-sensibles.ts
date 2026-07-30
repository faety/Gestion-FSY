// Import des données personnelles sensibles des participants.
//
// Ces données (téléphone, adresse électronique, renseignements médicaux,
// contraintes alimentaires, contacts d'urgence) ne sont PAS versionnées : elles
// concernent des mineurs et relèvent, pour les informations médicales, d'une
// catégorie particulièrement protégée.
//
// Le fichier attendu, data/participants-sensibles.json, est produit depuis le
// fichier d'inscription Excel et reste dans data/, exclu du dépôt.
//
//   npx tsx scripts/importer-sensibles.ts
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const FICHIER = path.join(process.cwd(), "data", "participants-sensibles.json");

type Fiche = {
  cle: string; // "Prénom|Nom|AAAA-MM-JJ"
  telephone: string | null;
  email: string | null;
  medical: string | null;
  alimentaire: string | null;
  contactNom: string | null;
  contactTelephone: string | null;
};

// Le formulaire d'inscription est un champ libre : « rien à signaler » y est
// écrit d'une vingtaine de façons. On ne conserve que les réponses porteuses
// d'information, pour que les badges de l'application restent des alertes utiles.
const RIEN = [
  /^(aucun|aucune|aucuns|none|rien|ras|r\.a\.s|neant|néant|non|nan|null|n|n\/a|na)\.?$/i,
  /^rien (à|a) signaler\.?$/i,
  /^(pas|aucun|aucune|sans)\s+(de\s+|d')?(probl[eè]me|souci|soucis|r[eé]gime|contrainte|allergie|restriction|maladie|traitement)/i,
  /^(il|elle)\s+mange\s+(de\s+)?tout/i,
  /^(everything|all)\s+(alright|good|fine|is fine|ok)/i,
  /^nothing\s+(to mention|to report|special)/i,
  /^tout va bien/i,
  /^ok\.?$/i,
  // Fautes de frappe fréquentes sur « aucun » et « néant », éventuellement
  // combinées à « R.A.S » (ex. « Auncun », « NEAN », « R.A.S aucun », « Aucun v »)
  /^(r\.?a\.?s\.?\s*)?(aucun|auncun|aucun[a-z]?|nean|néan|neant)[a-z\s.]{0,3}$/i,
  /^(je|il|elle)\s+mange\s+(de\s+)?tout/i,
  /^[\s.,;:\-–—_/*+()0]*$/, // ponctuation seule ou champ quasi vide
];
const utile = (v: string | null) => {
  const s = v?.trim();
  if (!s) return null;
  return RIEN.some((r) => r.test(s)) ? null : s;
};

async function main() {
  if (!fs.existsSync(FICHIER)) {
    console.error(`Fichier absent : ${FICHIER}`);
    console.error("Placez-y le fichier des données sensibles avant de relancer l'import.");
    process.exit(1);
  }

  const fiches: Fiche[] = JSON.parse(fs.readFileSync(FICHIER, "utf-8"));
  const jeunes = await prisma.jeune.findMany({
    select: { id: true, prenom: true, nom: true, dateNaissance: true, dateNaissanceBrute: true },
  });

  // Les dates invalides sont conservées telles quelles : la clé retombe alors sur
  // la valeur brute, afin que ces fiches soient rattachées elles aussi.
  const index = new Map(
    jeunes.map((j) => [
      `${j.prenom}|${j.nom}|${j.dateNaissance?.toISOString().slice(0, 10) ?? j.dateNaissanceBrute}`,
      j.id,
    ])
  );

  let misAJour = 0;
  const introuvables: string[] = [];
  for (const f of fiches) {
    const id = index.get(f.cle);
    if (!id) {
      introuvables.push(f.cle);
      continue;
    }
    await prisma.jeune.update({
      where: { id },
      data: {
        telephone: utile(f.telephone),
        email: utile(f.email),
        medical: utile(f.medical),
        alimentaire: utile(f.alimentaire),
        contactNom: utile(f.contactNom),
        contactTelephone: utile(f.contactTelephone),
      },
    });
    misAJour++;
  }

  console.log(`✅ ${misAJour} fiches complétées sur ${fiches.length}.`);
  const avecMedical = await prisma.jeune.count({ where: { medical: { not: null } } });
  const avecAlimentaire = await prisma.jeune.count({ where: { alimentaire: { not: null } } });
  console.log(
    `   ${avecMedical} jeunes avec renseignement médical, ${avecAlimentaire} avec contrainte alimentaire.`
  );
  if (introuvables.length) {
    console.warn(`⚠️  ${introuvables.length} fiche(s) sans jeune correspondant :`);
    introuvables.slice(0, 10).forEach((c) => console.warn(`     ${c}`));
    console.warn(
      "   C'est normal si ces fiches viennent d'une unité retirée du périmètre\n" +
        "   (voir src/lib/perimetre.ts). Sinon, la date de naissance diffère entre\n" +
        "   le fichier sensible et prisma/participants.json."
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
