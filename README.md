# Gestion FSY 2026 — Abidjan Ouest

Application web de gestion de la conférence FSY 2026 (3 au 8 août 2026, Abidjan Ouest) :
650+ participants, hiérarchie de rôles, arrivées/départs par cars, programme et annonces.

> **Thème 2026 — « Marche avec moi »** (Moïse 6:34)
> « Les montagnes fuiront devant toi et les fleuves se détourneront de leur cours.
> Tu demeureras en moi et moi en toi ; c'est pourquoi, marche avec moi. »

## Participants

**663 inscriptions réelles** importées depuis le fichier d'inscription officiel
(647 approuvées, 14 annulées, 2 en attente), réparties sur **11 pieux et districts** :
Niangon North, Toit Rouge, Dabou, Selmer, Niangon South, Yopougon Attie, Niangon Central,
Tiassale, Mission West, Dakar Senegal et Roosevelt Utah West.

### Protection des données personnelles

Les participants sont des mineurs. Les données sont donc séparées en deux :

| Fichier | Contenu | Versionné |
|---|---|---|
| `prisma/participants.json` | Prénom, nom, nom d'usage, sexe, date de naissance, pieu, paroisse, taille de t-shirt, statut d'inscription | **Oui** — nécessaire au fonctionnement (groupes, cars, anniversaires) |
| `data/participants-sensibles.json` | Téléphone, adresse électronique, **renseignements médicaux**, contraintes alimentaires, contacts d'urgence | **Non** — `data/` est exclu du dépôt |

Le dossier `data/` (qui contient aussi le fichier Excel d'origine) n'est jamais versionné.
Pour charger les données sensibles sur une installation :

```bash
npm run import:sensibles    # lit data/participants-sensibles.json
```

Le formulaire d'inscription étant un champ libre, « rien à signaler » y est écrit d'une
vingtaine de façons (`aucun`, `RAS`, `néant`, `pas de régime alimentaire`, `il mange
tout`…). L'import ne conserve que les réponses porteuses d'information : **27 alertes
médicales** et **47 contraintes alimentaires** réelles, au lieu de 663 champs bruts. Les
conseillers voient ainsi des badges qui signalent quelque chose.

Chaque encadrant ne voit que les jeunes de son périmètre : un conseiller son groupe, un
adjoint sa compagnie, un coordinateur tous. Les informations médicales suivent cette
portée.

### Structure des groupes

Calculée depuis les inscriptions, selon les règles du manuel de l'encadrant (groupes de
dix à douze jeunes du même sexe ; compagnies constituées par tranche d'âge) :

| Tranche | Filles | Garçons | Total |
|---|---|---|---|
| 13-15 ans | 163 (15 groupes) | 138 (13 groupes) | 301 |
| 16 ans et plus | 194 (18 groupes) | 154 (14 groupes) | 348 |
| **Total** | **357** | **292** | **649 attendus** |

→ **60 groupes** et **27 compagnies**. Il faut donc **60 conseillers** et 27 paires de
coordinateurs adjoints. L'application affiche les groupes encore sans conseiller, et une
annonce le rappelle aux coordinateurs.

### Anomalies signalées à l'import

- Une date de naissance saisie `0012-08-23`, corrigée en `2012-08-23` (année tronquée).
- Six participants de plus de 18 ans au 3 août (20, 20, 21, 22, 23 et 28 ans) enregistrés
  comme participants — peut-être des conseillers inscrits via le même formulaire.

Ces deux points font l'objet d'une annonce automatique destinée aux coordinateurs.

## Anniversaires pendant la conférence

**10 jeunes** fêtent leur anniversaire entre le 2 et le 8 août 2026 (bornes incluses) :

| Date | Jeunes |
|---|---|
| dim. 2 août *(veille)* | 1 |
| lun. 3 août *(J1)* | 5 |
| mer. 5 août *(J3)* | 1 |
| jeu. 6 août *(J4)* | 1 |
| ven. 7 août *(J5)* | 1 |
| sam. 8 août *(J6)* | 1 |

Pour chaque date concernée, **trois annonces sont programmées à l'avance** — 18 au total :

| Échéance | Heure | Destinataires | Contenu |
|---|---|---|---|
| **J-2** | 8 h | Couple dirigeant et coordinateurs | Liste des jeunes avec âge et groupe, et ce qu'il reste à préparer (gâteau, moment de célébration à inscrire au programme, information des conseillers) |
| **J-1** | 8 h | Couple dirigeant et coordinateurs | Rappel et dernières vérifications |
| **Jour J** | 7 h | Tout le staff | Liste des jeunes à fêter, pour que les conseillers et les compagnies célèbrent |

Une annonce dont la date de publication est future reste **invisible** jusqu'à l'échéance.
Les coordinateurs voient la file des annonces à venir (`🕗 Annonces programmées`) et
peuvent en supprimer une. Les annonces générées automatiquement sont repérées comme
telles et régénérées à chaque amorçage.

Les jeunes concernés portent un badge 🎂 sur la page Jeunes, filtrable, et l'accueil
affiche un bandeau les jours d'anniversaire.

## Programme de la conférence

Le programme chargé dans l'application (`prisma/programme-fsy2026.ts`) couvre la veille
et les 6 jours de la conférence, du dimanche 2 au samedi 8 août 2026 — **138 activités,
dont 136 aux horaires officiels**.

**Sources**
1. *Manuel du participant — Conférence Jeunes, soyez forts 2026 : Marche avec moi*
   (PD80053002 140) : programmes des 1er au 5e jours.
2. *Manuel de l'encadrant* (PD80049773 140) : emploi du temps des encadrants du jour zéro
   au 6e jour, réunions d'encadrants, et **rôle attendu de chaque niveau hiérarchique pour
   chaque activité**.
3. Canevas des réunions spirituelles matinales des jours 2, 3 et 4 (PD80061859 140) :
   thèmes doctrinaux.

### Rôle attendu par activité

C'est l'apport central du manuel de l'encadrant : pour chaque activité, il précise ce que
fait chaque niveau. L'application affiche ce rôle et met en évidence ceux qui engagent une
responsabilité directe (`★ Vous dirigez`, `★ Vous enseignez`, `★ Vous supervisez`,
`★ Vous recevez l'appel`), par opposition à `Vous assistez`, `Si vous le souhaitez` ou
`Si la tâche vous est attribuée`.

Un conseiller ouvre l'application et voit ses **8 activités à diriger** du jour 2 (réunion
spirituelle des participants, étude de l'Évangile, appels, bannière et cri de ralliement,
directives du bal, « Réfléchir et revoir »…) sans avoir à les chercher dans le manuel.

