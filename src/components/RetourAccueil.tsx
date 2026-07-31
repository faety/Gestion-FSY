import Link from "next/link";

/**
 * Sortie de secours des pages d'avant-connexion.
 *
 * La connexion, la demande d'accès et le mot de passe oublié s'ouvrent souvent
 * depuis un lien reçu par message : on y arrive sans être passé par la page de
 * présentation, et sans rien pour en sortir. Le navigateur n'a même pas de
 * page précédente où revenir. Une porte, donc, sur chacune de ces pages —
 * autrement la seule issue est de retaper l'adresse à la main.
 */
export function RetourAccueil({ classe = "" }: { classe?: string }) {
  return (
    <p className={`text-center text-sm mt-4 ${classe}`}>
      <Link href="/" className="text-slate-500 hover:text-fsy hover:underline">
        ← Retour à l&apos;accueil
      </Link>
    </p>
  );
}
