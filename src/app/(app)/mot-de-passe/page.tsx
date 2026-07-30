import { getUtilisateur } from "@/lib/auth";
import { FormulaireMotDePasse } from "@/components/FormulaireMotDePasse";

export default async function MotDePassePage() {
  const user = (await getUtilisateur())!;
  return (
    <div className="max-w-md mx-auto">
      <FormulaireMotDePasse
        provisoire={user.doitChangerMotDePasse}
        prenom={user.prenom}
      />
    </div>
  );
}
