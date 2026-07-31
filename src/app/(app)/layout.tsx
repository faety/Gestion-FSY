import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getUtilisateur } from "@/lib/auth";
import { seDeconnecter } from "@/lib/actions";
import { ROLE_LABELS, roleAuMoins, type Role } from "@/lib/roles";
import { NavLinks } from "@/components/NavLinks";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUtilisateur();
  if (!user) redirect("/login");

  // Mot de passe provisoire : rien d'autre n'est accessible tant qu'il n'a pas
  // été changé. Le contrôle est ici, dans le gabarit commun, pour qu'aucune
  // page ne puisse être atteinte en tapant son adresse directement.
  if (user.doitChangerMotDePasse) {
    const chemin = (await headers()).get("x-chemin") ?? "";
    if (!chemin.startsWith("/mot-de-passe")) redirect("/mot-de-passe");
  }

  const estCoordinateur = roleAuMoins(user.role, "COORDINATEUR");

  // Accès directs de la barre mobile (4 + Plus) et liens du menu "Plus"
  const principaux = [
    { href: "/accueil", label: "Accueil", icone: "🏠" },
    { href: "/programme", label: "Programme", icone: "📅", court: "Prog." },
    { href: "/rapports", label: "Mon rapport", icone: "📝", court: "Rapport" },
    { href: "/cars", label: "Cars", icone: "🚌" },
    { href: "/jeunes", label: "Jeunes", icone: "👥" },
  ];
  const secondaires = [
    { href: "/groupes", label: "Groupes", icone: "🧑‍🤝‍🧑" },
    ...(roleAuMoins(user.role, "ADJOINT")
      ? [{ href: "/pieux", label: "Pieux et districts", icone: "🏛️" }]
      : []),
    { href: "/organigramme", label: "Organigramme", icone: "🗂️" },
    { href: "/annonces", label: "Annonces", icone: "📢" },
    ...(estCoordinateur
      ? [{ href: "/rapports/final", label: "Rapport final", icone: "📊" }]
      : []),
    { href: "/attestation", label: "Mon attestation", icone: "🎓" },
    ...(user.role === "DIRIGEANT"
      ? [{ href: "/attestations", label: "Attestations", icone: "🏅" }]
      : []),
    ...(estCoordinateur ? [{ href: "/admin", label: "Administration", icone: "⚙️" }] : []),
  ];
  const tous = [...principaux, ...secondaires];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-fsy-dark text-white sticky top-0 z-20 shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/accueil"
            className="font-bold text-lg whitespace-nowrap flex items-center gap-2"
          >
            <Logo taille={32} clair />
            FSY 2026
          </Link>
          <div className="text-sm text-blue-200 truncate">
            {user.prenom}
            <span className="hidden sm:inline">
              {" "}{user.nom} — {ROLE_LABELS[user.role as Role]}
            </span>
          </div>
          <form action={seDeconnecter}>
            <button className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition">
              Déconnexion
            </button>
          </form>
        </div>
        {/* Navigation horizontale : tablette / ordinateur uniquement */}
        <nav className="max-w-6xl mx-auto px-2 overflow-x-auto hidden sm:block">
          <NavLinks liens={tous.map(({ href, label }) => ({ href, label }))} />
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pb-24 sm:pb-4">{children}</main>

      <footer className="hidden sm:block text-center text-xs text-slate-400 py-4">
        <Link href="/" className="hover:text-fsy">
          FSY 2026 — Abidjan Ouest · 2026.fsy.ci
        </Link>
      </footer>

      {/* Navigation mobile en bas d'écran */}
      <BottomNav principaux={principaux} secondaires={secondaires} />
    </div>
  );
}
