import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { APP } from "@/lib/app";
import { getUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { cheminAutorise, lectureSeule } from "@/lib/reglages";
import { Avatar } from "@/components/Avatar";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { Logo } from "@/components/Logo";

// Gabarit de tout ce qui est derrière la connexion.
//
// Les contrôles sont ICI, dans le gabarit commun, pour qu'aucune page ne
// reste accessible en tapant son adresse : session, mot de passe provisoire,
// lecture seule. Les pages, elles, appellent exigerUtilisateur() (ou
// exigerRole) parce que React les rend en même temps que le gabarit.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUtilisateur();
  if (!user) redirect("/login");

  const chemin = (await headers()).get("x-chemin") ?? "";

  // Mot de passe provisoire : rien d'autre tant qu'il n'a pas été changé.
  if (user.doitChangerMotDePasse && !chemin.startsWith("/mot-de-passe")) redirect("/mot-de-passe");

  // Lecture seule : tout le monde sauf les administrateurs redevient un
  // utilisateur ordinaire (accueil, profil).
  const restreint = user.role !== "ADMIN" && (await lectureSeule());
  if (restreint && chemin && !cheminAutorise(chemin)) redirect("/accueil");

  const liens = [
    { href: "/accueil", label: "Accueil" },
    { href: "/profil", label: "Mon profil" },
    // Ajouter ici les pages métier, avec le rôle minimum qui les voit.
    ...(!restreint ? [{ href: "/impression", label: "Exemple imprimable" }] : []),
    ...(roleAuMoins(user.role, "ADMIN") ? [{ href: "/admin", label: "Administration" }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-marque-sombre text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/accueil" className="flex items-center gap-2 font-bold">
            <Logo taille={32} clair />
            <span>{APP.nom}</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 ml-4">
            {liens.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/profil" className="flex items-center gap-2 text-sm">
              <Avatar prenom={user.prenom} nom={user.nom} photoPublicId={user.photoPublicId} taille={32} />
              <span className="hidden sm:inline">{user.prenom}</span>
            </Link>
            <BoutonDeconnexion prenom={user.prenom} />
          </div>
        </div>
        <nav className="sm:hidden flex gap-1 px-2 pb-2 overflow-x-auto">
          {liens.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm px-3 py-1.5 rounded-lg bg-white/10 whitespace-nowrap">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      {restreint && (
        <p className="bg-amber-50 text-amber-900 text-sm text-center px-4 py-2 border-b border-amber-200">
          L'application est en lecture seule.
        </p>
      )}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
