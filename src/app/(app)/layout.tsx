import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getUtilisateur } from "@/lib/auth";
import { ROLE_LABELS, roleAuMoins, voitToutesLesAlertes, type Role } from "@/lib/roles";
import { NavLinks } from "@/components/NavLinks";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { SITE_AFFICHE } from "@/lib/site";
import { A_ANNONCER } from "@/lib/report";
import { BarreReport } from "@/components/BandeauReport";
import { quitterApercu } from "@/lib/actions";

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
    ...(roleAuMoins(user.role, "COORDINATEUR")
      ? [
          { href: "/reorganisation", label: "Réorganisation", icone: "🧩" },
          { href: "/souvenir/galerie", label: "Photobooth souvenir", icone: "📸" },
        ]
      : []),
    ...(roleAuMoins(user.role, "ADJOINT")
      ? [{ href: "/pieux", label: "Pieux et districts", icone: "🏛️" }]
      : []),
    ...(voitToutesLesAlertes(user)
      ? [{ href: "/sante", label: "Santé et alimentation", icone: "⚕️" }]
      : []),
    { href: "/organigramme", label: "Organigramme", icone: "🗂️" },
    { href: "/annonces", label: "Annonces", icone: "📢" },
    ...(estCoordinateur
      ? [
          { href: "/preparation", label: "Préparation", icone: "🧭", court: "Prépa." },
          { href: "/rapports/final", label: "Rapport final", icone: "📊" },
        ]
      : []),
    { href: "/profil", label: "Mon profil", icone: "🙋" },
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
          {/* Le portrait mène au profil : c'est là qu'on le cherche d'instinct,
              et cela donne enfin un chemin vers le changement de mot de passe. */}
          <Link
            href="/profil"
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition"
          >
            <Avatar
              prenom={user.prenom}
              nom={user.nom}
              photoPublicId={user.photoPublicId}
              taille={30}
            />
            <span className="text-sm text-blue-200 truncate">
              {user.prenom}
              <span className="hidden sm:inline">
                {" "}{user.nom} — {ROLE_LABELS[user.role as Role]}
              </span>
            </span>
          </Link>
          <BoutonDeconnexion prenom={user.prenom} />
        </div>
        {/* Navigation horizontale : tablette / ordinateur uniquement */}
        <nav className="max-w-6xl mx-auto px-2 overflow-x-auto hidden sm:block">
          <NavLinks liens={tous.map(({ href, label }) => ({ href, label }))} />
        </nav>
      </header>

      {/* Le report se lit sur chaque page, pas seulement là où l'on pense à
          aller le chercher : la conférence n'a plus de date, et rien de ce qui
          est affiché en dessous ne doit se lire sans le savoir. */}
      {A_ANNONCER && <BarreReport />}

      {/* Mode aperçu : le dirigeant regarde avec les yeux d'un autre appel.
          Le bandeau est sur chaque page — on ne doit jamais confondre ce que
          l'on voit avec ce que l'on est — et porte la sortie, car les pages
          d'administration ne sont plus accessibles pendant l'aperçu. */}
      {user.apercu && (
        <div className="bg-violet-700 text-white text-sm" role="status">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
            <span>
              👁 Vous voyez l&apos;application comme la voit un{" "}
              <strong>{ROLE_LABELS[user.apercu as Role].toLowerCase()}</strong> — lecture
              seule, rien ne peut être enregistré.
            </span>
            <form action={quitterApercu}>
              <button className="underline font-semibold whitespace-nowrap">
                Quitter l&apos;aperçu
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pb-24 sm:pb-4">{children}</main>

      <footer className="hidden sm:block text-center text-xs text-slate-400 py-4">
        <Link href="/" className="hover:text-fsy">
          FSY 2026 — Abidjan Ouest · {SITE_AFFICHE}
        </Link>
      </footer>

      {/* Navigation mobile en bas d'écran */}
      <BottomNav principaux={principaux} secondaires={secondaires} />
    </div>
  );
}
