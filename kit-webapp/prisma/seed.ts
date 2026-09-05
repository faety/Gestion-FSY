// Amorçage de la base.
//
// Exécuté à CHAQUE déploiement (voir le script build). Il doit donc être
// rejouable sans rien abîmer : tout est un upsert, ou protégé par un jalon.
//
// Le jalon : une ligne d'AuditLog (action JALON, details = clé) posée après une
// opération qu'on ne veut faire qu'une seule fois — semer une annonce, migrer
// des données, corriger un lot. Supprimer la ligne rejoue l'opération. C'est
// plus simple et plus visible qu'un système de migrations de données.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Exécute `faire` une seule fois, quel que soit le nombre de déploiements. */
async function uneSeuleFois(cle: string, auteurId: string, faire: () => Promise<void>) {
  const deja = await prisma.auditLog.findFirst({ where: { action: "JALON", details: cle } });
  if (deja) return;
  await faire();
  await prisma.auditLog.create({ data: { userId: auteurId, action: "JALON", details: cle } });
  console.log(`Jalon posé : ${cle}`);
}

async function main() {
  // ---------- Premier administrateur ----------
  //
  // Créé s'il manque, jamais écrasé : une fois le mot de passe changé, le
  // seed ne doit pas le remettre à la valeur de l'environnement.
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@exemple.ci").trim().toLowerCase();
  const motDePasse = process.env.SEED_ADMIN_MOT_DE_PASSE ?? "changez-moi-vite";

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(motDePasse, 10),
      prenom: process.env.SEED_ADMIN_PRENOM ?? "Admin",
      nom: process.env.SEED_ADMIN_NOM ?? "Principal",
      role: "ADMIN",
      doitChangerMotDePasse: true,
    },
  });

  // ---------- Exemple de jalon ----------
  await uneSeuleFois("premier-amorcage", admin.id, async () => {
    // Ici : semer des données de référence, une annonce de bienvenue, etc.
  });

  console.log(`Amorçage terminé. Administrateur : ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
