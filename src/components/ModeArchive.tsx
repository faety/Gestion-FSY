"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { basculerAccesRestreints } from "@/lib/actions";

// L'interrupteur d'après conférence, dans l'Administration du couple.
//
// Un seul geste, réversible, avec une confirmation avant chaque bascule : il
// change ce que soixante personnes voient à leur prochaine ouverture de
// l'application, il ne doit pas partir d'un pouce qui glisse.
export function ModeArchive({ actif }: { actif: boolean }) {
  const router = useRouter();
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();

  const basculer = () =>
    demarrer(async () => {
      setErreur(null);
      try {
        await basculerAccesRestreints(!actif);
        setConfirme(false);
        router.refresh();
      } catch {
        setErreur("La bascule n'a pas abouti. Réessayez.");
      }
    });

  return (
    <div className="space-y-3">
      <div
        className={`rounded-lg border p-3 text-sm ${
          actif
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-slate-50 border-slate-200 text-slate-700"
        }`}
      >
        {actif ? (
          <>
            <strong>🔒 Accès d&apos;après conférence en vigueur.</strong> En dehors du couple
            dirigeant, chacun ne voit que l&apos;accueil, les annonces, son profil et — s&apos;il
            en a une — son attestation. Les listes de jeunes, la santé, les cars, les groupes et
            l&apos;administration sont fermés à tous les autres rôles.
          </>
        ) : (
          <>
            <strong>🔓 Accès complets.</strong> Chacun voit l&apos;application selon son rôle,
            comme pendant la conférence.
          </>
        )}
      </div>

      {erreur && <p className="text-sm text-red-700">{erreur}</p>}

      {!confirme ? (
        <button
          onClick={() => setConfirme(true)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            actif
              ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
              : "bg-fsy hover:bg-fsy-dark text-white"
          }`}
        >
          {actif ? "Rétablir les accès complets" : "Restreindre les accès (fin de conférence)"}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">
            {actif
              ? "Rouvrir toutes les pages à tous les rôles ?"
              : "Fermer tout sauf l'accueil, le profil, les annonces et les attestations ?"}
          </span>
          <button
            disabled={pending}
            onClick={basculer}
            className="rounded-lg bg-fsy hover:bg-fsy-dark text-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {pending ? "…" : "Oui, basculer"}
          </button>
          <button
            onClick={() => setConfirme(false)}
            className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
