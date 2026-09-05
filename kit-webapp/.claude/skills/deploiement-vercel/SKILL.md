---
name: deploiement-vercel
description: Mettre en ligne et exploiter l'application sur Vercel avec Neon, un domaine et ses sous-domaines, les variables d'environnement, le build qui migre et amorce, les vérifications après déploiement. À utiliser pour un premier déploiement, un nouveau domaine, une instance supplémentaire ou un problème en production.
---

# Déploiement : Vercel + Neon + domaine

## Premier déploiement

1. Dépôt GitHub. Vercel → New Project → importer → préréglage Next.js, rien
   d'autre à régler (le script `build` fait `prisma generate && prisma db
   push && seed && next build`).
2. Variables (Settings → Environment Variables, **sans guillemets**) :
   `DATABASE_URL` (Neon), `AUTH_SECRET` (`openssl rand -base64 48`),
   `SITE_URL` (`https://domaine`), `SEED_ADMIN_*`, puis Cloudinary et Resend
   quand ils sont prêts. **Redéployer après tout ajout de variable.**
3. Déployer. Le premier build crée les tables et l'administrateur.
4. Domaine : Vercel → Domains → ajouter ; chez le registrar, CNAME
   `cname.vercel-dns.com` (sous-domaine) ou l'enregistrement A donné (apex).
   Vercel pose le certificat.
5. Vérifier en production : connexion, Administration (état des services,
   essai d'e-mail), une photo de profil, un PDF, une page imprimable.

## Après chaque déploiement

- Les tables suivent le schéma (`db push`) ; le seed rejoue les upserts et
  saute les jalons déjà posés.
- Logs : Vercel → Deployments → Functions (erreurs des actions et routes).
  Une erreur levée dans une action est masquée à l'utilisateur mais visible
  ici.
- Un build qui échoue sur `prisma generate` ou bcrypt →
  `serverExternalPackages` dans `next.config.ts`.

## Domaines et sous-domaines

- Chaque nom servi doit être déclaré dans Vercel, même si un générique DNS
  (`*.domaine`) le résout déjà.
- **Ne jamais créer d'enregistrement SOUS un sous-domaine actif servi par un
  générique** (`send.app.domaine`, `_dmarc.app.domaine`) : le nœud vide sort
  `app.domaine` du générique (RFC 4592) et le site disparaît. Donner à chaque
  sous-domaine qui compte **son propre enregistrement**, et brancher les
  services sur la racine.
- Sous-domaine de redirection (ex. `album.domaine` → un album partagé) : dans
  `src/middleware.ts`, tester l'hôte et renvoyer un 302 avec
  `X-Robots-Tag: noindex, nofollow` et `Cache-Control: no-store`. Déclarer le
  sous-domaine dans Vercel.
- `SITE_URL` est imprimée sur les documents : la fixer une fois, sur un nom
  qui résout.

## Plusieurs instances (une par organisation)

Isolation par sous-domaine : **même code**, un projet Vercel (ou une branche
de domaine) par instance, avec sa base Neon, son compte Cloudinary et ses
variables. Procédure d'une instance : base Neon → variables → domaine →
déploiement → première connexion admin. Pas de base commune multi-tenant :
une erreur chez l'un ne peut pas exposer les données d'un autre, et le code
n'a pas à connaître la notion d'organisation.

## Exploitation

- Sauvegarde ponctuelle : `pg_dump "$DATABASE_URL" > sauvegarde-<date>.sql`
  (depuis un poste, jamais versionnée).
- Fin de vie ou archive : Administration → lecture seule ; les données
  restent, l'accès se réduit à l'accueil et au profil.
- Rotation d'`AUTH_SECRET` : toutes les sessions tombent, tout le monde se
  reconnecte — prévenir.
- Identifiants GitHub d'une session Claude Code expirés (`could not read
  Username`) : reconnecter le connecteur GitHub sur claude.ai ou ouvrir une
  nouvelle session ; sauvegarder le travail en `.patch` en attendant.
