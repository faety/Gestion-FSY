import Link from "next/link";
import { verifierJeton } from "@/lib/actions";
import { Logo } from "@/components/Logo";
import { FormulaireReinitialisation } from "@/components/FormulaireReinitialisation";

export const metadata = { title: "Choisir un nouveau mot de passe" };

// Page atteinte depuis le lien reçu par e-mail. Le jeton est contrôlé avant
// d'afficher quoi que ce soit : inutile de faire saisir un mot de passe à
// quelqu'un dont le lien a déjà expiré.
export default async function ReinitialiserPage({
  params,
}: {
  params: Promise<{ jeton: string }>;
}) {
  const { jeton } = await params;
  const valide = await verifierJeton(jeton);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-fsy-dark to-fsy">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-2">
          <Logo taille={64} />
        </div>

        {valide ? (
          <>
            <h1 className="text-xl font-bold text-center text-fsy-dark">
              Bonjour {valide.prenom}
            </h1>
            <p className="text-center text-slate-500 text-sm mb-6">
              Choisissez votre nouveau mot de passe.
            </p>
            <FormulaireReinitialisation jeton={jeton} />
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-center text-fsy-dark">Lien expiré</h1>
            <p className="text-slate-600 text-sm mt-3 text-center">
              Ce lien n'est plus valable : il a déjà servi, ou les trois heures sont passées.
              Demandez-en un nouveau.
            </p>
            <Link
              href="/mot-de-passe-oublie"
              className="block text-center mt-5 bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-lg py-2.5 transition"
            >
              Demander un nouveau lien
            </Link>
          </>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link href="/login" className="text-fsy hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
