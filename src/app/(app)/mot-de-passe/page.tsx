import { getUtilisateur } from "@/lib/auth";
import { estAdresseDAttente } from "@/lib/email";
import { FormulaireMotDePasse } from "@/components/FormulaireMotDePasse";
import { MonAdresseEmail } from "@/components/MonAdresseEmail";

export default async function MotDePassePage() {
  const user = (await getUtilisateur())!;
  const attente = estAdresseDAttente(user.email);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <FormulaireMotDePasse
        provisoire={user.doitChangerMotDePasse}
        prenom={user.prenom}
      />
      {/* Pendant le changement d'un mot de passe provisoire, rien d'autre ne
          doit distraire : l'adresse se règle une fois entré. */}
      {!user.doitChangerMotDePasse && (
        <MonAdresseEmail email={user.email} attente={attente} />
      )}
    </div>
  );
}
