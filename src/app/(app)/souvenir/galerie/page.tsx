import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { urlPhoto } from "@/lib/cloudinary";
import { peutToutTelecharger } from "@/lib/souvenirs";
import { PHOTOS_PAR_LOT } from "@/lib/zip";
import { GaleriePhotosSouvenir } from "@/components/GaleriePhotosSouvenir";

export const metadata = { title: "Photos souvenir" };

// Deux lectures de la même galerie :
//   • direction (couple, coordinateurs principaux) : toutes les photos de
//     l'événement — c'est de là que sort le diaporama du cinquième jour ;
//   • conseillers et adjoints : les leurs seulement, prises depuis leur
//     téléphone. Des mineurs figurent sur ces photos : personne ne voit
//     celles des autres, et seule la direction supprime.
export default async function GalerieSouvenirPage() {
  const user = await exigerUtilisateur();
  const direction = roleAuMoins(user.role, "COORDINATEUR");

  const photos = await prisma.photoSouvenir.findMany({
    where: direction ? {} : { priseParId: user.id },
    orderBy: { creeLe: "desc" },
  });

  return (
    <GaleriePhotosSouvenir
      direction={direction}
      lots={peutToutTelecharger(user) ? Math.ceil(photos.length / PHOTOS_PAR_LOT) : 0}
      photos={photos.map((p) => ({
        id: p.id,
        url: p.publicId ? urlPhoto(p.publicId, 600) : p.image,
        pleine: p.publicId ? urlPhoto(p.publicId) : p.image,
        cadre: p.cadre,
        date: p.creeLe.toISOString(),
      }))}
    />
  );
}