Le rôle sert aussi de filtre : les réunions d'encadrants qui ne concernent pas un niveau
lui sont masquées. Un conseiller ne voit pas la réunion coordinateurs/adjoints de 13 h 50,
ni la réunion couple dirigeant/instructeurs de 8 h 45.

### Structure des journées

| Jour | Date | Tenue encadrants | Tenue jeunes | Temps forts |
|---|---|---|---|---|
| **Veille** | dim. 2 août | Vêtements du dimanche | — | *Encadrants uniquement* : visite du lieu, réunion d'accueil des conseillers, message du couple dirigeant, entretiens et planification |
| 1 | lun. 3 août | Tee-shirt encadrant | Décontractée | Réunion des encadrants ; arrivée 11h–13h ; rencontre du conseiller et de la compagnie ; réunion d'accueil ; soirée au foyer et fixation des buts |
| 2 | mar. 4 août | Tee-shirt encadrant | Décontractée | **1er jour des cours** ; « Les montagnes fuiront » ; bannière et cri de ralliement ; **bal** |
| 3 | mer. 5 août | Tee-shirt encadrant | **Tee-shirt FSY** | **Dernier jour des cours** ; « Demeure en moi » ; soirée jeux et cris de ralliement ; soirée plat préféré |
| 4 | jeu. 6 août | Vêtements du dimanche | Vêtements du dimanche | Réunions et activités **séparées** JG/JF ; spectacle de variétés ; spectacle musical ; veillée ; **réunions de témoignage** |
| 5 | ven. 7 août | Tee-shirt encadrant | Décontractée | Revue des buts ; activité du guide FSY ; « Vivre l'Évangile » ; bal ; message « À emporter chez soi » ; **veille de nuit** |
| 6 | sam. 8 août | Tee-shirt encadrant | Décontractée | **Départs dès 7 h** : préparation 6h30, vérification des chambres 7h–7h30, réunion de clôture 7h30–8h30 |

