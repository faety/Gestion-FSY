import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { urlPhoto } from "@/lib/cloudinary";
import { fluxZip, PHOTOS_PAR_LOT, type FichierZip } from "@/lib/zip";

// « Tout télécharger » : les photos du photobooth en une archive.
//
// Même règle de visibilité que la galerie — la direction emporte tout
// l'événement, un encadrant ses propres photos. Ce sont des images de mineurs :
// rien ici n'élargit ce que l'on a déjà le droit de voir.
//
// L'archive part en flux, photo par photo : la mémoire du serveur ne monte
// jamais, et le téléchargement démarre tout de suite.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Photos préparées d'avance pendant que les précédentes descendent. Assez pour
// que le réseau ne fasse pas la queue, assez peu pour ne rien accumuler.
const AVANCE = 4;

export async function GET(requete: NextRequest) {
  const user = await exigerUtilisateur();
  const direction = roleAuMoins(user.role, "COORDINATEUR");

  const photos = await prisma.photoSouvenir.findMany({
    where: direction ? {} : { priseParId: user.id },
    orderBy: { creeLe: "asc" },
  });

  const lot = Math.max(1, Number(requete.nextUrl.searchParams.get("lot") ?? "1") || 1);
  const debut = (lot - 1) * PHOTOS_PAR_LOT;
  const tranche = photos.slice(debut, debut + PHOTOS_PAR_LOT);

  if (tranche.length === 0) {
    return new Response("Aucune photo à télécharger.", { status: 404 });
  }

  async function* contenu(): AsyncGenerator<FichierZip> {
    // Chaque photo est chargée un peu à l'avance ; on n'en garde qu'une
    // poignée en mémoire à la fois.
    const attente: Promise<FichierZip | null>[] = [];
    const charger = (i: number) => {
      const p = tranche[i];
      if (!p) return;
      attente[i] = octetsDe(p, debut + i + 1);
    };
    for (let i = 0; i < Math.min(AVANCE, tranche.length); i++) charger(i);

    for (let i = 0; i < tranche.length; i++) {
      const fichier = await attente[i];
      charger(i + AVANCE);
      // Une photo illisible (fichier disparu, réseau) ne fait pas échouer
      // l'archive : elle manque, les autres arrivent.
      if (fichier) yield fichier;
    }
  }

  const total = Math.ceil(photos.length / PHOTOS_PAR_LOT);
  const nom =
    total > 1 ? `photos-souvenir-fsy-2026-lot-${lot}-sur-${total}.zip` : "photos-souvenir-fsy-2026.zip";

  return new Response(fluxZip(contenu()), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}

type PhotoEnBase = { id: string; publicId: string | null; image: string | null; creeLe: Date };

async function octetsDe(photo: PhotoEnBase, rang: number): Promise<FichierZip | null> {
  const nom = `souvenir-fsy-2026-${String(rang).padStart(3, "0")}.jpg`;
  try {
    if (photo.publicId) {
      const url = urlPhoto(photo.publicId);
      if (!url) return null;
      const reponse = await fetch(url);
      if (!reponse.ok) return null;
      return {
        nom,
        donnees: new Uint8Array(await reponse.arrayBuffer()),
        date: photo.creeLe,
      };
    }
    if (photo.image) {
      // Repli sans Cloudinary : la photo est rangée en base, encodée en texte.
      const base64 = photo.image.slice(photo.image.indexOf(",") + 1);
      return { nom, donnees: new Uint8Array(Buffer.from(base64, "base64")), date: photo.creeLe };
    }
  } catch (e) {
    console.warn(`Photo souvenir ${photo.id} absente de l'archive :`, e instanceof Error ? e.message : e);
  }
  return null;
}
