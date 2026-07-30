// Données de démonstration — FSY 2026 Abidjan Ouest
// Le programme, lui, est le vrai programme de la conférence (voir
// prisma/programme-fsy2026.ts) : il n'est pas fictif.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PROGRAMME, DATE_JOUR_1, JOURNEES, THEME_FSY } from "./programme-fsy2026";

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

  // Programme officiel de la conférence (3 au 8 août 2026)
  const dateDe = (jour: number, heure: string) => {
    const [h, m] = heure.split(":").map(Number);
    return new Date(DATE_JOUR_1.annee, DATE_JOUR_1.mois, DATE_JOUR_1.jour + jour - 1, h, m);
  };

  for (const j of JOURNEES) {
    const donnees = {
      date: dateDe(j.numero, "00:00"),
      tenue: j.tenue,
      tenueEncadrants: j.tenueEncadrants,
      note: j.note,
    };
    await prisma.journeeConference.upsert({
      where: { numero: j.numero },
      update: donnees,
      create: { numero: j.numero, ...donnees },
    });
  }

  const dejaActivites = await prisma.activite.count();
  if (dejaActivites === 0) {
    const coordinateur = await prisma.user.findUnique({
      where: { email: "coordinateur@fsy2026.ci" },
    });
    for (const a of PROGRAMME) {
      await prisma.activite.create({
        data: {
          titre: a.titre,
          description: a.description ?? null,
          lieu: a.lieu ?? null,
          debut: dateDe(a.jour, a.debut),
          fin: a.fin ? dateDe(a.jour, a.fin) : null,
          type: a.type ?? "GENERAL",
          publicCible: a.publicCible ?? "TOUS",
          statut: a.statut ?? "PLANIFIE",
          pourEncadrants: a.encadrants ?? false,
          roleConseiller: a.r?.[0] ?? "ASSISTER",
          roleAdjoint: a.r?.[1] ?? "ASSISTER",
          roleCoordinateur: a.r?.[2] ?? "ASSISTER",
          roleDirigeant: a.r?.[3] ?? "FACULTATIF",
          creeParId: coordinateur?.id,
        },
      });
    }
    const aConfirmer = PROGRAMME.filter((a) => a.statut === "A_CONFIRMER").length;
    console.log(
      `   ${PROGRAMME.length} activités du programme FSY 2026 (${PROGRAMME.length - aConfirmer} officielles, ${aConfirmer} à confirmer).`
    );
  }

  // Annonce de bienvenue
  const dejaAnnonces = await prisma.annonce.count();
  if (dejaAnnonces === 0) {
    const dirigeant = await prisma.user.findUnique({ where: { email: "berenger@fsy2026.ci" } });
    if (dirigeant) {
      await prisma.annonce.create({
        data: {
          titre: `Thème 2026 : « ${THEME_FSY.titre} » — ${THEME_FSY.reference}`,
          contenu: `${THEME_FSY.texte}\n\nChers conseillers et coordinateurs, merci pour votre engagement. Consultez votre programme du jour chaque matin et validez bien les arrivées et départs aux cars.`,
          cible: "TOUS",
          creeParId: dirigeant.id,
        },
      });
      await prisma.annonce.create({
        data: {
          titre: "Programme officiel chargé",
          contenu:
            "Les horaires proviennent du manuel du participant et du manuel de l'encadrant FSY 2026, de la veille de la conférence jusqu'aux départs du samedi 8 août à 7 h. Chaque activité indique le rôle attendu de votre niveau : le badge « Vous dirigez » signale ce dont vous êtes responsable.\n\nSeuls les horaires de la veille (visite du lieu, réunion d'accueil des conseillers) et les lieux restent à renseigner pour le site d'Abidjan Ouest.",
          cible: "COORDINATEURS",
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
