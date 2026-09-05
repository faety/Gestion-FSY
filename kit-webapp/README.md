# Kit webapp — socle réutilisable

Tout ce qui, dans Gestion FSY 2026, a servi et resservira : la base de données,
les comptes et la connexion, les photos chez Cloudinary, les e-mails, les
documents PDF et l'impression, les archives ZIP, l'administration. Le tout
dépouillé de ce qui était propre à la conférence, et **vérifié** : le kit se
compile, s'amorce, se connecte, imprime une A4 paysage bord à bord, produit un
PDF et un ZIP — le script `scripts/verifier.mjs` le rejoue dans un vrai navigateur.

Il n'y a rien de théorique ici : chaque fichier est la version épurée d'un
fichier qui a tourné en production pendant la conférence.

## Ce qu'il y a dedans

| Besoin | Où | Ce que ça fait |
|---|---|---|
| **Base de données** | `prisma/schema.prisma`, `src/lib/db.ts` | PostgreSQL (Neon en prod, local par `scripts/postgres-local.sh`). Client Prisma unique, `connection_limit=1` sur Vercel. Schéma socle : User, TentativeConnexion, ReinitialisationMotDePasse, AuditLog, Reglage. |
| **Amorçage rejouable** | `prisma/seed.ts` | Exécuté à chaque déploiement. Premier admin créé s'il manque ; `uneSeuleFois(clé, …)` pour ce qui ne doit se faire qu'une fois (jalon dans AuditLog). |
| **Comptes et connexion** | `src/lib/auth.ts`, `src/lib/actions.ts` | Session JWT (jose) en cookie httpOnly, bcrypt, frein anti-essais (8 échecs / 15 min, sans verrouiller), mot de passe provisoire imposé à la première connexion, lien « mot de passe oublié » (empreinte SHA-256, 3 h, usage unique, réponse neutre). |
| **Rôles** | `src/lib/roles.ts` | Hiérarchie ADMIN > GESTIONNAIRE > MEMBRE, `roleAuMoins`, libellés accordés au genre (`libelleRoleAccorde`). |
| **Photos** | `src/lib/cloudinary.ts`, `src/components/PhotoProfil.tsx` | Envoi direct navigateur → Cloudinary avec signature serveur, réduction dans le navigateur, livraison par URL signée, dossiers par usage, suppression jamais bloquante, contrôle du `public_id`. |
| **E-mails** | `src/lib/email.ts` | Resend. Sans clef, rien ne casse. Gabarit HTML + texte, messages prêts (réinitialisation, compte créé, essai), `diagnosticEnvoi()` qui dit ce qui cloche. |
| **PDF côté serveur** | `src/lib/pdf.ts`, `src/app/api/exemple.pdf/route.ts` | pdf-lib : `Composeur` (paragraphes découpés, titres, tableau multipage, QR code), en-tête au logo, `reponsePdf`. |
| **Impression depuis le navigateur** | `src/components/FeuilleImprimable.tsx`, `src/app/(app)/impression/page.tsx` | Feuille composée en millimètres, réduite à l'écran, taille réelle à l'impression. Paysage déclaré en `@page`, jamais tourné par CSS. |
| **Archive ZIP en flux** | `src/lib/zip.ts`, `src/app/api/exemple.zip/route.ts` | Sans bibliothèque, fichiers rangés tels quels, la réponse part dès le premier fichier. |
| **Réglages** | `src/lib/reglages.ts` | Clé/valeur en base, basculés depuis l'administration. Exemple : lecture seule (tout le monde sauf ADMIN limité à l'accueil et au profil). |
| **Journal** | `src/lib/audit.ts` | `journaliser` et `journaliserConsultation` (une trace par demi-journée pour les consultations sensibles). |
| **Administration** | `src/app/(app)/admin/page.tsx` | État des services, essai d'e-mail, lecture seule, création de comptes avec provisoire à dicter, rôles, désactivation, journal. |
| **Gabarit connecté** | `src/app/(app)/layout.tsx`, `src/middleware.ts` | Les contrôles (session, provisoire, lecture seule) dans le gabarit commun ; le middleware recopie le chemin demandé dans `x-chemin`. |
| **Vérification** | `scripts/verifier.mjs` | Playwright : connexion, pages, PDF (A4, 1 page), ZIP, impression (paysage, 1 page), déconnexion. |
| **Pour Claude Code** | `CLAUDE.md`, `.claude/skills/*` | Conventions du projet et sept compétences (socle, base, Cloudinary, e-mails, authentification, impression/PDF, déploiement). |
| **Leçons** | `docs/lecons.md` | Ce qui a coûté du temps une fois et ne doit plus le coûter. |

