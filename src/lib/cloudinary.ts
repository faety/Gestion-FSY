// Stockage des photos de rapport chez Cloudinary.
//
// Pourquoi : une photo conservée en base est encodée en texte, ce qui l'alourdit
// d'un tiers. Surtout, la page de synthèse chargeait toutes les photos d'un
// coup dans le HTML — inutilisable sur un téléphone dès quelques centaines de
// photos. Ici, la base ne garde qu'un identifiant et Cloudinary produit la
// taille demandée : vignette légère sur la synthèse, photo entière à l'appui.
//
// Les photos sont envoyées en type « authenticated » : elles ne sont servies que
// par une URL signée que seule l'application peut produire. Ce sont des images
// prises pendant une activité de mineurs, elles n'ont pas à être accessibles à
// qui tomberait sur le lien.
//
// Si les variables d'environnement sont absentes, tout retombe sur l'ancien
// stockage en base. L'application reste donc utilisable sans Cloudinary, et une
// panne du service n'empêche pas de remettre un rapport.

import { v2 as cloudinary } from "cloudinary";

// Deux usages, deux dossiers. Les photos de rapport montrent des mineurs ; les
// photos de profil sont celles d'encadrants adultes qui les déposent eux-mêmes.
// Les unes comme les autres sont servies par URL signée, mais les séparer
// permet de les distinguer d'un coup d'œil chez Cloudinary et d'en effacer un
// jeu sans toucher à l'autre.
export const DOSSIERS = {
  rapports: "fsy2026/rapports",
  profils: "fsy2026/profils",
} as const;

export type Dossier = keyof typeof DOSSIERS;

export const CLOUDINARY_ACTIF = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

// Les photos sont-elles servies par URL signée, ou en accès libre par lien ?
// « authenticated » par défaut ; passer CLOUDINARY_PHOTOS_PUBLIQUES=1 bascule en
// accès libre, si jamais la livraison signée posait problème.
export const TYPE_LIVRAISON = process.env.CLOUDINARY_PHOTOS_PUBLIQUES === "1"
  ? "upload"
  : "authenticated";

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

// Paramètres signés pour un envoi direct depuis le navigateur vers Cloudinary.
// La clé secrète ne quitte jamais le serveur, et la photo ne transite pas par
// l'application : c'est plus rapide sur une connexion mobile, et cela contourne
// la limite de taille des actions serveur.
export function signerEnvoi(dossier: Dossier = "rapports"): SignatureEnvoi | null {
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
    signature: cloudinary.utils.api_sign_request(
      aSigner,
      process.env.CLOUDINARY_API_SECRET!
    ),
  };
}

// URL d'affichage. `cote` demande une vignette carrée ; sans lui, la photo est
// livrée dans sa plus grande dimension utile.
export function urlPhoto(publicId: string, cote?: number): string | null {
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
// jamais retarder l'enregistrement d'un rapport : un encadrant qui retire une
// photo à 22 h, sur un réseau capricieux, doit voir son rapport enregistré tout
// de suite. Au pire, un fichier reste chez Cloudinary — sans conséquence, il
// n'est plus référencé et devient inaccessible.
const DELAI_MENAGE = 4000;

// Suppression, quand un encadrant retire une photo de son rapport. Ni une
// erreur ni une lenteur ne doivent faire échouer l'enregistrement.
export async function supprimerPhotos(publicIds: string[]): Promise<void> {
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
      console.warn(
        `Suppression Cloudinary abandonnée après ${DELAI_MENAGE} ms : ${publicIds.join(", ")}`
      );
    }
  } catch (e) {
    console.warn("Suppression Cloudinary impossible :", e instanceof Error ? e.message : e);
  }
}

// Un identifiant Cloudinary doit rester dans le dossier de l'application : sans
// ce contrôle, un formulaire trafiqué pourrait faire pointer une photo de
// rapport vers n'importe quel fichier du compte.
export const publicIdValide = (id: string, dossier: Dossier = "rapports") =>
  id.startsWith(`${DOSSIERS[dossier]}/`) && id.length < 300 && !id.includes("..");
