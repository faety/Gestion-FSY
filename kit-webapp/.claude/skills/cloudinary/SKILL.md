---
name: cloudinary
description: Photos et images avec Cloudinary — envoi direct signé depuis le navigateur, livraison par URL signée, dossiers, vignettes, suppression, archive. À utiliser dès qu'une fonctionnalité stocke ou affiche des images.
---

# Cloudinary

## Ce qui est en place

`src/lib/cloudinary.ts` :

| Fonction | Rôle |
|---|---|
| `CLOUDINARY_ACTIF` | Les trois variables sont présentes. Sans elles, l'interface dit que l'envoi n'est pas configuré ; rien ne lève. |
| `DOSSIERS` | Un dossier par usage (`<court>/profils`, `<court>/documents`). Ajouter une clé pour un nouvel usage. |
| `signerEnvoi(dossier)` | Paramètres signés pour un envoi direct navigateur → Cloudinary. Appelée depuis une action serveur qui vérifie la session. |
| `urlImage(publicId, cote?)` | URL d'affichage signée ; `cote` = vignette carrée, sinon 1400 px max. |
| `supprimerImages(ids)` | Suppression, 4 s maximum, jamais bloquante. |
| `octetsImage(publicId)` | Télécharge l'original (archive ZIP, recopie). |
| `publicIdValide(id, dossier)` | À appeler avant d'enregistrer un `public_id` reçu du navigateur. |

`src/components/PhotoProfil.tsx` : composant complet (réduction dans le
navigateur, signature, envoi, enregistrement, retrait) et la fonction
`envoyerChezCloudinary(fichier, signature)` réutilisable.

`src/components/Avatar.tsx` : vignette signée ou initiales colorées.

## Ajouter un nouvel usage (ex. photos d'un rapport)

1. `DOSSIERS` : `rapports: \`${APP.court}/rapports\``.
2. Action serveur `demanderSignaturePhotoRapport()` → `exiger(rôle)` puis
   `signerEnvoi("rapports")`.
3. Côté client : réduire (copier `reduire` de `PhotoProfil.tsx`, adapter la
   taille — 1600 px de large pour une photo de scène, carré 512 pour un
   portrait), appeler la signature, `envoyerChezCloudinary`, puis une action
   `enregistrerPhotoRapport(publicId)` qui vérifie
   `publicIdValide(publicId, "rapports")` **avant** d'écrire en base.
4. Modèle : une colonne `publicId String` (ou `String?` si repli possible).
5. Affichage : `urlImage(publicId, 240)` dans les listes, `urlImage(publicId)`
   pour l'image entière (lien ou visionneuse).
6. Retrait : mettre la colonne à `null` **puis** `supprimerImages([id])`.

## Règles

- Les images de personnes (a fortiori de mineurs) se livrent **signées**
  (`authenticated`, par défaut). `CLOUDINARY_PHOTOS_PUBLIQUES=1` seulement
  pour des visuels publics.
- L'image ne transite **jamais** par l'action serveur (limite 1 Mo, lenteur
  mobile) : envoi direct depuis le navigateur, signature côté serveur.
- La base ne stocke que le `public_id`. Jamais de base64 en base.
- Vignettes demandées au **double** de la taille affichée (écrans denses),
  `loading="lazy"` dans les listes.
- Une suppression qui échoue ou traîne ne fait pas échouer l'action.
- Album ou galerie partagée avec des mineurs : lien non indexé
  (`X-Robots-Tag: noindex, nofollow`), accès réservé, téléchargement par lots
  (ZIP en flux, `src/lib/zip.ts`, ~120 photos par archive).

## Configuration

cloudinary.com → Dashboard → API Keys : `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Les dossiers se créent au
premier envoi. Un compte (et un dossier racine `APP.court`) par application ou
par instance.