Ossature quotidienne (jours 2 à 5) : réunion adjoints/conseillers (7h00), réunion
spirituelle des participants par groupe (7h15), petit-déjeuner, étude de l'Évangile en
compagnie, réunion spirituelle du couple dirigeant, activités, appels, « Réfléchir et
revoir » par groupe (21h45), extinction des feux (22h30) et réunion coordinateurs/adjoints.

### Divergences entre les deux manuels

Les manuels se contredisent sur trois points ; voici les arbitrages retenus, tous
documentés en tête de `prisma/programme-fsy2026.ts` :

| Point | Manuel du participant | Manuel de l'encadrant | Retenu |
|---|---|---|---|
| J5, message « À emporter chez soi » | 20h15–21h45 | 20h15–20h45 | **Encadrant** — 21h45 chevauchait l'activité de 21h |
| J6, réunion de clôture | absent | 7h30–8h *(tableau)* / 7h30–8h30 *(3 sections)* | **7h30–8h30** |
| J4, répétition du medley | Jeunes Gens seulement | Jeunes Gens **et** Jeunes Filles | **Encadrant** |

### Statuts et ajustements locaux

| Statut | Signification |
|---|---|
| **PLANIFIE** | Horaire officiel des manuels (136 activités) |
| **A_CONFIRMER** | Horaires de la veille laissés libres par le manuel (2 activités) et lieux à renseigner |
| MODIFIE | Changement apporté après publication |
| ANNULE | Activité annulée |

Les manuels sont les manuels FSY *internationaux* : les responsables d'Abidjan Ouest
peuvent adapter certains créneaux et doivent renseigner les lieux. Tout se fait dans
l'application (page Programme) : les coordinateurs principaux modifient directement,
confirment activité par activité (**Confirmer**) ou journée entière (**Confirmer la
journée**), et les coordinateurs adjoints proposent des modifications soumises à
validation. Chaque changement est horodaté dans le journal d'audit.

### Organisation des activités

| Type | Sens |
|---|---|
| `GENERAL` | Tout le monde ensemble |
| `PAR_GROUPE` | Chaque groupe séparément, avec son conseiller |
| `PAR_COMPAGNIE` | Chaque compagnie séparément |
| `COMPAGNIE` / `GROUPE` / `MULTI_GROUPE` | Cibles précises |

Le champ `publicCible` (`TOUS` / `GARCONS` / `FILLES`) gère les activités croisées du
jour 4, et `pourEncadrants` distingue les réunions d'équipe des activités avec les jeunes.

## Démarrage

```bash
npm install
npm run setup     # génère le client Prisma, crée la base, insère les données de démo
npm run dev       # http://localhost:3000
```

### Comptes de démonstration (mot de passe : `fsy2026`)

| Rôle | Email |
|---|---|
| Couple dirigeant | `berenger@fsy2026.ci` |
| Coordinateur principal | `coordinateur@fsy2026.ci` |
| Coordinateur adjoint | `adjointm1@fsy2026.ci` |
| Conseiller | `conseiller1@fsy2026.ci` |

## Modules

