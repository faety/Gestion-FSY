import Link from "next/link";
import { getUtilisateur } from "@/lib/auth";
import { FormulaireMotDePasse } from "@/components/FormulaireMotDePasse";

// Cette page ne sert plus qu'au mot de passe provisoire, imposé à la première
// connexion : rien d'autre ne doit alors distraire. Le reste — photo, numéro,
// adresse, changement volontaire du mot de passe — vit dans « Mon profil ».
export default async function MotDePassePage() {
  const user = (await getUtilisateur())!;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <FormulaireMotDePasse
        provisoire={user.doitChangerMotDePasse}
        prenom={user.prenom}
      />
      {!user.doitChangerMotDePasse && (
        <p className="text-sm text-slate-500 text-center">
          Photo, numéro de téléphone et adresse se règlent depuis{" "}
          <Link href="/profil" className="text-fsy hover:underline">
            Mon profil
          </Link>
          .
        </p>
      )}
    </div>
  );
}
