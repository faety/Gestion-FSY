---
name: impression-pdf
description: Documents à imprimer ou à télécharger — PDF composé côté serveur (pdf-lib, tableaux, QR), feuilles HTML imprimées depuis le navigateur (attestations A4 portrait ou paysage), archives ZIP en flux, et comment vérifier le résultat. À utiliser pour toute attestation, liste, rapport, diplôme ou export.
---

# Impression, PDF, ZIP

## Choisir la technique

| Document | Technique | Où |
|---|---|---|
| Liste, rapport, reçu, tableau multipage | **pdf-lib côté serveur** | route `src/app/api/<nom>.pdf/route.ts` + `src/lib/pdf.ts` |
| Attestation, diplôme, affiche, mise en page riche | **HTML imprimable** (l'utilisateur fait « Enregistrer en PDF ») | page sous `(app)` + `src/components/FeuilleImprimable.tsx` |
| Lot de photos ou de fichiers | **ZIP en flux** | route + `src/lib/zip.ts` |

## PDF côté serveur (`Composeur`)

```ts
const c = new Composeur(); await c.initialiser();
await enTeteDocument(c, "Titre", "Sous-titre · date");
await c.qr(lienVerification, A4.largeur - MARGE - 60, A4.hauteur - MARGE, 60);
c.paragraphe("Texte découpé sur la largeur…");
c.titre("Section");
c.tableau([{ titre: "Nom", largeur: 200 }, { titre: "Rôle", largeur: 303 }], lignes);
return reponsePdf(await c.octets(), "document.pdf");
```

- La route vérifie la session (`getUtilisateur()`) : le gabarit ne la couvre pas.
- Polices standard = WinAnsi : `surWinAnsi()` est appliqué par `paragraphe`
  et `tableau` ; l'appliquer soi-même pour `drawText` direct.
- Une page se réserve avec `c.reserver(hauteur)` avant un bloc insécable.
- Pour un document paysage : `c.doc.addPage([A4.hauteur, A4.largeur])`.

## Feuille HTML imprimable

```tsx
<StyleImpression paysage />            // ou sans prop : portrait
<Apercu hauteurMm={210} largeurMm={297}>
  <div className="feuille paysage" style={{ padding: "18mm 22mm" }}>…</div>
  <div className="feuille paysage">…</div>   // une feuille par page
</Apercu>
<BoutonImprimer />
```

- Tout se compose en **millimètres** (`mm`) et à taille réelle ; `Apercu`
  réduit à l'écran (0,44 sur mobile, 1 sur grand écran) et remet à l'échelle
  1 à l'impression.
- **Paysage = `@page size: A4 landscape`**, jamais `rotate(90deg)` (sort à
  87 %, décalé).
- **Aucune marge au-dessus de la feuille** : 1 mm de trop et une page blanche
  suit. `Apercu` met `margin: 0` en print ; ne pas mettre de `break-after`
  sur la dernière feuille (`.feuille + .feuille { break-before: page }`).
- Un lot qui mélange portrait et paysage s'imprime en **deux passes** (deux
  URL, une par format), jamais en un lot mixte.
- Polices web (`@fontsource/...`) : les importer dans la page ; elles sont
  incorporées au PDF par le navigateur.
- Les faits imprimés sur un document délivré (nom, date, chiffres) se
  **figent en base** à la délivrance (JSON `faits`), avec un code de
  vérification unique et une page publique `/verification/[code]`.
- Libellés accordés au genre de la personne nommée (`libelleRoleAccorde`).

## ZIP en flux

```ts
async function* fichiers(): AsyncGenerator<FichierZip> {
  for (const p of photos) yield { nom: `${p.id}.jpg`, donnees: (await octetsImage(p.publicId))!, date: p.priseLe };
}
return reponseZip(fichiers(), "photos-lot-1.zip");
```

Lots de ~120 photos : une fonction serverless a un temps limité, et un
fichier de 3 Go abandonné à 90 % ne sert à personne.

## Vérifier (obligatoire)

Avec Playwright (`scripts/verifier.mjs`) :

- PDF serveur : `PDFDocument.load(octets)` de pdf-lib → `getPageCount()`,
  `getPage(0).getSize()` (A4 = 595,28 × 841,89 pt). pdf-lib compresse ses
  objets : ne pas chercher `MediaBox` dans les octets.
- Feuille HTML : `page.emulateMedia({ media: "print" })` puis
  `page.pdf({ preferCSSPageSize: true })` → paysage = largeur > hauteur
  (841,92 × 594,96 pt), **nombre de pages = nombre de feuilles**.
- Rendu visuel : `page.screenshot({ fullPage: true })` de la page, ou, pour
  un PDF, l'ouvrir dans un `<embed>` et capturer.
- Outils absents du conteneur (`pdftoppm`, `soffice`) : ne pas compter dessus.
