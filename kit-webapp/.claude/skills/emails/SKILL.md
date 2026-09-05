---
name: emails
description: Envoi d'e-mails transactionnels avec Resend — expéditeur, domaine vérifié, gabarit HTML + texte, nouveaux messages, diagnostic quand rien ne part. À utiliser pour toute fonctionnalité qui écrit à un utilisateur.
---

# E-mails : Resend

## Ce qui est en place

`src/lib/email.ts` :

- `EMAIL_ACTIF` : clef et expéditeur présents. Sinon, `envoyer()` renvoie
  `{ envoye: false, raison: "non-configuré" }` — l'application propose une
  solution de repli (ex. mot de passe provisoire dicté par un administrateur).
- `envoyer({ a, sujet, html, texte })` → `{ envoye: true } | { envoye: false,
  raison, detail }`. **Ne lève jamais** ; l'appelant journalise le résultat.
- `diagnosticEnvoi()` : ce que l'application a lu comme expéditeur et ce qui
  cloche (clef absente, guillemets, domaine différent du site). Affiché dans
  Administration, avec un bouton d'essai (`envoyerEssaiEmail`).
- Gabarit : `courriel(sujet, titre, lignesTexte, corpsHtml)` avec les
  briques `p()`, `petit()`, `bouton(lien, texte)`. Styles en ligne, tableau,
  version texte complète — les clients mobiles ignorent une partie du CSS.
- Messages prêts : `courrielReinitialisation`, `courrielCompteCree`,
  `courrielEssai`.

## Ajouter un message

```ts
export function courrielRappel(prenom: string, quoi: string, lien: string) {
  return courriel(
    "Rappel",                           // sujet (le nom de l'app est ajouté)
    "Un rappel pour vous",              // titre dans le gabarit
    [`Bonjour ${prenom},`, ``, quoi, ``, lien, ``, APP.signature],   // texte brut
    p(`Bonjour ${prenom},`) + p(quoi) + bouton(lien, "Ouvrir") + petit(APP.signature)
  );
}
```

Puis dans l'action : `const envoi = await envoyer({ a: user.email,
...courrielRappel(...) }); await journaliser(user.id, envoi.envoye ?
"RAPPEL_ENVOYE" : "RAPPEL_NON_ENVOYE", envoi.envoye ? user.email :
envoi.raison);`

## Règles

- Un envoi qui échoue **ne fait pas échouer l'action métier**.
- Jamais de mot de passe dans un e-mail : on annonce, le provisoire se dicte.
- Adresses fabriquées (comptes créés en masse avec `prenom.nom@domaine-qui-
  n-existe-pas`) : ne jamais leur écrire — cela abîme la réputation du
  domaine. Filtrer avant `envoyer()` (dans FSY : `estAdresseDAttente`).
- Limiter les demandes répétées (3 liens par heure par compte).
- Le lien dans un e-mail part de `SITE_URL` : un nom qui résout vraiment.

## Configuration et pièges

1. resend.com → Domains → ajouter le domaine → enregistrements DNS (DKIM,
   SPF/MX de retour) chez le registrar → « Verified ».
2. API Keys → `RESEND_API_KEY`. `EMAIL_EXPEDITEUR="bonjour@domaine"`,
   `EMAIL_NOM="Nom affiché"`.
3. Le **forfait gratuit ne vérifie qu'un seul domaine** : l'expéditeur doit
   être sur ce domaine exact (pas un sous-domaine).
4. **Ne pas créer les enregistrements Resend sous un sous-domaine servi par un
   générique DNS** : `send.sous.domaine` sort `sous.domaine` de la zone
   générique (RFC 4592) et le site disparaît. Voir `docs/lecons.md`.
5. Sur Vercel, valeurs **sans guillemets**, puis redéployer.
6. Vérifier : Administration → « Envoyer un essai ». Si rien n'arrive,
   regarder le diagnostic, puis les logs Resend (Emails → statut, rebond).
