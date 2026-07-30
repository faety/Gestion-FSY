"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Le lien actif est celui dont le chemin est le préfixe le plus long : sur
// /rapports/final, c'est « Rapport final » qui s'allume, pas « Mon rapport ».
export function lienActif(pathname: string, hrefs: string[]): string | null {
  const candidats = hrefs.filter((h) => pathname === h || pathname.startsWith(`${h}/`));
  return candidats.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function NavLinks({ liens }: { liens: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const courant = lienActif(pathname, liens.map((l) => l.href));
  return (
    <div className="flex gap-1 pb-2">
      {liens.map((lien) => {
        const actif = lien.href === courant;
        return (
          <Link
            key={lien.href}
            href={lien.href}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
              actif ? "bg-white text-fsy-dark font-semibold" : "text-blue-100 hover:bg-white/10"
            }`}
          >
            {lien.label}
          </Link>
        );
      })}
    </div>
  );
}
