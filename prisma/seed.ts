// Données de démonstration — FSY 2026 Abidjan Ouest
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PRENOMS_M = ["Kouadio", "Yao", "Koffi", "Jean", "Marc", "Didier", "Serge", "Franck", "Olivier", "Armand", "Pacôme", "Wilfried", "Éric", "Hervé", "Landry"];
const PRENOMS_F = ["Akissi", "Aya", "Affoué", "Marie", "Grâce", "Estelle", "Sarah", "Rebecca", "Dorcas", "Émilie", "Josiane", "Prisca", "Nadège", "Clarisse", "Ruth"];
const NOMS = ["Kouassi", "N'Guessan", "Traoré", "Koné", "Ouattara", "Bamba", "Diabaté", "Yapi", "Assi", "Gnahoré", "Tano", "Aka", "Brou", "Dje", "Ehouman"];

function nomAleatoire(sexe: "M" | "F", i: number) {
  const prenoms = sexe === "M" ? PRENOMS_M : PRENOMS_F;
  return {
    prenom: prenoms[i % prenoms.length],
    nom: NOMS[(i * 7 + (sexe === "M" ? 3 : 5)) % NOMS.length],
  };
}

async function main() {
  const hash = await bcrypt.hash("fsy2026", 10);

  // Pieux / districts
  const nomsPieux = ["Pieu de Yopougon", "Pieu d'Abobo", "Pieu de Cocody", "District d'Adjamé"];
  const pieux = [];
  for (const nom of nomsPieux) {
    pieux.push(await prisma.pieu.upsert({ where: { nom }, update: {}, create: { nom } }));
  }

  // Couple dirigeant
  await prisma.user.upsert({
    where: { email: "berenger@fsy2026.ci" },
    update: {},
    create: { email: "berenger@fsy2026.ci", passwordHash: hash, nom: "Kouamé", prenom: "Bérenger", sexe: "M", role: "DIRIGEANT" },
  });
  await prisma.user.upsert({
    where: { email: "epouse@fsy2026.ci" },
    update: {},
    create: { email: "epouse@fsy2026.ci", passwordHash: hash, nom: "Kouamé", prenom: "Élisabeth", sexe: "F", role: "DIRIGEANT" },
  });

  // Coordinateurs principaux (un homme, une femme)
  await prisma.user.upsert({
    where: { email: "coordinateur@fsy2026.ci" },
    update: {},
    create: { email: "coordinateur@fsy2026.ci", passwordHash: hash, nom: "Assi", prenom: "Emmanuel", sexe: "M", role: "COORDINATEUR" },
  });
  await prisma.user.upsert({
    where: { email: "coordinatrice@fsy2026.ci" },
    update: {},
    create: { email: "coordinatrice@fsy2026.ci", passwordHash: hash, nom: "Tano", prenom: "Victoire", sexe: "F", role: "COORDINATEUR" },
  });

  // Compagnies + paires de coordinateurs adjoints
  const nomsCompagnies = ["Compagnie Espérance", "Compagnie Lumière", "Compagnie Vertu"];
  const compagnies = [];
  for (let c = 0; c < nomsCompagnies.length; c++) {
    const compagnie = await prisma.compagnie.upsert({
      where: { nom: nomsCompagnies[c] },
      update: {},
      create: { nom: nomsCompagnies[c] },
    });
    compagnies.push(compagnie);
    for (const sexe of ["M", "F"] as const) {
      const { prenom, nom } = nomAleatoire(sexe, c + 20);
      const email = `adjoint${sexe.toLowerCase()}${c + 1}@fsy2026.ci`;
      await prisma.user.upsert({
        where: { email },
        update: { compagnieId: compagnie.id },
        create: { email, passwordHash: hash, nom, prenom, sexe, role: "ADJOINT", compagnieId: compagnie.id },
      });
    }
  }

  // Groupes + conseillers (2 groupes M et 2 groupes F par compagnie)
  let numGroupe = 1;
  const groupes = [];
  for (const compagnie of compagnies) {
    for (const sexe of ["M", "F", "M", "F"] as const) {
      const { prenom, nom } = nomAleatoire(sexe, numGroupe + 40);
      const email = `conseiller${numGroupe}@fsy2026.ci`;
      const conseiller = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, passwordHash: hash, nom, prenom, sexe, role: "CONSEILLER" },
      });
      const nomGroupe = `Groupe ${sexe === "M" ? "G" : "F"}${numGroupe}`;
      const groupe = await prisma.groupe.upsert({
        where: { nom: nomGroupe },
        update: {},
        create: { nom: nomGroupe, sexe, conseillerId: conseiller.id, compagnieId: compagnie.id },
      });
      groupes.push(groupe);
      numGroupe++;
    }
  }

  // Jeunes (~10 par groupe pour la démo)
  const dejaDesJeunes = await prisma.jeune.count();
  if (dejaDesJeunes === 0) {
    let i = 0;
    for (const groupe of groupes) {
      for (let j = 0; j < 10; j++) {
        const { prenom, nom } = nomAleatoire(groupe.sexe as "M" | "F", i);
        await prisma.jeune.create({
          data: {
            prenom,
            nom: `${nom}${j % 3 === 0 ? "-" + NOMS[(i + 4) % NOMS.length] : ""}`,
            sexe: groupe.sexe,
            pieuId: pieux[i % pieux.length].id,
            groupeId: groupe.id,
          },
        });
        i++;
      }
    }
  }

  // Cars (un par pieu), responsable = un conseiller
  const conseillers = await prisma.user.findMany({ where: { role: "CONSEILLER" } });
  for (let c = 0; c < pieux.length; c++) {
    await prisma.car.upsert({
      where: { nom: `Car ${c + 1} — ${pieux[c].nom}` },
      update: {},
      create: {
        nom: `Car ${c + 1} — ${pieux[c].nom}`,
        pieuId: pieux[c].id,
        responsableId: conseillers[c % conseillers.length]?.id,
        capacite: 70,
      },
    });
  }

  // Programme de démonstration (3-6 août 2026)
  const dejaActivites = await prisma.activite.count();
  if (dejaActivites === 0) {
    const coordinateur = await prisma.user.findUnique({ where: { email: "coordinateur@fsy2026.ci" } });
    const jour = (d: number, h: number, m = 0) => new Date(2026, 7, d, h, m); // août = mois 7
    await prisma.activite.createMany({
      data: [
        { titre: "Arrivée et enregistrement", debut: jour(3, 8), lieu: "Entrée principale", type: "GENERAL", creeParId: coordinateur?.id },
        { titre: "Cérémonie d'ouverture", debut: jour(3, 14), lieu: "Grand auditorium", type: "GENERAL", creeParId: coordinateur?.id },
        { titre: "Soirée de danse", debut: jour(3, 19, 30), lieu: "Esplanade", type: "GENERAL", creeParId: coordinateur?.id },
        { titre: "Dévotion du matin", debut: jour(4, 7), lieu: "Grand auditorium", type: "GENERAL", creeParId: coordinateur?.id },
        { titre: "Classe : Choisis la foi", debut: jour(4, 9), lieu: "Salle A", type: "COMPAGNIE", compagnieId: compagnies[0].id, creeParId: coordinateur?.id },
        { titre: "Classe : Choisis la foi", debut: jour(4, 9), lieu: "Salle B", type: "COMPAGNIE", compagnieId: compagnies[1].id, creeParId: coordinateur?.id },
        { titre: "Jeux et sports", debut: jour(4, 15), lieu: "Terrain de sport", type: "GENERAL", creeParId: coordinateur?.id },
        { titre: "Veillée de témoignages", debut: jour(5, 19), lieu: "Grand auditorium", type: "GENERAL", creeParId: coordinateur?.id },
        { titre: "Cérémonie de clôture", debut: jour(6, 10), lieu: "Grand auditorium", type: "GENERAL", creeParId: coordinateur?.id },
      ],
    });
  }

  // Annonce de bienvenue
  const dejaAnnonces = await prisma.annonce.count();
  if (dejaAnnonces === 0) {
    const dirigeant = await prisma.user.findUnique({ where: { email: "berenger@fsy2026.ci" } });
    if (dirigeant) {
      await prisma.annonce.create({
        data: {
          titre: "Bienvenue au FSY 2026 Abidjan Ouest !",
          contenu: "Chers conseillers et coordinateurs, merci pour votre engagement. Vérifiez le programme du jour chaque matin et validez bien les arrivées aux cars.",
          cible: "TOUS",
          creeParId: dirigeant.id,
        },
      });
    }
  }

  console.log("✅ Données de démonstration créées.");
  console.log("Comptes (mot de passe : fsy2026) :");
  console.log("  Dirigeant     : berenger@fsy2026.ci");
  console.log("  Coordinateur  : coordinateur@fsy2026.ci");
  console.log("  Adjoint       : adjointm1@fsy2026.ci");
  console.log("  Conseiller    : conseiller1@fsy2026.ci");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
