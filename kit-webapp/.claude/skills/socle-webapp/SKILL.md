---
name: socle-webapp
description: Démarrer une nouvelle application ou ajouter une page, une action ou un modèle sur le kit webapp (Next.js 15 + Prisma/PostgreSQL + Cloudinary + Resend). À lire avant tout ajout métier.
---

# Socle webapp

Le projet repose sur le kit issu de Gestion FSY 2026. Le socle fournit déjà :
comptes et connexion, rôles, journal, réglages, photos (Cloudinary), e-mails
(Resend), PDF (pdf-lib), impression HTML, ZIP, administration, gabarit
connecté, script de vérification Playwright. **Ne pas réécrire ces briques ;
les étendre.**

## Démarrage d'un nouveau projet

1. `src/lib/app.ts` : `nom`, `court` (sans espace ni accent — il nomme le
   cookie et les dossiers Cloudinary), `description`, `signature`, couleurs.
   Les mêmes couleurs dans `src/app/globals.css` (`@theme`).
2. `package.json` → `name`. `public/logo.png` si un logo existe.
3. `.env` depuis `.env.example` : `DATABASE_URL`, `AUTH_SECRET`
   (`openssl rand -base64 48`), `SEED_ADMIN_*`, `SITE_URL`.
4. `npm install && npm run setup && npm run dev`.
5. Adapter `src/lib/roles.ts` si les rôles du métier diffèrent (garder
   `roleAuMoins` et `libelleRoleAccorde`).

## Ajouter un modèle

- À la suite de `prisma/schema.prisma`. Relations vers `User` avec
  `onDelete` réfléchi (Cascade pour ce qui n'a pas de sens sans le compte,
  sinon rien : on désactive les comptes, on ne les supprime pas).
- `npm run db:push`. En production, le script `build` le fait.
- Données de référence : dans `prisma/seed.ts`, par `upsert` ou dans un bloc
  `uneSeuleFois("clé", admin.id, …)`.

## Ajouter une action serveur

```ts
export async function faireQuelqueChose(id: string, saisie: string) {
  const user = await exiger("GESTIONNAIRE");          // toujours en premier
  const propre = saisie.trim();
  if (!propre) return { ok: false as const, motif: "Le libellé est obligatoire." };
  const cible = await prisma.chose.findUnique({ where: { id } });
  if (!cible) return { ok: false as const, motif: "Introuvable." };
  await prisma.chose.update({ where: { id }, data: { libelle: propre } });
  await journaliser(user.id, "CHOSE_MODIFIEE", `${cible.id} → ${propre}`);
  revalidatePath("/choses");
  return { ok: true as const };
}
```

- Refus → `{ ok: false, motif }`, jamais `throw` (Next masque le message en
  production). Avec `useActionState` : `{ erreur }` / `{ message }`.
- Limites de longueur explicites sur chaque champ texte.
- `revalidatePath` sur chaque page qui affiche la donnée.
- Un formulaire avec plusieurs lignes optionnelles : une ligne à moitié
  remplie est **refusée** avec un message qui la nomme, jamais ignorée.

## Ajouter une page connectée

```tsx
// src/app/(app)/choses/page.tsx
import { exigerRole } from "@/lib/auth";
export const metadata = { title: "Choses" };
export default async function ChosesPage() {
  const user = await exigerRole("GESTIONNAIRE");
  …
}
```

Puis le lien dans `liens` de `src/app/(app)/layout.tsx`, avec le rôle minimum.
Si la page doit rester accessible en lecture seule, l'ajouter dans
`cheminAutorise` (`src/lib/reglages.ts`).

## Composants

- Serveur par défaut. `"use client"` seulement avec de l'état ou des
  gestionnaires d'événements.
- Un composant client qui appelle une action affiche ce qu'elle renvoie
  (`motif`), avec `useTransition` pour l'attente.
- Classes Tailwind : une classe de base **sans largeur** pour les champs, la
  largeur donnée à côté (`w-24`, `flex-1 min-w-0`). Deux largeurs sur le même
  élément se battent.

## Vérifier

`npm run typecheck`, puis `npm run build && npm run start` et
`npm run verifier` (étendre `scripts/verifier.mjs` aux nouvelles pages :
connexion, statut 200, contenu attendu, refus attendus). Ne pas conclure sur
une compilation seule.
