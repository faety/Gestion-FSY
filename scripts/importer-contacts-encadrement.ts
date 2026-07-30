// Charge les numéros de téléphone des encadrants.
//
// Comme pour les participants, les coordonnées ne sont pas versionnées : le
// dépôt ne contient que les noms et les rôles, nécessaires au fonctionnement.
// Les numéros vivent dans data/, exclu du dépôt, et sont chargés à la main sur
// une installation qui en a besoin.
//
//   npm run import:contacts
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FICHIER = path.join(process.cwd(), "data", "encadrement-contacts.json");

type Contact = { email: string; telephone: string };

async function main() {
  if (!fs.existsSync(FICHIER)) {
    console.error(`Fichier introuvable : ${FICHIER}`);
    console.error("Ce fichier n'est pas versionné : il contient des coordonnées.");
    process.exit(1);
  }

  const contacts: Contact[] = JSON.parse(fs.readFileSync(FICHIER, "utf-8"));
  let misAJour = 0;
  const introuvables: string[] = [];

  for (const c of contacts) {
    const r = await prisma.user.updateMany({
      where: { email: c.email },
      data: { telephone: c.telephone },
    });
    if (r.count > 0) misAJour++;
    else introuvables.push(c.email);
  }

  console.log(`✅ ${misAJour} numéros chargés sur ${contacts.length}.`);
  if (introuvables.length > 0) {
    console.warn(`⚠️  ${introuvables.length} compte(s) sans correspondance :`);
    introuvables.slice(0, 10).forEach((e) => console.warn(`     ${e}`));
    console.warn("   L'amorçage a-t-il été exécuté (npm run db:seed) ?");
  }
  const sansNumero = await prisma.user.count({
    where: { actif: true, telephone: null },
  });
  console.log(`   ${sansNumero} encadrant(s) restent sans numéro.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
