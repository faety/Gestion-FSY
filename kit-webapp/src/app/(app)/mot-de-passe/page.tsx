import { exigerUtilisateur } from "@/lib/auth";
import { FormulaireMotDePasse } from "@/components/FormulaireMotDePasse";

export const metadata = { title: "Mot de passe" };

export default async function MotDePassePage() {
  const user = await exigerUtilisateur();
  return (
    <div className="max-w-md mx-auto">
      <FormulaireMotDePasse provisoire={user.doitChangerMotDePasse} prenom={user.prenom} />
    </div>
  );
}
