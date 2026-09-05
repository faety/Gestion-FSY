// Stockage des images chez Cloudinary.
//
// Pourquoi : une image conservée en base est encodée en texte, ce qui l'alourdit
// d'un tiers, et une page qui charge cent images d'un coup devient inutilisable
// sur un téléphone. Ici, la base ne garde qu'un identifiant et Cloudinary
// produit la taille demandée : vignette légère dans les listes, image entière
// à l'appui.
//
// L'envoi se fait DIRECTEMENT du navigateur vers Cloudinary, avec une signature
// calculée par le serveur (voir signerEnvoi et components/PhotoProfil.tsx) :
// la clé secrète ne quitte jamais le serveur, l'image ne transite pas par
// l'application, et la limite de taille des actions serveur n'entre pas en jeu.
//
// Les images sont envoyées en type « authenticated » : elles ne sont servies
// que par une URL signée que seule l'application peut produire. Passer
// CLOUDINARY_PHOTOS_PUBLIQUES=1 bascule en accès libre par lien.
//
// Si les variables d'environnement sont absentes, CLOUDINARY_ACTIF vaut false
// et l'interface propose autre chose (ou rien). Aucune fonction ne lève.

import { v2 as cloudinary } from "cloudinary";
import { APP } from "./app";

// Un dossier par usage : on les distingue d'un coup d'œil chez Cloudinary, et
// on peut en effacer un jeu sans toucher à l'autre. Ajouter une clé ici suffit.
export const DOSSIERS = {
  profils: `${APP.court}/profils`,
  documents: `${APP.court}/documents`,
} as const;

export type Dossier = keyof typeof DOSSIERS;

export const CLOUDINARY_ACTIF = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

export const TYPE_LIVRAISON =
  process.env.CLOUDINARY_PHOTOS_PUBLIQUES === "1" ? "upload" : "authenticated";

if (CLOUDINARY_ACTIF) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export type SignatureEnvoi = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  type: string;
  signature: string;
};

/** Paramètres signés pour un envoi direct depuis le navigateur. */
export function signerEnvoi(dossier: Dossier): SignatureEnvoi | null {
  if (!CLOUDINARY_ACTIF) return null;
  const folder = DOSSIERS[dossier];
  const timestamp = Math.round(Date.now() / 1000);
  const aSigner = { folder, timestamp, type: TYPE_LIVRAISON };
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    timestamp,
    folder,
    type: TYPE_LIVRAISON,
    signature: cloudinary.utils.api_sign_request(aSigner, process.env.CLOUDINARY_API_SECRET!),
  };
}

/** URL d'affichage. `cote` demande une vignette carrée ; sans lui, l'image est
 *  livrée dans sa plus grande dimension utile (1400 px). */
export function urlImage(publicId: string, cote?: number): string | null {
  if (!CLOUDINARY_ACTIF) return null;
  return cloudinary.url(publicId, {
    type: TYPE_LIVRAISON,
    sign_url: TYPE_LIVRAISON === "authenticated",
    secure: true,
    transformation: cote
      ? [{ width: cote, height: cote, crop: "fill", gravity: "auto", quality: "auto", fetch_format: "auto" }]
      : [{ width: 1400, crop: "limit", quality: "auto", fetch_format: "auto" }],
  });
}

// Délai au-delà duquel on renonce à attendre Cloudinary. Le ménage ne doit
// jamais retarder l'enregistrement d'une action métier. Au pire, un fichier
// reste chez Cloudinary — sans conséquence, il n'est plus référencé.
const DELAI_MENAGE = 4000;

/** Suppression. Ni une erreur ni une lenteur ne font échouer l'appelant. */
export async function supprimerImages(publicIds: string[]): Promise<void> {
  if (!CLOUDINARY_ACTIF || publicIds.length === 0) return;
  const abandon = new Promise<"delai">((r) => setTimeout(() => r("delai"), DELAI_MENAGE));
  try {
    const issue = await Promise.race([
      cloudinary.api
        .delete_resources(publicIds, { type: TYPE_LIVRAISON, resource_type: "image" })
        .then(() => "fait" as const),
      abandon,
    ]);
    if (issue === "delai") {
      console.warn(`Suppression Cloudinary abandonnée après ${DELAI_MENAGE} ms : ${publicIds.join(", ")}`);
    }
  } catch (e) {
    console.warn("Suppression Cloudinary impossible :", e instanceof Error ? e.message : e);
  }
}

/** Télécharge l'original (pour l'archiver, le zipper, le recopier). */
export async function octetsImage(publicId: string): Promise<Uint8Array | null> {
  const url = urlImage(publicId);
  if (!url) return null;
  const r = await fetch(url);
  if (!r.ok) return null;
  return new Uint8Array(await r.arrayBuffer());
}

/**
 * Un identifiant Cloudinary doit rester dans le dossier attendu : sans ce
 * contrôle, un formulaire trafiqué pourrait faire pointer une image vers
 * n'importe quel fichier du compte.
 */
export const publicIdValide = (id: string, dossier: Dossier) =>
  id.startsWith(`${DOSSIERS[dossier]}/`) && id.length < 300 && !id.includes("..");
