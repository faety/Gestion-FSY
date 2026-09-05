# Consignes pour Claude Code

Ce projet part du **kit webapp** (socle issu de Gestion FSY 2026). Avant
d'ajouter une brique — base, photos, e-mails, connexion, PDF, déploiement —
lire la compétence correspondante dans `.claude/skills/` : elle dit ce qui
existe déjà et comment s'en servir. Ne pas réécrire ce que le socle fournit.

## Pile

Next.js 15 (App Router, composants et actions serveur), React 19, TypeScript
strict, Tailwind 4, Prisma 6 + PostgreSQL (Neon en production), Cloudinary
(images), Resend (e-mails), pdf-lib (PDF), jose + bcryptjs (sessions).
Déploiement Vercel. Le script `build` fait `prisma generate && prisma db push
&& seed && next build` : le schéma et l'amorçage suivent chaque déploiement.

## Règles du projet

1. **Français partout** : identifiants, commentaires, messages à l'écran,
   commits. Les commentaires expliquent *pourquoi*, pas *quoi*.
2. **Un refus se renvoie, il ne se lève pas.** Une action serveur renvoie
   `{ ok: false, motif }` (ou `{ erreur }` avec `useActionState`) ; en
   production Next masque le message d'une erreur levée et l'utilisateur ne
   sait pas quoi corriger. On ne lève que pour un formulaire trafiqué.
3. **Chaque action commence par `exiger("RÔLE")`** ; chaque page par
   `exigerUtilisateur()` ou `exigerRole()`. Les routes `/api/*` vérifient la
   session elles-mêmes : le gabarit `(app)` ne les couvre pas.
4. **Une seule source pour chaque fait** : l'identité dans `src/lib/app.ts`,
   l'adresse publique dans `src/lib/site.ts`, les constantes d'un événement
   dans un fichier de thème. Jamais une valeur recopiée à plusieurs endroits.
5. **Jamais d'échec silencieux.** Une saisie incomplète est refusée avec un
   message qui nomme le champ ; un service absent (Cloudinary, Resend) est
   annoncé à l'écran ; un envoi qui échoue est journalisé.
6. **Un service externe ne bloque jamais l'action métier** : e-mail non
   envoyé, suppression Cloudinary trop lente → on continue, on journalise.
7. **On ne supprime pas, on désactive** (comptes, fiches, documents). Les
   données personnelles ne se versionnent jamais : `data/` est ignoré.
8. **Seed rejouable** : upsert ou jalon `uneSeuleFois()`. Jamais de
   suppression dans le seed.
9. **Impression** : une feuille paysage se déclare `@page size: A4 landscape`
   — jamais de rotation CSS. Voir `FeuilleImprimable.tsx`.
10. **Vérifier dans un vrai navigateur** avant de dire « c'est fait » :
    `npm run build && npm run start` puis `npm run verifier` (Playwright), en
    étendant le script aux nouvelles pages. Compiler ne suffit pas.
11. **Développer en local sur PostgreSQL** (`scripts/postgres-local.sh`),
    jamais sur la base de production. `npm run db:push` après un changement de
    schéma.
12. **Pas d'identifiant de modèle d'IA** dans les commits, le code ou les
    documents produits.

## Commandes

```bash
npm run dev          # développement
npm run setup        # generate + db push + seed
npm run typecheck    # tsc --noEmit
npm run build        # comme Vercel
npm run start        # sert le build
npm run verifier     # Playwright de bout en bout (application lancée)
npm run db:studio    # explorer la base
```

## Où mettre les choses

| Quoi | Où |
|---|---|
| Modèle de données | `prisma/schema.prisma` |
| Action serveur | `src/lib/actions.ts` (ou `src/lib/actions-<domaine>.ts`, avec `"use server"`) |
| Logique pure, testable | `src/lib/<domaine>.ts` (sans import Next) |
| Page connectée | `src/app/(app)/<chemin>/page.tsx` + lien dans `liens` de `(app)/layout.tsx` |
| Page publique | `src/app/<chemin>/page.tsx` dans `CartePublique` |
| Composant client | `src/components/`, `"use client"` seulement s'il a de l'état |
| Document PDF | route `src/app/api/<nom>.pdf/route.ts` avec `Composeur` |
| Document imprimable | page sous `(app)` avec `StyleImpression` + `Apercu` |
| E-mail | fonction `courrielXxx()` dans `src/lib/email.ts` |
| Réglage administrable | clé dans `src/lib/reglages.ts`, interrupteur dans `OutilsAdmin.tsx` |
| Décision d'orientation | `docs/decisions.md` (à créer au premier besoin) |
