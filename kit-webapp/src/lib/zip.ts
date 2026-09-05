// Écriture d'une archive ZIP en flux, sans bibliothèque.
//
// Pourquoi à la main : une dépendance d'archivage pour un seul bouton, c'est
// du poids à chaque déploiement et une mise à jour de sécurité de plus. Le
// format tient en trois blocs, et il n'y a rien à compresser quand on range
// des JPEG ou des PDF, déjà compressés : méthode « stored », zéro processeur,
// zéro mémoire de travail — les octets traversent, un fichier à la fois.
//
// Usage dans une route :
//   async function* fichiers() { yield { nom: "a.jpg", donnees } ; … }
//   return new Response(fluxZip(fichiers()), { headers: { "Content-Type": "application/zip",
//     "Content-Disposition": 'attachment; filename="photos.zip"' } });

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(donnees: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < donnees.length; i++) c = TABLE_CRC[(c ^ donnees[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Le ZIP date d'avant l'an 2000 : l'heure y tient sur seize bits, à deux secondes près.
function horodatageDos(d: Date) {
  const heure = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const jour =
    (((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  return { heure, jour };
}

const encodeur = new TextEncoder();

export type FichierZip = { nom: string; donnees: Uint8Array; date?: Date };

type Entree = { nom: Uint8Array; crc: number; taille: number; decalage: number; heure: number; jour: number };

/** Assemble les fichiers en une archive livrée en flux : la réponse commence
 *  à partir dès le premier fichier, sans jamais tout garder en mémoire. */
export function fluxZip(fichiers: AsyncIterable<FichierZip> | Iterable<FichierZip>): ReadableStream<Uint8Array> {
  const suite =
    Symbol.asyncIterator in fichiers
      ? (fichiers as AsyncIterable<FichierZip>)[Symbol.asyncIterator]()
      : (async function* () {
          yield* fichiers as Iterable<FichierZip>;
        })();
  const entrees: Entree[] = [];
  let decalage = 0;
  let termine = false;

  return new ReadableStream<Uint8Array>({
    async pull(flux) {
      if (termine) return;
      const suivant = await suite.next();
      if (suivant.done) {
        flux.enqueue(repertoireCentral(entrees, decalage));
        termine = true;
        flux.close();
        return;
      }

      const { nom, donnees, date } = suivant.value;
      const nomEncode = encodeur.encode(nom);
      const crc = crc32(donnees);
      const { heure, jour } = horodatageDos(date ?? new Date());

      const enTete = new Uint8Array(30 + nomEncode.length);
      const vue = new DataView(enTete.buffer);
      vue.setUint32(0, 0x04034b50, true); // signature d'en-tête local
      vue.setUint16(4, 20, true); // version minimale
      vue.setUint16(6, 0x0800, true); // noms en UTF-8
      vue.setUint16(8, 0, true); // méthode : rangé tel quel
      vue.setUint16(10, heure, true);
      vue.setUint16(12, jour, true);
      vue.setUint32(14, crc, true);
      vue.setUint32(18, donnees.length, true);
      vue.setUint32(22, donnees.length, true);
      vue.setUint16(26, nomEncode.length, true);
      vue.setUint16(28, 0, true);
      enTete.set(nomEncode, 30);

      entrees.push({ nom: nomEncode, crc, taille: donnees.length, decalage, heure, jour });
      decalage += enTete.length + donnees.length;

      flux.enqueue(enTete);
      flux.enqueue(donnees);
    },
  });
}

function repertoireCentral(entrees: Entree[], debut: number): Uint8Array {
  const taille = entrees.reduce((t, e) => t + 46 + e.nom.length, 0);
  const bloc = new Uint8Array(taille + 22);
  const vue = new DataView(bloc.buffer);
  let p = 0;

  for (const e of entrees) {
    vue.setUint32(p, 0x02014b50, true);
    vue.setUint16(p + 4, 20, true);
    vue.setUint16(p + 6, 20, true);
    vue.setUint16(p + 8, 0x0800, true);
    vue.setUint16(p + 10, 0, true);
    vue.setUint16(p + 12, e.heure, true);
    vue.setUint16(p + 14, e.jour, true);
    vue.setUint32(p + 16, e.crc, true);
    vue.setUint32(p + 20, e.taille, true);
    vue.setUint32(p + 24, e.taille, true);
    vue.setUint16(p + 28, e.nom.length, true);
    vue.setUint16(p + 30, 0, true);
    vue.setUint16(p + 32, 0, true);
    vue.setUint16(p + 34, 0, true);
    vue.setUint16(p + 36, 0, true);
    vue.setUint32(p + 38, 0, true);
    vue.setUint32(p + 42, e.decalage, true);
    bloc.set(e.nom, p + 46);
    p += 46 + e.nom.length;
  }

  vue.setUint32(p, 0x06054b50, true); // marqueur de fin d'archive
  vue.setUint16(p + 4, 0, true);
  vue.setUint16(p + 6, 0, true);
  vue.setUint16(p + 8, entrees.length, true);
  vue.setUint16(p + 10, entrees.length, true);
  vue.setUint32(p + 12, taille, true);
  vue.setUint32(p + 16, debut, true);
  vue.setUint16(p + 20, 0, true);

  return bloc;
}

/** Réponse HTTP prête à servir depuis une route. */
export function reponseZip(fichiers: AsyncIterable<FichierZip> | Iterable<FichierZip>, nomFichier: string) {
  return new Response(fluxZip(fichiers), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
