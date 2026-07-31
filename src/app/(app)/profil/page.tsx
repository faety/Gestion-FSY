import { getUtilisateur } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CLOUDINARY_ACTIF, urlPhoto } from "@/lib/cloudinary";
import { estAdresseDAttente } from "@/lib/email";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { FormulaireMotDePasse } from "@/components/FormulaireMotDePasse";
import { MaPhoto } from "@/components/MaPhoto";
import { MonTelephone } from "@/components/MonTelephone";
import { MonAdresseEmail } from "@/components/MonAdresseEmail";

export const metadata = { title: "Mon profil" };

export default async function ProfilPage() {
  const session = (await getUtilisateur())!;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    include: {
      compagnie: { select: { nom: true } },
      groupesDiriges: { select: { nom: true } },
    },
  });

  const photo = user.photoPublicId ? urlPhoto(user.photoPublicId, 240) : null;
  const affectation =
    user.groupesDiriges.map((g) => g.nom).join(", ") || user.compagnie?.nom || null;

  // Ce qu'il reste à compléter, rappelé en tête : sans cela un encadrant
  // parcourt la page, ne voit rien de rouge, et repart sans rien remplir.
  const aFaire = [
    !user.photoPublicId && CLOUDINARY_ACTIF && "votre photo",
    !user.telephone && "votre numéro de téléphone",
    estAdresseDAttente(user.email) && "votre vraie adresse e-mail",
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🙋 Mon profil</h1>
        <p className="text-slate-500 text-sm">
          {user.prenom} {user.nom} · {ROLE_LABELS[user.role as Role] ?? user.role}
          {affectation && ` · ${affectation}`}
        </p>
      </div>

      {aFaire.length > 0 && (
        <p className="text-sm bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">
          Il manque {aFaire.join(", ").replace(/, ([^,]*)$/, " et $1")}. Quelques secondes
          suffisent, et cela rend service à toute l'équipe pendant la conférence.
        </p>
      )}

      <section className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <h2 className="font-bold">Ma photo</h2>
        <MaPhoto
          prenom={user.prenom}
          nom={user.nom}
          urlActuelle={photo}
          cloudinaryActif={CLOUDINARY_ACTIF}
        />
      </section>

      <section className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-bold mb-3">Me joindre</h2>
        <MonTelephone telephone={user.telephone} />
      </section>

      <MonAdresseEmail email={user.email} attente={estAdresseDAttente(user.email)} />

      <FormulaireMotDePasse provisoire={false} prenom={user.prenom} />
    </div>
  );
}
