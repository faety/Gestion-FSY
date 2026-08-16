import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { urlPhoto } from "@/lib/cloudinary";
import { GaleriePhotosSouvenir } from "@/components/GaleriePhotosSouvenir";

export const metadata = { title: "Galerie souvenir" };

// Les photos du photobooth — des mineurs y figurent : direction uniquement.
// C'est d'ici qu'on alimente le diaporama du cinquième jour.
export default async function GalerieSouvenirPage() {
  const user = await exigerUtilisateur();
  if (!roleAuMoins(user.role, "COORDINATEUR")) redirect("/accueil");

  const photos = await prisma.photoSouvenir.findMany({ orderBy: { creeLe: "desc" } });

  return (
    <GaleriePhotosSouvenir
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
