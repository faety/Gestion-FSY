"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { lienActif } from "./NavLinks";

type Lien = { href: string; label: string; icone: string; court?: string };

// Barre de navigation mobile fixée en bas d'écran : 4 accès directs + menu "Plus"
export function BottomNav({
  principaux,
  secondaires,
}: {
  principaux: Lien[];
  secondaires: Lien[];
}) {
  const pathname = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const courant = lienActif(
    pathname,
    [...principaux, ...secondaires].map((l) => l.href)
  );
  const estActif = (href: string) => href === courant;
  const secondaireActif = secondaires.some((l) => estActif(l.href));

  return (
    <>
      {menuOuvert && (
        <div
          className="fixed inset-0 bg-black/30 z-30 sm:hidden"
          onClick={() => setMenuOuvert(false)}
        >
          {/* Les rôles de direction ont beaucoup d'entrées : deux colonnes
              compactes, et le panneau défile à l'intérieur de l'écran plutôt
              que d'en déborder. */}
          <div
            className="absolute bottom-20 left-3 right-3 bg-white rounded-2xl shadow-xl p-2 overflow-y-auto overscroll-contain"
            style={{ maxHeight: "calc(100dvh - 7.5rem)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-1">
              {secondaires.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOuvert(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm leading-tight ${
                    estActif(l.href) ? "bg-fsy-light text-fsy-dark font-semibold" : "text-slate-700"
                  }`}
                >
                  <span className="text-lg shrink-0">{l.icone}</span>
                  <span className="min-w-0">{l.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 sm:hidden pb-[env(safe-area-inset-bottom)]">
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${principaux.length + 1}, minmax(0, 1fr))` }}
        >
          {principaux.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOuvert(false)}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${
                estActif(l.href) && !menuOuvert
                  ? "text-fsy font-semibold"
                  : "text-slate-500"
              }`}
            >
              <span className="text-xl leading-none">{l.icone}</span>
              {l.court ?? l.label}
            </Link>
          ))}
          <button
            onClick={() => setMenuOuvert(!menuOuvert)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${
              menuOuvert || secondaireActif ? "text-fsy font-semibold" : "text-slate-500"
            }`}
          >
            <span className="text-xl leading-none">☰</span>
            Plus
          </button>
        </div>
      </nav>
    </>
  );
}
