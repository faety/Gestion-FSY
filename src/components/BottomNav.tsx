"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Lien = { href: string; label: string; icone: string };

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

  const estActif = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const secondaireActif = secondaires.some((l) => estActif(l.href));

  return (
    <>
      {menuOuvert && (
        <div
          className="fixed inset-0 bg-black/30 z-30 sm:hidden"
          onClick={() => setMenuOuvert(false)}
        >
          <div
            className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {secondaires.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOuvert(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base ${
                  estActif(l.href) ? "bg-fsy-light text-fsy-dark font-semibold" : "text-slate-700"
                }`}
              >
                <span className="text-xl">{l.icone}</span> {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 sm:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {principaux.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOuvert(false)}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                estActif(l.href) && !menuOuvert
                  ? "text-fsy font-semibold"
                  : "text-slate-500"
              }`}
            >
              <span className="text-xl leading-none">{l.icone}</span>
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => setMenuOuvert(!menuOuvert)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
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