- **Accueil** — statistiques en direct, programme du jour (filtré par groupe pour les conseillers), dernières annonces, alertes de validations en attente.
- **Cars** — pointage des jeunes par étape (montée au pieu, arrivée au site, départ), recherche rapide par nom, horodatage de chaque validation, historique complet.
- **Groupes** — réassignation dynamique : changer le conseiller d'un groupe, fusionner deux groupes, alerte de sur-capacité. Contrainte : groupe et conseiller du même sexe.
- **Jeunes** — 663 inscrits réels : recherche par nom/pieu/paroisse/groupe, âge, taille de t-shirt, statut d'inscription, badges 🎂 anniversaire, ⚕️ médical et 🍽 alimentaire, contact d'urgence ; filtres par onglet (anniversaires, à suivre, sans groupe) ; portée selon le rôle (conseiller → son groupe, adjoint → sa compagnie, coordinateur → tout) ; déplacement d'un jeune vers un autre groupe (coordinateurs).
- **Organigramme** — hiérarchie complète : couple dirigeant → coordinateurs principaux → compagnies (paires d'adjoints) → groupes (conseillers) → effectifs.
- **Programme** — vue par jour (veille à J6) avec **tenues vestimentaires** et **rôle attendu de votre niveau** pour chaque activité, plages horaires (début → fin), création d'activités, public ciblé, confirmation des horaires provisoires, modification directe pour les coordinateurs, **propositions soumises à validation** pour les adjoints, annulation d'activités. Par défaut, chacun ne voit que ce qui le concerne.
- **Annonces** — ciblées par rôle (tous, coordinateurs, adjoints, conseillers) et **programmables** : une annonce datée dans le futur reste invisible jusqu'à son échéance. Les 18 annonces d'anniversaire sont générées automatiquement.
- **Admin** — création de comptes, marquage présent/absent, octroi du droit de modification directe aux adjoints (couple dirigeant), **journal d'audit** (qui a fait quoi, quand).

## Matrice des permissions

| Action | Conseiller | Adjoint | Coordinateur | Dirigeant |
|---|:-:|:-:|:-:|:-:|
| Voir organigramme et programme | ✅ | ✅ | ✅ | ✅ |
| Voir les jeunes | Son groupe | Sa compagnie | Tous | Tous |
| Valider arrivées/départs aux cars | ✅ | ✅ | ✅ | ✅ |
| Voir l'historique des cars | — | Sa compagnie | Tout | Tout |
| Proposer une modification de programme | — | ✅ | (directe) | (directe) |
| Valider/rejeter les propositions | — | — | ✅ | ✅ |
| Réassigner jeunes/conseillers, fusionner | — | — | ✅ | ✅ |
| Créer annonces et activités | — | — | ✅ | ✅ |
| Créer des comptes | — | — | ✅ | ✅ |
| Gérer permissions et présences, audit | — | — | — | ✅ |

Le couple dirigeant peut accorder à un adjoint le droit `MODIFICATION_DIRECTE`
(modification du programme sans validation) depuis la page Admin.

## Structure du code

```
prisma/schema.prisma       # modèle de données commenté
prisma/programme-fsy2026.ts # programme officiel (sources et arbitrages documentés)
prisma/participants.json   # 663 inscrits, champs non sensibles (versionné)
prisma/anniversaires.ts    # fenêtre du 2 au 8 août et génération des annonces J-2/J-1/jour J
prisma/seed.ts             # amorçage : participants, groupes, programme, annonces
scripts/importer-sensibles.ts # charge les données médicales et contacts depuis data/ (hors dépôt)
src/lib/roles.ts           # hiérarchie des rôles et règles de permission
src/lib/auth.ts            # sessions JWT (cookie httpOnly)
src/lib/actions.ts         # toutes les mutations (server actions) avec contrôle d'accès + audit
src/app/(app)/…            # pages protégées (layout exige une session)
src/components/…           # composants interactifs (pointage car, recherche, programme…)
```

## Mise en production

1. Définir `AUTH_SECRET` (longue valeur aléatoire) dans `.env`.
2. `npm run build && npm start` sur un serveur Node (Railway, Render, VPS…).
   Pour Vercel, remplacer SQLite par PostgreSQL (Neon/Supabase) : changer
   `provider = "postgresql"` dans `prisma/schema.prisma` et `DATABASE_URL`.
3. **Le programme et les 663 participants sont réels.** Seule l'**équipe d'encadrement**
   (couple dirigeant, coordinateurs, adjoints, conseillers) reste fictive, en attente des
   listes officielles : 60 conseillers et 27 paires d'adjoints à créer.
4. Charger les données sensibles des participants avec `npm run import:sensibles` (le
   fichier source n'est pas versionné).
