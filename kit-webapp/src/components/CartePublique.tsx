import Link from "next/link";
import { APP } from "@/lib/app";
import { Logo } from "./Logo";

/** Cadre des pages hors connexion : connexion, mot de passe oublié, lien reçu. */
export function CartePublique({ titre, sousTitre, children }: { titre?: string; sousTitre?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-marque-sombre to-marque">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <Link href="/" className="block" aria-label={`Accueil ${APP.nom}`}>
          <div className="flex justify-center mb-2">
            <Logo taille={64} />
          </div>
          <h1 className="text-2xl font-bold text-center text-marque-sombre">{titre ?? APP.nom}</h1>
        </Link>
        {sousTitre && <p className="text-center text-slate-500 text-sm mt-1 mb-5">{sousTitre}</p>}
        {children}
      </div>
    </main>
  );
}
