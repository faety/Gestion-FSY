---
name: base-de-donnees
description: PostgreSQL avec Prisma — Neon en production, cluster local en développement, schéma, db push, seed rejouable, connexions sur Vercel. À utiliser pour toute question de base de données ou de migration.
---

# Base de données : PostgreSQL + Prisma

## Ce qui est en place

- `prisma/schema.prisma` : `User`, `TentativeConnexion`,
  `ReinitialisationMotDePasse`, `AuditLog`, `Reglage`. Les modèles métier
  s'ajoutent à la suite.
- `src/lib/db.ts` : client unique (`prisma`), mis en cache sur `globalThis`
  en développement, `connection_limit=1&pool_timeout=20` ajouté à l'URL sur
  Vercel (une connexion par fonction serverless, sinon Neon sature).
- `prisma/seed.ts` : rejouable à chaque déploiement, `uneSeuleFois(clé,
  auteurId, fn)` pour les opérations à ne faire qu'une fois (jalon dans
  `AuditLog`, action `JALON`). Supprimer la ligne du jalon rejoue l'opération.
- Scripts : `db:push`, `db:seed`, `db:studio`, `setup` ; `build` = generate +
  push + seed + next build.

## Production : Neon

1. console.neon.tech → nouveau projet (région proche des utilisateurs).
2. « Connection string » → `DATABASE_URL` dans Vercel (sans guillemets).
   Pooled ou direct : les deux marchent avec `db push`.
3. Le premier déploiement crée les tables et amorce l'admin (`SEED_ADMIN_*`).
4. Sauvegardes : Neon garde un historique (point-in-time) selon le forfait ;
   pour un export, `pg_dump "$DATABASE_URL" > sauvegarde.sql` depuis un poste.

## Développement : cluster local

```bash
scripts/postgres-local.sh init     # une fois : cluster + base, port 5433
scripts/postgres-local.sh start    # à chaque session
# .env : DATABASE_URL="postgresql://app:app@127.0.0.1:5433/app"
npm run setup
```

Dans un conteneur Claude Code : PostgreSQL s'installe avec `apt install
postgresql` ; le cluster va dans `/var/tmp/pgdata-<projet>` (hors de
`/tmp/claude-*`, dont les permissions sont réécrites) ; sous root, les
commandes passent par `su postgres -c`. Après un redémarrage du conteneur,
refaire `init` (le cluster est perdu) puis `npm run setup`.

**Jamais de développement sur la base de production.**

## Modifier le schéma

- Ajouter un champ ou un modèle : éditer le schéma, `npm run db:push`.
- Renommer ou retirer une colonne **avec données** : `db push` perd la
  colonne. Procéder en deux déploiements : ajouter la nouvelle, recopier
  (bloc `uneSeuleFois` dans le seed), retirer l'ancienne au déploiement
  suivant.
- Index : `@@index([champ, createdAt])` sur tout ce qui est filtré par date
  ou par clé étrangère dans une liste.
- Unicité composée : `@@unique([a, b])`. Prisma lève `P2002` en cas de
  doublon : le rattraper et renvoyer un motif lisible.
- JSON figé (faits d'un document délivré) : colonne `String` contenant du
  JSON, lue par une fonction `lireXxx(json)` tolérante aux champs absents
  (les anciens enregistrements n'ont pas les nouveaux champs).

## Écritures sûres

- Plusieurs écritures liées → `prisma.$transaction([...])` (ou la forme
  interactive `async (tx) => …` quand une écriture dépend d'une lecture).
- Compter avant de refuser (`count` sur une fenêtre de temps) : c'est ainsi
  que sont freinés les essais de connexion et les demandes de lien.
- Une lecture en cache par requête : `cache()` de React autour d'une
  fonction async (`getUtilisateur`, `lectureSeule`).
- Une lecture de confort ne doit pas faire tomber l'application :
  `try/catch` → valeur par défaut (`lectureSeule` renvoie `false`).

## Exploration

`npm run db:studio` (Prisma Studio), ou `psql "$DATABASE_URL"`. Pour une
requête depuis un script : `npx tsx -e '…'` avec `new PrismaClient()`.
