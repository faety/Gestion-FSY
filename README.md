# Gestion FSY 2026 — Abidjan Ouest

Application web de gestion de la conférence FSY 2026 (3 au 8 août 2026, Abidjan Ouest) :
650+ participants, hiérarchie de rôles, arrivées/départs par cars, programme et annonces.

> **Thème 2026 — « Marche avec moi »** (Moïse 6:34)
> « Les montagnes fuiront devant toi et les fleuves se détourneront de leur cours.
> Tu demeureras en moi et moi en toi ; c'est pourquoi, marche avec moi. »

## Programme de la conférence

Le programme chargé dans l'application (`prisma/programme-fsy2026.ts`) couvre les
6 jours, du lundi 3 au samedi 8 août 2026 — 55 activités. Chaque activité porte un
statut qui distingue l'officiel du provisoire :

| Statut | Signification |
|---|---|
| **PLANIFIE** | Horaire **et** contenu confirmés par les canevas officiels FSY 2026 |
| **A_CONFIRMER** | Structure standard d'une journée FSY — horaire à valider avec le manuel du personnel |
| MODIFIE | Changement apporté après publication |
| ANNULE | Activité annulée |

### Ce qui provient des canevas officiels reçus

- **Jour 2** (mar. 4) — réunion spirituelle « Les montagnes fuiront, les fleuves se
  détourneront » : Dieu fait concourir toutes choses à notre bien ; **premier jour des cours**.
- **Jour 3** (mer. 5) — réunion spirituelle « Demeure en moi et je demeurerai en toi » :
  choisir d'entrer et de rester dans une relation d'alliance ; **dernier jour des cours**.
- **Jour 4** (jeu. 6) — réunions spirituelles **séparées** Jeunes Gens / Jeunes Filles
  de **9 h 45 à 10 h 45** (60 min, plus longues que les autres), puis **répétition du
  medley de la conférence de 10 h 45 à 11 h 00**. *Seuls horaires officiels connus.*
- Réunion **« Réfléchir et revoir »** en compagnie à la fin de chaque journée.

### Ce qui reste à confirmer

Repas, arrivées/départs, activités sportives, service, danse, veillée, réunion de
témoignages et clôture suivent la structure standard d'une conférence FSY. L'heure de
9 h 45 pour les réunions spirituelles des autres jours est alignée sur le seul horaire
officiel connu (jour 4).

Les coordinateurs principaux confirment activité par activité (bouton **Confirmer**) ou
journée entière (**Confirmer la journée**) depuis la page Programme. Corriger l'horaire
d'une activité « À confirmer » la rend automatiquement définitive. Les horaires complets
se trouvent dans le *2026 FSY International Staff Handbook*, à intégrer une fois disponible.

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
- **Programme** — vue par jour (J1 à J6), création d'activités (générale / compagnie / groupe / multi-groupes), public ciblé (tous / Jeunes Gens / Jeunes Filles), confirmation des horaires provisoires, modification directe pour les coordinateurs, **propositions soumises à validation** pour les adjoints, annulation d'activités. Les conseillers ne voient par défaut que les activités concernant leurs groupes (un conseiller de groupe de filles ne voit pas la réunion spirituelle des Jeunes Gens).
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
