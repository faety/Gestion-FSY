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
import { DOMAINE_ATTENTE, transfererReferences } from "../src/lib/fusion";
import { jetons, proximite } from "../src/lib/rapprochement";
import { lireDroits, roleAuMoins, type Role } from "../src/lib/roles";
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
  //
  // Quand la personne existe déjà sous sa vraie adresse — e-mail changé sur le
  // compte d'amorçage, ou compte rattaché —, on ne recrée pas l'identifiant
  // d'attente : ce serait ressusciter un doublon à chaque déploiement, avec le
  // mot de passe commun en prime.
  //
  // On la reconnaît comme la page des doublons le fait, par les mots du nom et
  // non à la lettre : entre la liste officielle et l'inscription, l'ordre
  // s'inverse (« Okon Emmanuel Wisdom » / « Wisdom Emmanuel Okon »), un accent
  // tombe (« Kone » / « Koné »), un prénom s'ajoute (« Nassira » / « Nassira
  // priscille »). L'égalité stricte laissait tous ces cas renaître.
  const memePersonne = (
    a: { prenom: string; nom: string },
    b: { prenom: string; nom: string }
  ) => {
    const ja = jetons(a.prenom, a.nom);
    const jb = jetons(b.prenom, b.nom);
    const communs = ja.filter((m) => jb.includes(m)).length;
    return communs >= 2 && proximite(ja, jb) >= 0.99;
  };
  const dejaSousSaVraieAdresse = async (nom: string, prenom: string) => {
    const reels = await prisma.user.findMany({
      where: { NOT: { email: { endsWith: DOMAINE_ATTENTE, mode: "insensitive" } } },
      select: { id: true, prenom: true, nom: true },
    });
    return reels.find((r) => memePersonne({ prenom, nom }, r)) ?? null;
  };

  const creerUser = async (
    email: string,
    nom: string,
    prenom: string,
    sexe: string,
    role: string,
    telephone?: string
  ) => {
    const existant = await prisma.user.findUnique({ where: { email } });
    if (existant) {
      return prisma.user.update({ where: { email }, data: { nom, prenom, telephone } });
    }
    const reel = await dejaSousSaVraieAdresse(nom, prenom);
    if (reel) return reel;
    return prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        nom,
        prenom,
        sexe,
        role,
        telephone,
        doitChangerMotDePasse: true,
      },
    });
  };

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
    const existant = await prisma.user.findUnique({ where: { email: p.email } });
    if (existant) {
      // Le rôle et l'orthographe du nom peuvent changer d'une liste à l'autre ;
      // ni le sexe ni les affectations ne sont écrasés, car ils ont pu être
      // corrigés à la main dans l'application.
      await prisma.user.update({ where: { email: p.email }, data: { nom, prenom, role: p.role } });
      continue;
    }
    // Même règle que pour le couple dirigeant et les coordinateurs : pas de
    // résurrection quand la personne s'est établie sous sa vraie adresse.
    if (await dejaSousSaVraieAdresse(nom, prenom)) continue;
    await prisma.user.create({
      data: {
        email: p.email,
        passwordHash: hash,
        nom,
        prenom,
        // Le sexe ne figure dans aucun document : il est déduit du prénom, et
        // reste corrigeable. Quand il est indéterminé on retient « F », un
        // groupe de filles sans conseillère étant plus difficile à combler.
        sexe: p.sexe ?? "F",
        role: p.role,
        // Mot de passe commun au premier accès : l'application impose d'en
        // choisir un autre dès la première connexion.
        doitChangerMotDePasse: true,
      },
    });
  }
  const nbAdjoints = encadrement.filter((p) => p.role === "ADJOINT").length;
  console.log(
    `   ${encadrement.length} encadrants : ${nbAdjoints} adjoints, ${encadrement.length - nbAdjoints} conseillers (affectations à faire dans l'application).`
  );

  // ---------- Un seul compte par personne ----------
  //
  // Décision du couple dirigeant : seuls les profils à vraie adresse restent.
  // Un compte d'attente (@fsy2026.ci) qui coexiste avec le compte réel de la
  // même personne est un doublon — l'organigramme la montrait deux fois. On
  // reverse au compte réel ce que l'attente portait encore (appel le plus
  // élevé, droits, groupes, affectations, photo, téléphone), puis on le
  // supprime. Il ne renaîtra pas : la personne est reconnue plus haut par son
  // nom avant toute création.
  const attentes = await prisma.user.findMany({
    where: { email: { endsWith: DOMAINE_ATTENTE, mode: "insensitive" } },
  });
  const comptesReels = await prisma.user.findMany({
    where: { NOT: { email: { endsWith: DOMAINE_ATTENTE, mode: "insensitive" } } },
  });
  for (const attente of attentes) {
    // La résorption n'agit que sur une paire sans ambiguïté : un seul compte
    // réel reconnu « certain » pour cette attente, et aucune autre attente
    // reconnue « certain » pour ce compte réel. Deux personnes distinctes des
    // listes officielles ne doivent jamais se fondre dans un même compte —
    // tout ce qui prête à discussion reste à la page Administration.
    const correspondants = comptesReels.filter((r) => memePersonne(attente, r));
    if (correspondants.length !== 1) {
      if (correspondants.length > 1) {
        console.log(
          `   ⚠️  ${attente.email} ressemble à plusieurs comptes réels : fusion laissée à la page Administration.`
        );
      }
      continue;
    }
    const candidat = correspondants[0];
    if (attentes.some((x) => x.id !== attente.id && memePersonne(x, candidat))) {
      console.log(
        `   ⚠️  Plusieurs identifiants d'attente ressemblent à ${candidat.email} : fusion laissée à la page Administration.`
      );
      continue;
    }
    const reel = await prisma.user.findUniqueOrThrow({
      where: { id: candidat.id },
      include: { rapports: { select: { jour: true } } },
    });

    // Mêmes garde-fous que la fusion manuelle : on ne résorbe pas ce qui
    // effacerait du travail. Le cas est improbable pour un compte d'attente ;
    // s'il se présente, il reste visible sur la page Administration.
    const rapportsAttente = await prisma.rapportQuotidien.findMany({
      where: { auteurId: attente.id },
      select: { jour: true },
    });
    const conflitRapports = rapportsAttente.some((r) =>
      reel.rapports.some((x) => x.jour === r.jour)
    );
    const attestations = await prisma.attestation.count({
      where: { userId: { in: [attente.id, reel.id] } },
    });
    if (conflitRapports || attestations > 1) {
      console.log(
        `   ⚠️  ${attente.email} et ${reel.email} portent des données en conflit : fusion laissée à la page Administration.`
      );
      continue;
    }

    const droits = [
      ...new Set([...lireDroits(reel.droitsSupplementaires), ...lireDroits(attente.droitsSupplementaires)]),
    ];
    // L'appel le plus élevé des deux : résorber un doublon ne doit jamais
    // faire perdre un accès que la personne exerçait déjà.
    const plusHaut = roleAuMoins(attente.role, reel.role as Role) ? attente.role : reel.role;
    await prisma.$transaction(async (tx) => {
      await transfererReferences(tx, attente.id, reel.id);
      await tx.user.delete({ where: { id: attente.id } });
      await tx.user.update({
        where: { id: reel.id },
        data: {
          role: plusHaut,
          droitsSupplementaires: JSON.stringify(droits),
          telephone: reel.telephone ?? attente.telephone,
          photoPublicId: reel.photoPublicId ?? attente.photoPublicId,
          dateNaissance: reel.dateNaissance ?? attente.dateNaissance,
          pieuId: reel.pieuId ?? attente.pieuId,
          compagnieId: reel.compagnieId ?? attente.compagnieId,
          valide: true,
          actif: reel.actif || attente.actif,
        },
      });
    });
    console.log(
      `   🧹 Doublon résorbé : ${attente.email} supprimé — ${reel.prenom} ${reel.nom} ne garde que ${reel.email}.`
    );
  }

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
  // L'adresse d'amorçage a pu céder la place à la vraie : on retrouve le
  // dirigeant par son appel et son nom, plus par un e-mail qui n'existe
  // peut-être plus.
  const dirigeant =
    (await prisma.user.findFirst({
      where: {
        role: "DIRIGEANT",
        prenom: { equals: "Bérenger", mode: "insensitive" },
        nom: { equals: "Dahakpoin", mode: "insensitive" },
      },
    })) ?? (await prisma.user.findFirst({ where: { role: "DIRIGEANT" } }));

  if ((await prisma.activite.count()) === 0) {
    for (const a of PROGRAMME) {
      await prisma.activite.create({
        data: {
          officielle: true,
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
  } else {
    // ---------- La conférence a-t-elle changé de dates ? ----------
    //
    // Le programme n'est semé qu'une fois. Quand la conférence a été déplacée
    // du 3-8 août au 24-29, la base a gardé les anciens horaires : les journées
    // affichaient les nouvelles dates, les activités les anciennes, et plus
    // rien ne se rapportait à rien — les onglets s'intitulaient « J ? ».
    //
    // Le décalage est donc rattrapé ici, à chaque déploiement, sans que
    // personne ait à y penser. Un décalage *uniforme* de jours entiers : il
    // remet le calendrier en place sans toucher aux heures, donc sans défaire
    // un horaire ajusté sur place — ce qu'une réécriture depuis la référence
    // aurait fait.

    // La base de production a été semée avant que le drapeau « officielle »
    // n'existe : ses activités portent la valeur par défaut, false, et tout ce
    // qui vise le programme officiel — ce décalage, la resynchronisation —
    // passait au travers sans un mot. Tant qu'aucune activité n'est marquée,
    // celles dont le titre est celui de la référence le deviennent.
    if ((await prisma.activite.count({ where: { officielle: true } })) === 0) {
      const marquees = await prisma.activite.updateMany({
        where: { titre: { in: [...new Set(PROGRAMME.map((a) => a.titre))] } },
        data: { officielle: true },
      });
      if (marquees.count > 0) {
        console.log(`   🏷️  ${marquees.count} activités reconnues comme programme officiel.`);
      }
    }

    const officielles = await prisma.activite.findMany({
      where: { officielle: true },
      orderBy: { debut: "asc" },
      select: { titre: true, debut: true },
    });
    if (officielles.length > 0) {
      // L'écart se mesure titre par titre — première occurrence en base contre
      // première occurrence de la référence — et c'est l'écart majoritaire qui
      // l'emporte. Supposer que la plus ancienne activité en base est celle de
      // la veille casserait dès qu'elle aurait été renommée ou retirée.
      const jourDe = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const enBase = new Map<string, Date>();
      for (const a of officielles) if (!enBase.has(a.titre)) enBase.set(a.titre, a.debut);
      const reference = new Map<string, number>();
      for (const a of PROGRAMME) if (!reference.has(a.titre)) reference.set(a.titre, a.jour);
      const votes = new Map<number, number>();
      for (const [titre, debut] of enBase) {
        const jour = reference.get(titre);
        if (jour === undefined) continue;
        const ecart = Math.round((jourDe(dateDe(jour, "00:00")) - jourDe(debut)) / 86_400_000);
        votes.set(ecart, (votes.get(ecart) ?? 0) + 1);
      }
      const ecartJours = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
      if (ecartJours !== 0) {
        // Toute l'ancienne période part d'un bloc, y compris ce qui n'y est pas
        // marqué officiel : une activité ajoutée sur place l'a été pour la
        // conférence, elle déménage avec elle. Ce qui vit hors de la période ne
        // bouge pas.
        const jours = PROGRAMME.map((a) => a.jour);
        const ms = ecartJours * 86_400_000;
        const ancienDebut = new Date(jourDe(dateDe(Math.min(...jours), "00:00")) - ms);
        const ancienneFin = new Date(jourDe(dateDe(Math.max(...jours), "00:00")) - ms + 86_400_000);
        const aDeplacer = await prisma.activite.findMany({
          where: { debut: { gte: ancienDebut, lt: ancienneFin } },
          select: { id: true, debut: true, fin: true },
        });
        for (const a of aDeplacer) {
          await prisma.activite.update({
            where: { id: a.id },
            data: {
              debut: new Date(a.debut.getTime() + ms),
              fin: a.fin ? new Date(a.fin.getTime() + ms) : null,
            },
          });
        }
        console.log(
          `   ⏩ Programme décalé de ${ecartJours > 0 ? "+" : ""}${ecartJours} jours : ` +
            `${aDeplacer.length} activités replacées sur la nouvelle période.`
        );
      }
    }
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
          "Huit inscriptions approuvées méritent une vérification : sept participants dépassent 18 ans avant la fin de la conférence (19, 20, 20, 21, 22, 23 et 28 ans au 29 août) alors qu'ils sont enregistrés comme participants, et une date de naissance est saisie « 0012-08-23 » — elle est conservée telle quelle et signalée, pas corrigée d'office.\n\n" +
          "Le cas des 19 ans mérite un mot : né le 28 août 2007, ce jeune a bien 18 ans le jour de l'ouverture, mais les atteint pendant le séjour. La limite vaut pour toute la durée de la conférence, elle se lit donc au dernier jour.\n\n" +
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
  console.log("  (adresses d'amorçage : dès que la personne passe à sa vraie adresse, l'ancienne disparaît)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
