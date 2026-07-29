# Gestion FSY 2026 — Abidjan Ouest

Application web de gestion de la conférence FSY 2026 (3 au 8 août 2026, Abidjan Ouest) :
650+ participants, hiérarchie de rôles, arrivées/départs par cars, programme et annonces.

> **Thème 2026 — « Marche avec moi »** (Moïse 6:34)
> « Les montagnes fuiront devant toi et les fleuves se détourneront de leur cours.
> Tu demeureras en moi et moi en toi ; c'est pourquoi, marche avec moi. »

## Programme de la conférence

Le programme chargé dans l'application (`prisma/programme-fsy2026.ts`) couvre les
6 jours, du lundi 3 au samedi 8 août 2026 — **102 activités, dont 97 aux horaires
officiels**.

**Source** : *Manuel du participant — Conférence Jeunes, soyez forts 2026 : Marche avec
moi* (PD80053002 140), programmes des 1er au 5e jours, complété par les canevas officiels
des réunions spirituelles matinales des jours 2, 3 et 4 (PD80061859 140) pour les thèmes
doctrinaux.

| Statut | Signification |
|---|---|
| **PLANIFIE** | Horaire officiel du manuel du participant (97 activités) |
| **A_CONFIRMER** | Jour 6 (départs, absent du manuel) et lieux à renseigner (5 activités) |
| MODIFIE | Changement apporté après publication |
| ANNULE | Activité annulée |

### Structure des journées

| Jour | Date | Tenue | Temps forts |
|---|---|---|---|
| 1 | lun. 3 août | Décontractée | Arrivée 11h–13h, connaissance du conseiller et de la compagnie, réunion d'accueil, soirée au foyer et fixation des buts |
| 2 | mar. 4 août | Décontractée | **1er jour des cours** ; réunion spirituelle « Les montagnes fuiront » ; bannière et cri de ralliement ; **bal** |
| 3 | mer. 5 août | **Tee-shirt FSY** | **Dernier jour des cours** ; « Demeure en moi et je demeurerai en toi » ; soirée jeux et cris de ralliement ; soirée plat préféré |
| 4 | jeu. 6 août | **Vêtements du dimanche** | Réunions spirituelles et activités **séparées** Jeunes Gens / Jeunes Filles ; spectacle de variétés ; spectacle musical ; veillée ; **réunions de témoignage** |
| 5 | ven. 7 août | Décontractée | Évaluation des buts ; activité du guide FSY ; activité « Vivre l'Évangile » (histoire familiale) ; bal ; message « À emporter chez soi » |
| 6 | sam. 8 août | Décontractée | Départs *(à confirmer)* |

Chaque journée suit la même ossature : réunion spirituelle des participants (7h15, par
groupe), petit-déjeuner, étude de l'Évangile, réunion spirituelle avec le couple
dirigeant, activités, appels avec la compagnie, puis **« Réfléchir et revoir »** en
groupe (21h45) et extinction des feux (22h30).

### Organisation des activités

Le champ `type` indique qui se réunit :

| Type | Sens |
|---|---|
| `GENERAL` | Tout le monde ensemble |
| `PAR_GROUPE` | Chaque groupe séparément, avec son conseiller (réunion spirituelle des participants, appels, « Réfléchir et revoir ») |
| `PAR_COMPAGNIE` | Chaque compagnie séparément (soirée au foyer, cri de ralliement, témoignages) |
| `COMPAGNIE` / `GROUPE` / `MULTI_GROUPE` | Cibles précises |

Le champ `publicCible` (`TOUS` / `GARCONS` / `FILLES`) gère les activités séparées du
jour 4 : un conseiller de groupe de filles ne voit pas la réunion des Jeunes Gens.

### Ajustements locaux

Le manuel est le manuel FSY *international* : les responsables d'Abidjan Ouest peuvent
adapter certains créneaux et doivent renseigner les lieux. Tout se fait dans
l'application (page Programme) : les coordinateurs principaux modifient directement,
confirment activité par activité (**Confirmer**) ou journée entière (**Confirmer la
journée**), et les coordinateurs adjoints proposent des modifications soumises à
validation. Chaque changement est horodaté dans le journal d'audit.

## Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 15** (App Router, Server Actions) | Frontend + backend dans une seule app, simple à héberger |
| Style | **Tailwind CSS 4** | Design responsive mobile-first (les conseillers sont sur téléphone) |
| Base de données | **SQLite + Prisma** | Zéro configuration ; migrable vers PostgreSQL en changeant une ligne |
| Authentification | Sessions **JWT** en cookie httpOnly (jose) + bcrypt | Simple et sûr, pas de service externe |
| Autorisation | **RBAC** à 4 niveaux + droits supplémentaires accordables | Correspond exactement à la hiérarchie FSY |

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
- **Programme** — vue par jour (J1 à J6) avec **tenue vestimentaire du jour**, plages horaires (début → fin), création d'activités, public ciblé (tous / Jeunes Gens / Jeunes Filles), confirmation des horaires provisoires, modification directe pour les coordinateurs, **propositions soumises à validation** pour les adjoints, annulation d'activités. Les conseillers ne voient par défaut que les activités concernant leurs groupes.
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
prisma/programme-fsy2026.ts # programme réel de la conférence (sources documentées)
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
