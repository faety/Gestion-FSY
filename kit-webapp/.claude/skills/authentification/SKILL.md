---
name: authentification
description: Comptes, sessions, rôles et mots de passe du kit — JWT en cookie, bcrypt, frein anti-essais, provisoire imposé, lien de réinitialisation, gabarit qui protège tout. À utiliser pour ajouter un contrôle d'accès, un rôle, un flux d'inscription ou d'aperçu.
---

# Authentification et accès

## Ce qui est en place

- `src/lib/auth.ts` : `creerSession(userId)` (JWT HS256 signé avec
  `AUTH_SECRET`, cookie httpOnly `<court>_session`, 14 jours),
  `detruireSession()`, `getUtilisateur()` (cache par requête, `null` si
  inactif), `exigerUtilisateur()`, `exigerRole(minimum)`.
- `src/lib/roles.ts` : `ROLES`, `ROLE_LABELS`, `roleAuMoins(role, minimum)`,
  `libelleRoleAccorde(role, sexe)`, `roleValide`.
- `src/lib/actions.ts` : `seConnecter` (8 échecs / 15 min par adresse, sans
  verrou), `seDeconnecter`, `changerMonMotDePasse`, `reinitialiserMotDePasse`
  (provisoire dicté), `demanderReinitialisation` / `verifierJeton` /
  `reinitialiserParJeton` (lien par e-mail, empreinte SHA-256, 3 h, usage
  unique, transaction), `creerUtilisateur`, `basculerActif`, `changerRole`.
- `src/app/(app)/layout.tsx` : session obligatoire, mot de passe provisoire
  → `/mot-de-passe` seulement, lecture seule → chemins autorisés. Le chemin
  demandé vient de l'en-tête `x-chemin` posé par `src/middleware.ts`.
- Pages : `/login`, `/mot-de-passe-oublie`, `/reinitialiser/[jeton]`,
  `/mot-de-passe`, `/profil`, `/admin`.

## Ajouter un rôle

1. `ROLES` (ordre = hiérarchie), `ROLE_LABELS`, `ROLE_LEVEL`, et le féminin
   dans `ROLE_LABELS_F` si le libellé s'accorde.
2. Les pages et actions utilisent `exigerRole("X")` / `exiger("X")` : rien
   d'autre à toucher.

## Droits nominatifs (hors hiérarchie)

Quand une responsabilité ne suit pas le rôle (ex. « voit les alertes de
tous »), ajouter sur `User` une colonne `droits String @default("[]")` (JSON)
et un helper `aLeDroit(user, "CLE")`. Un droit ne vaut qu'à partir d'un rôle
donné : vérifier les deux (`roleAuMoins(...) && aLeDroit(...)`).

## Inscription publique (si besoin)

Ajouter `valide Boolean @default(false)` sur `User`, une page `/inscription`
dont l'action crée le compte non validé, un refus à la connexion tant que
`!valide` (message qui dit d'attendre la validation), et dans Administration
une liste « en attente » avec accepter/refuser + `courrielCompteValide`.

## Mode aperçu (voir l'application comme un autre rôle)

Un cookie `<court>_apercu` portant un rôle inférieur ; `getUtilisateur()`
renvoie alors le profil avec ce rôle **abaissé** et un champ `apercu`.
Deux garde-fous : le cookie n'a d'effet que si le vrai rôle est ADMIN, et
`exiger()` refuse toute écriture pendant l'aperçu. Le journal garde l'identité
réelle.

## Règles

- **Sans `AUTH_SECRET` en production, lever.** Jamais de secret de repli.
- Réponse **identique** du « mot de passe oublié » que l'adresse existe ou
  non. Un compte désactivé reçoit un message qui dit où réparer, pas « mot de
  passe incorrect ».
- Contrôle d'accès **dans le gabarit et dans chaque action**, jamais
  seulement dans le lien qui mène à la page.
- Routes `/api/*` : vérifier `getUtilisateur()` soi-même.
- Un compte se désactive, ne se supprime pas (le journal y fait référence).
- Journaliser : `CONNEXION`, changements de mot de passe, créations,
  désactivations, changements de rôle.

## Vérifier

`scripts/verifier.mjs` couvre connexion, provisoire, pages, déconnexion.
Pour un nouveau flux, ajouter le scénario complet (bon et mauvais cas).
