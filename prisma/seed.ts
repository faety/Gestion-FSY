// Amorçage de la base — FSY 2026 Abidjan Ouest
//
// Données réelles : les 650 participants inscrits (prisma/participants.json), les
// pieux/districts, les cars, la structure des groupes et compagnies, le programme
// officiel, les annonces d'anniversaire, le couple dirigeant et les deux
// coordinateurs principaux.
//
// L'encadrement est réel lui aussi (prisma/encadrement.json) : couple dirigeant,
// deux coordinateurs principaux, 10 adjoints et 52 conseillers. Seules les
// affectations aux compagnies et aux groupes restent à décider.
//
// Ce script est rejouable : il est exécuté à chaque déploiement. Tout est soit
// un upsert, soit protégé par un test « la table est-elle vide ? ». Il ne
// supprime que les annonces d'anniversaire, qu'il régénère aussitôt. Les
// rapports quotidiens, les pointages de cars et les activités créées par les
// coordinateurs ne sont jamais touchés.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PROGRAMME, DATE_JOUR_1, JOURNEES, THEME_FSY } from "./programme-fsy2026";
import { annoncesAnniversaires, anniversairePendantConference } from "./anniversaires";
import participants from "./participants.json";
import encadrement from "./encadrement.json";

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

  // ---------- Équipe d'encadrement ----------
  const creerUser = (
    email: string,
    nom: string,
    prenom: string,
    sexe: string,
    role: string,
    telephone?: string
  ) =>
    prisma.user.upsert({
      where: { email },
      update: { nom, prenom, telephone },
      create: { email, passwordHash: hash, nom, prenom, sexe, role, telephone },
    });

  // Couple dirigeant de la conférence (réel)
  await creerUser("berenger@fsy2026.ci", "Dahakpoin", "Bérenger", "M", "DIRIGEANT");
  await creerUser("armande@fsy2026.ci", "Dahakpoin", "Armande", "F", "DIRIGEANT");

  // Coordinateurs principaux (réels) — un homme et une femme
  await creerUser(
    "cedric@fsy2026.ci",
    "Kouassi",
    "Allegra Cédric",
    "M",
    "COORDINATEUR",
    "+225 0574653742"
  );
  await creerUser(
    "candela@fsy2026.ci",
    "Yao",
    "Aquicy Candela Eméraude",
    "F",
    "COORDINATEUR",
    "+225 0594254834"
  );

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
  }

  // ---------- Encadrement réel (listes officielles) ----------
  // prisma/encadrement.json vient du rapprochement de deux documents : la liste
  // des conseillers proposés par les pieux et districts, et la liste des
  // personnes ayant confirmé leur présence avec leur rôle définitif.
  //
  // Les affectations aux compagnies et aux groupes ne figurent dans aucun des
  // deux documents : elles se décident dans l'application — page Groupes pour
  // les conseillers, page Administration pour les adjoints.
  for (const p of encadrement) {
    // Convention des listes officielles : le patronyme précède les prénoms.
    // « Zilé Patricia Yro » se lit nom = Zilé, prénoms = Patricia Yro — comme
    // « Kouassi Allegra Cédric » pour le coordinateur principal. Sans cela,
    // l'accueil dirait « Bonjour Zilé », c'est-à-dire le nom de famille.
    const mots = p.nom.trim().split(/\s+/);
    const nom = mots[0];
    const prenom = mots.slice(1).join(" ") || mots[0];
    await prisma.user.upsert({
      where: { email: p.email },
      // Le rôle et l'orthographe du nom peuvent changer d'une liste à l'autre ;
      // ni le sexe ni les affectations ne sont écrasés, car ils ont pu être
      // corrigés à la main dans l'application.
      update: { nom, prenom, role: p.role },
      create: {
        email: p.email,
        passwordHash: hash,
        nom,
        prenom,
        // Le sexe ne figure dans aucun document : il est déduit du prénom, et
        // reste corrigeable. Quand il est indéterminé on retient « F », un
        // groupe de filles sans conseillère étant plus difficile à combler.
        sexe: p.sexe ?? "F",
        role: p.role,
      },
    });
  }
  const nbAdjoints = encadrement.filter((p) => p.role === "ADJOINT").length;
  console.log(
    `   ${encadrement.length} encadrants : ${nbAdjoints} adjoints, ${encadrement.length - nbAdjoints} conseillers (affectations à faire dans l'application).`
  );

  // ---------- Cars : un par pieu/district ----------
  // Le pointage est affecté étape par étape par le couple dirigeant ou les
  // coordinateurs principaux (page Cars). Aucune affectation par défaut : les
  // cars sans personne désignée sont signalés dans l'application.
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

  const coordinateur = await prisma.user.findFirst({
    where: { role: "COORDINATEUR" },
    orderBy: { email: "asc" },
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
    const nbCompagnies = await prisma.compagnie.count();
    await prisma.annonce.create({
      data: {
        titre: `Effectifs : ${nbAttendus} jeunes attendus, ${nbGroupes - nbAvecConseiller} conseillers à recruter`,
        contenu:
          `${nbAttendus} inscriptions actives réparties selon l'affectation officielle : ${nbCompagnies} compagnies de deux groupes — groupe 1 pour les filles, groupe 2 pour les garçons — soit ${nbGroupes} groupes de neuf jeunes en moyenne. Les âges et les pieux y sont volontairement mélangés.\n\n` +
          `${nbAvecConseiller} groupes ont un conseiller ; il reste donc ${nbGroupes - nbAvecConseiller} conseillers à affecter. Les groupes sans conseiller apparaissent en évidence sur la page Groupes.`,
        cible: "COORDINATEURS",
        creeParId: dirigeant.id,
      },
    });
    await prisma.annonce.create({
      data: {
        titre: "Inscriptions à vérifier",
        contenu:
          "Sept inscriptions approuvées méritent une vérification : six participants ont plus de 18 ans au 3 août (20, 20, 21, 22, 23 et 28 ans) alors qu'ils sont enregistrés comme participants, et une date de naissance est saisie « 0012-08-23 » — elle est conservée telle quelle et signalée, pas corrigée d'office.\n\n" +
          "Trois personnes apparaissent aussi deux fois parmi les inscriptions approuvées. La page Pieux et districts détaille ces cas avec les éléments permettant de trancher.",
        cible: "COORDINATEURS",
        creeParId: dirigeant.id,
      },
    });
  }

  console.log("✅ Base initialisée.");
  console.log("Comptes (mot de passe : fsy2026) :");
  console.log("  Couple dirigeant         : berenger@fsy2026.ci · armande@fsy2026.ci");
  console.log("  Coordinateurs principaux : cedric@fsy2026.ci · candela@fsy2026.ci");
  console.log(`  Encadrants               : ${encadrement.length} comptes, adresses prenom.nom@fsy2026.ci`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
