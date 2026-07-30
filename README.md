# Gestion FSY 2026 — Abidjan Ouest

Application web de gestion de la conférence FSY 2026 (3 au 8 août 2026, Abidjan Ouest) :
650+ participants, hiérarchie de rôles, arrivées/départs par cars, programme et annonces.

> **Thème 2026 — « Marche avec moi »** (Moïse 6:34)
> « Les montagnes fuiront devant toi et les fleuves se détourneront de leur cours.
> Tu demeureras en moi et moi en toi ; c'est pourquoi, marche avec moi. »

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
- **Jeunes** — recherche par nom/pieu/groupe ; portée selon le rôle (conseiller → son groupe, adjoint → sa compagnie, coordinateur → tout) ; déplacement d'un jeune vers un autre groupe (coordinateurs).
- **Organigramme** — hiérarchie complète : couple dirigeant → coordinateurs principaux → compagnies (paires d'adjoints) → groupes (conseillers) → effectifs.
- **Programme** — vue par jour (veille à J6) avec **tenues vestimentaires** et **rôle attendu de votre niveau** pour chaque activité, plages horaires (début → fin), création d'activités, public ciblé, confirmation des horaires provisoires, modification directe pour les coordinateurs, **propositions soumises à validation** pour les adjoints, annulation d'activités. Par défaut, chacun ne voit que ce qui le concerne.
- **Annonces** — ciblées par rôle (tous, coordinateurs, adjoints, conseillers).
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
prisma/seed.ts             # équipe et jeunes de démonstration + chargement du programme
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
3. Remplacer les données de démo par les vraies listes (adapter `prisma/seed.ts`
   ou importer un CSV). **Le programme est déjà réel** ; seuls l'équipe et les
   jeunes restent fictifs en attendant les listes officielles.
