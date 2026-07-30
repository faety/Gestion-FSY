// Amorçage de la base — FSY 2026 Abidjan Ouest
//
// Données réelles : les 663 participants inscrits (prisma/participants.json), les
// pieux/districts, les cars, la structure des groupes et compagnies, le programme
// officiel et les annonces d'anniversaire.
//
// Données encore fictives : l'équipe d'encadrement (couple dirigeant,
// coordinateurs, adjoints, conseillers), en attente des listes officielles.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PROGRAMME, DATE_JOUR_1, JOURNEES, THEME_FSY } from "./programme-fsy2026";
import { annoncesAnniversaires, anniversairePendantConference } from "./anniversaires";
import participants from "./participants.json";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("fsy2026", 10);

  // ---------- Pieux et districts (réels) ----------
  const nomsPieux = [...new Set(participants.map((p) => p.pieu))].sort();
  const pieuxParNom = new Map<string, string>();
  for (const nom of nomsPieux) {
    const pieu = await prisma.pieu.upsert({ where: { nom }, update: {}, create: { nom } });
    pieuxParNom.set(nom, pieu.id);
  }

  // ---------- Équipe d'encadrement (encore fictive) ----------
  const creerUser = (email: string, nom: string, prenom: string, sexe: string, role: string) =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: hash, nom, prenom, sexe, role },
    });

  await creerUser("berenger@fsy2026.ci", "Kouamé", "Bérenger", "M", "DIRIGEANT");
  await creerUser("epouse@fsy2026.ci", "Kouamé", "Élisabeth", "F", "DIRIGEANT");
  await creerUser("coordinateur@fsy2026.ci", "Assi", "Emmanuel", "M", "COORDINATEUR");
  await creerUser("coordinatrice@fsy2026.ci", "Tano", "Victoire", "F", "COORDINATEUR");

  const PRENOMS_M = ["Kouadio", "Yao", "Koffi", "Marc", "Didier", "Serge", "Franck", "Olivier", "Armand", "Wilfried", "Éric", "Landry"];
  const PRENOMS_F = ["Akissi", "Aya", "Affoué", "Grâce", "Estelle", "Sarah", "Rebecca", "Dorcas", "Émilie", "Prisca", "Nadège", "Clarisse"];
  const NOMS = ["Kouassi", "N'Guessan", "Traoré", "Koné", "Ouattara", "Bamba", "Diabaté", "Yapi", "Gnahoré", "Aka", "Brou", "Ehouman"];

  // ---------- Jeunes (réels) ----------
  const dejaDesJeunes = await prisma.jeune.count();
  if (dejaDesJeunes === 0) {
    for (const p of participants) {
      await prisma.jeune.create({
        data: {
          prenom: p.prenom,
          nom: p.nom,
          nomUsage: p.nomUsage,
          sexe: p.sexe,
          dateNaissance: p.dateNaissance ? new Date(p.dateNaissance) : null,
          dateNaissanceBrute: p.dateNaissanceBrute,
          paroisse: p.paroisse,
          tailleTshirt: p.tailleTshirt,
          statutInscription: p.statut ?? "Approuvée",
          pieuId: pieuxParNom.get(p.pieu)!,
        },
      });
    }
    console.log(`   ${participants.length} participants importés.`);
  }

  // ---------- Groupes et compagnies (affectation officielle) ----------
  // 36 compagnies de deux groupes : groupe 1 = filles, groupe 2 = garçons.
  // L'affectation mélange volontairement les âges et les pieux, pour favoriser
  // l'unité — c'est le fichier officiel qui fait foi, pas un calcul.
  if ((await prisma.groupe.count()) === 0) {
    const numerosCompagnie = [
      ...new Set(participants.map((p) => p.compagnie).filter((n): n is number => n != null)),
    ].sort((a, b) => a - b);

    for (const numero of numerosCompagnie) {
      const compagnie = await prisma.compagnie.create({
        data: { nom: `Compagnie ${numero}`, numero },
      });

      const numerosGroupe = [
        ...new Set(
          participants.filter((p) => p.compagnie === numero).map((p) => p.groupe)
        ),
      ]
        .filter((n): n is number => n != null)
        .sort((a, b) => a - b);

      for (const numeroGroupe of numerosGroupe) {
        const membres = participants.filter(
          (p) => p.compagnie === numero && p.groupe === numeroGroupe
        );
        const sexe = membres[0].sexe;
        const groupe = await prisma.groupe.create({
          data: {
            nom: `Groupe ${numero}.${numeroGroupe}`,
            sexe,
            numeroDansCompagnie: numeroGroupe,
            capaciteMax: 12,
            compagnieId: compagnie.id,
          },
        });
        // Rattachement par identité : prénom, nom et date de naissance
        for (const m of membres) {
          await prisma.jeune.updateMany({
            where: {
              prenom: m.prenom,
              nom: m.nom,
              ...(m.dateNaissance
                ? { dateNaissance: new Date(m.dateNaissance) }
                : { dateNaissanceBrute: m.dateNaissanceBrute }),
              groupeId: null,
            },
            data: { groupeId: groupe.id },
          });
        }
      }
    }

    const nbG = await prisma.groupe.count();
    const nbC = await prisma.compagnie.count();
    const affectes = await prisma.jeune.count({ where: { groupeId: { not: null } } });
    console.log(
      `   ${nbC} compagnies et ${nbG} groupes (affectation officielle) — ${affectes} jeunes affectés.`
    );

    // Conseillers de démonstration sur les six premiers groupes, pour pouvoir
    // tester l'application. Les autres groupes restent sans conseiller.
    const groupes = await prisma.groupe.findMany({
      orderBy: { nom: "asc" },
      take: 6,
    });
    for (let i = 0; i < groupes.length; i++) {
      const g = groupes[i];
      const prenoms = g.sexe === "M" ? PRENOMS_M : PRENOMS_F;
      const conseiller = await creerUser(
        `conseiller${i + 1}@fsy2026.ci`,
        NOMS[i % NOMS.length],
        prenoms[i % prenoms.length],
        g.sexe,
        "CONSEILLER"
      );
      await prisma.groupe.update({ where: { id: g.id }, data: { conseillerId: conseiller.id } });
    }

    // Paires de coordinateurs adjoints de démonstration sur les trois premières compagnies
    const compagnies = await prisma.compagnie.findMany({ orderBy: { numero: "asc" }, take: 3 });
    for (let c = 0; c < compagnies.length; c++) {
      for (const sexe of ["M", "F"] as const) {
        const prenoms = sexe === "M" ? PRENOMS_M : PRENOMS_F;
        const email = `adjoint${sexe.toLowerCase()}${c + 1}@fsy2026.ci`;
        await prisma.user.upsert({
          where: { email },
          update: { compagnieId: compagnies[c].id },
          create: {
            email,
            passwordHash: hash,
            nom: NOMS[(c + 5) % NOMS.length],
            prenom: prenoms[(c + 5) % prenoms.length],
            sexe,
            role: "ADJOINT",
            compagnieId: compagnies[c].id,
          },
        });
      }
    }
  }

  // ---------- Cars : un par pieu/district ----------
  const conseillers = await prisma.user.findMany({ where: { role: "CONSEILLER" } });
  let numeroCar = 0;
  for (const nom of nomsPieux) {
    numeroCar++;
    const nbJeunes = participants.filter((p) => p.pieu === nom && p.statut !== "Annulé(e)").length;
    await prisma.car.upsert({
      where: { nom: `Car ${numeroCar} — ${nom}` },
      update: {},
      create: {
        nom: `Car ${numeroCar} — ${nom}`,
        pieuId: pieuxParNom.get(nom)!,
        responsableId: conseillers[(numeroCar - 1) % Math.max(conseillers.length, 1)]?.id,
        // Un car de 70 places par tranche de 70 jeunes attendus
        capacite: Math.max(70, Math.ceil(nbJeunes / 70) * 70),
      },
    });
  }

  // ---------- Journées et programme officiel ----------
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

  const coordinateur = await prisma.user.findUnique({
    where: { email: "coordinateur@fsy2026.ci" },
  });
  const dirigeant = await prisma.user.findUnique({ where: { email: "berenger@fsy2026.ci" } });

  if ((await prisma.activite.count()) === 0) {
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
      `   ${PROGRAMME.length} activités du programme (${PROGRAMME.length - aConfirmer} officielles, ${aConfirmer} à confirmer).`
    );
  }

  // ---------- Annonces d'anniversaire programmées ----------
  if (dirigeant) {
    await prisma.annonce.deleteMany({ where: { automatique: true } });
    const feteJeunes = await prisma.jeune.findMany({
      where: { statutInscription: { not: "Annulé(e)" }, dateNaissance: { not: null } },
      include: { pieu: true, groupe: true },
    });
    const concernes = feteJeunes
      .filter((j) => anniversairePendantConference(j.dateNaissance!))
      .map((j) => ({
        prenom: j.prenom,
        nom: j.nom,
        sexe: j.sexe,
        dateNaissance: j.dateNaissance!,
        pieu: j.pieu.nom,
        groupe: j.groupe?.nom ?? null,
      }));

    const annonces = annoncesAnniversaires(concernes);
    for (const a of annonces) {
      await prisma.annonce.create({
        data: { ...a, automatique: true, creeParId: dirigeant.id },
      });
    }
    console.log(
      `   ${concernes.length} anniversaires pendant la conférence → ${annonces.length} annonces programmées (J-2, J-1, jour J).`
    );
  }

  // ---------- Annonces de bienvenue ----------
  if ((await prisma.annonce.count({ where: { automatique: false } })) === 0 && dirigeant) {
    const nbAttendus = participants.filter((p) => p.statut !== "Annulé(e)").length;
    const nbGroupes = await prisma.groupe.count();
    const nbAvecConseiller = await prisma.groupe.count({ where: { conseillerId: { not: null } } });
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
        titre: `Effectifs : ${nbAttendus} jeunes attendus, ${nbGroupes - nbAvecConseiller} conseillers à recruter`,
        contenu:
          `${nbAttendus} inscriptions actives réparties en ${nbGroupes} groupes de onze jeunes maximum, constitués par tranche d'âge (13-15 et 16 ans et plus) et par sexe, conformément au manuel de l'encadrant.\n\n` +
          `${nbAvecConseiller} groupes ont un conseiller ; il reste donc ${nbGroupes - nbAvecConseiller} conseillers à affecter. Les groupes sans conseiller apparaissent en évidence sur la page Groupes.`,
        cible: "COORDINATEURS",
        creeParId: dirigeant.id,
      },
    });
    await prisma.annonce.create({
      data: {
        titre: "Inscriptions à vérifier",
        contenu:
          "Sept inscriptions méritent une vérification : six participants ont plus de 18 ans au 3 août (20, 20, 21, 22, 23 et 28 ans) alors qu'ils sont enregistrés comme participants, et une date de naissance était saisie « 0012-08-23 », corrigée en « 2012-08-23 » à l'import.\n\n" +
          "Ces jeunes figurent dans les listes ; ajustez leur inscription ou leur rôle si nécessaire.",
        cible: "COORDINATEURS",
        creeParId: dirigeant.id,
      },
    });
  }

  console.log("✅ Base initialisée.");
  console.log("Comptes de démonstration (mot de passe : fsy2026) :");
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
