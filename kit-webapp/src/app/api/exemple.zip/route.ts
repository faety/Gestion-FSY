import { getUtilisateur } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reponseZip, type FichierZip } from "@/lib/zip";

// Archive livrée en flux : un fichier texte par compte. Pour des photos
// Cloudinary, remplacer le contenu par `await octetsImage(publicId)`.
export async function GET() {
  const user = await getUtilisateur();
  if (!user) return new Response("Connexion requise", { status: 401 });

  const comptes = await prisma.user.findMany({ orderBy: { nom: "asc" } });
  const encodeur = new TextEncoder();

  async function* fichiers(): AsyncGenerator<FichierZip> {
    for (const u of comptes) {
      yield {
        nom: `${u.nom}-${u.prenom}.txt`.replace(/[^\w.-]+/g, "_"),
        donnees: encodeur.encode(`${u.prenom} ${u.nom}\n${u.email}\n${u.role}\n`),
        date: u.createdAt,
      };
    }
  }

  return reponseZip(fichiers(), "comptes.zip");
}
