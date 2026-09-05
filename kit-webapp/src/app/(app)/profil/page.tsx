import Link from "next/link";
import { exigerUtilisateur } from "@/lib/auth";
import { CLOUDINARY_ACTIF, urlImage } from "@/lib/cloudinary";
import { PhotoProfil } from "@/components/PhotoProfil";
import { FormulaireProfil } from "@/components/FormulaireProfil";

export const metadata = { title: "Mon profil" };

export default async function ProfilPage() {
  const user = await exigerUtilisateur();

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Mon profil</h1>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-3">Ma photo</h2>
        <PhotoProfil
          prenom={user.prenom}
          nom={user.nom}
          urlActuelle={user.photoPublicId ? urlImage(user.photoPublicId, 160) : null}
          cloudinaryActif={CLOUDINARY_ACTIF}
        />
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-3">Mes informations</h2>
        <p className="text-sm text-slate-500 mb-3">
          Adresse de connexion : <strong>{user.email}</strong>
        </p>
        <FormulaireProfil u={user} />
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">Mot de passe</h2>
        <Link href="/mot-de-passe" className="text-sm text-marque hover:underline">
          Changer mon mot de passe
        </Link>
      </section>
    </div>
  );
}
