# Gestion FSY 2026 — Abidjan Ouest

Application web de gestion de l'événement FSY 2026 (Jeunes Adultes Seuls, août 2026) :
650+ participants, hiérarchie de rôles, arrivées/départs par cars, programme et annonces.

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
- **Programme** — vue par jour, création d'activités (générale / compagnie / groupe / multi-groupes), modification directe pour les coordinateurs, **propositions soumises à validation** pour les adjoints, annulation d'activités.
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
prisma/seed.ts             # données de démonstration
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
   ou importer un CSV).
