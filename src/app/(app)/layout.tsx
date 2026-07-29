import { redirect } from "next/navigation";
import Link from "next/link";
import { getUtilisateur } from "@/lib/auth";
import { seDeconnecter } from "@/lib/actions";
import { ROLE_LABELS, roleAuMoins, type Role } from "@/lib/roles";
import { NavLinks } from "@/components/NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUtilisateur();
  if (!user) redirect("/login");

  const liens = [
    { href: "/", label: "Accueil" },
    { href: "/programme", label: "Programme" },
    { href: "/cars", label: "Cars" },
    { href: "/groupes", label: "Groupes" },
    { href: "/jeunes", label: "Jeunes" },
    { href: "/organigramme", label: "Organigramme" },
    { href: "/annonces", label: "Annonces" },
    ...(roleAuMoins(user.role, "COORDINATEUR") ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-fsy-dark text-white sticky top-0 z-20 shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="font-bold text-lg whitespace-nowrap">
            FSY 2026
          </Link>
          <div className="hidden sm:block text-sm text-blue-200 truncate">
            {user.prenom} {user.nom} — {ROLE_LABELS[user.role as Role]}
          </div>
          <form action={seDeconnecter}>
            <button className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition">
              Déconnexion
            </button>
          </form>
        </div>
        <nav className="max-w-6xl mx-auto px-2 overflow-x-auto">
          <NavLinks liens={liens} />
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto p-4">{children}</main>
      <footer className="text-center text-xs text-slate-400 py-4">
        FSY 2026 — Abidjan Ouest
      </footer>
    </div>
  );
}