## Démarrer un nouveau projet

```bash
# 1. Copier le kit sous le nom du projet
cp -r kit-webapp mon-projet && cd mon-projet
git init

# 2. L'identité : nom, identifiant court, couleurs, signature
#    → src/lib/app.ts   (et les couleurs dans src/app/globals.css)
#    → package.json : "name"
#    → public/logo.png  (facultatif : sans lui, un sigle s'affiche)

# 3. Les variables
cp .env.example .env
#    DATABASE_URL  : Neon (console.neon.tech) ou base locale (scripts/postgres-local.sh init)
#    AUTH_SECRET   : openssl rand -base64 48
#    SEED_ADMIN_*  : le premier compte

# 4. Installer, amorcer, lancer
npm install
npm run setup          # prisma generate + db push + seed
npm run dev            # http://localhost:3000 → connexion avec SEED_ADMIN_*
```

Première connexion : le mot de passe de l'environnement est provisoire,
l'application impose d'en choisir un autre. Puis **Administration** : état des
services, essai d'e-mail, création des autres comptes.

## Ajouter le métier

1. **Modèles** : à la suite de `prisma/schema.prisma`, puis `npm run db:push`.
2. **Actions** : dans `src/lib/actions.ts` (ou un fichier par domaine, avec
   `"use server"` en tête). Commencer par `exiger("RÔLE")`. Renvoyer
   `{ ok: false, motif }` pour un refus — ne pas lever.
3. **Pages** : sous `src/app/(app)/…`, avec `exigerUtilisateur()` ou
   `exigerRole("…")` en première ligne. Le lien dans `liens` du gabarit.
4. **Documents** : pdf-lib pour les listes et rapports (`/api/….pdf`),
   `FeuilleImprimable` pour les attestations et diplômes.
5. **Vérifier** : `npm run build && npm run start`, puis `npm run verifier`
   (adapter le script à mesure que des pages s'ajoutent).

## Mettre en ligne (Vercel)

1. Dépôt GitHub, projet Vercel importé depuis ce dépôt (préréglage Next.js).
2. Variables d'environnement dans Vercel — **sans guillemets** — puis redéployer.
3. Base Neon : la chaîne de connexion dans `DATABASE_URL`. Le script `build`
   pousse le schéma et amorce à chaque déploiement.
4. Domaine : dans Vercel → Domains, puis chez le registrar un CNAME vers
   `cname.vercel-dns.com` (ou l'enregistrement A indiqué). Voir `docs/lecons.md`
   avant de créer un sous-domaine.
5. E-mails : domaine vérifié chez Resend (enregistrements DKIM/SPF donnés par
   Resend), `EMAIL_EXPEDITEUR` sur ce domaine. La page Administration affiche
   le diagnostic et envoie un essai.
6. Cloudinary : les trois variables ; les dossiers se créent tout seuls.

## Conventions

- **Français partout** : code, commentaires, messages, commits.
- **Un refus se renvoie, il ne se lève pas** : en production, Next masque les
  messages des erreurs levées dans une action.
- **Une seule source pour chaque fait** : l'identité dans `app.ts`, l'adresse
  publique dans `site.ts`, les chiffres d'un événement dans un fichier de
  thème — jamais recopiés dans huit fichiers.
- **Les données sensibles ne se versionnent pas** : `data/` est ignoré ; les
  exports, fichiers reçus et listes nominatives y vont.
- **On ne supprime pas, on désactive** : un compte, une fiche, un document.
- **Chaque commentaire dit pourquoi**, pas quoi.
