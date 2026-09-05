import Link from "next/link";
import { verifierJeton } from "@/lib/actions";
import { CartePublique } from "@/components/CartePublique";
import { FormulaireReinitialisation } from "@/components/FormulaireReinitialisation";

export const metadata = { title: "Choisir un nouveau mot de passe" };

// Page atteinte depuis le lien reçu par e-mail. Le jeton est contrôlé avant
// d'afficher quoi que ce soit : inutile de faire saisir un mot de passe à
// quelqu'un dont le lien a déjà expiré.
export default async function ReinitialiserPage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const valide = await verifierJeton(jeton);

  return (
    <CartePublique
      titre={valide ? `Bonjour ${valide.prenom}` : "Lien expiré"}
      sousTitre={
        valide
          ? "Choisissez votre nouveau mot de passe."
          : "Ce lien n'est plus valable : il a déjà servi, ou son délai est passé. Demandez-en un nouveau."
      }
    >
      {valide ? (
        <FormulaireReinitialisation jeton={jeton} />
      ) : (
        <Link
          href="/mot-de-passe-oublie"
          className="block text-center bg-marque hover:bg-marque-sombre text-white font-semibold rounded-lg py-2.5 transition"
        >
          Demander un nouveau lien
        </Link>
      )}
      <p className="text-center text-sm text-slate-500 mt-6">
        <Link href="/login" className="text-marque hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </CartePublique>
  );
}
