"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ liens }: { liens: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 pb-2">
      {liens.map((lien) => {
        const actif =
          lien.href === "/" ? pathname === "/" : pathname.startsWith(lien.href);
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
