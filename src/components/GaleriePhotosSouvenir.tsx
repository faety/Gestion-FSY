"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supprimerPhotoSouvenir } from "@/lib/actions";

// La galerie du photobooth, pour la direction : regarder, télécharger pour le
// diaporama, retirer ce qui doit l'être.
export function GaleriePhotosSouvenir({
  photos,
  direction,
}: {
  photos: { id: string; url: string | null; pleine: string | null; cadre: string; date: string }[];
  /** Couple dirigeant et coordinateurs principaux : toutes les photos, et la suppression. */
  direction: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ouverte, setOuverte] = useState<(typeof photos)[number] | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {direction ? "📸 Galerie souvenir" : "📸 Mes souvenirs"}
          </h1>
          <p className="text-slate-500 text-sm">
            {direction ? (
              <>
                {photos.length} photo(s) du photobooth — iPad de l&apos;accueil et téléphones
                des encadrants réunis. Des mineurs y figurent : elles restent ici, et servent au
                diaporama du cinquième jour.
              </>
            ) : (
              <>
                {photos.length} photo(s) prise(s) par vous. Vous seul et la direction les voyez ;
                téléchargez celles que vous voulez garder.
              </>
            )}
          </p>
        </div>
        <Link
          href="/souvenir"
          className="shrink-0 bg-fsy text-white text-sm font-medium rounded-lg px-3.5 py-2 hover:bg-fsy-dark transition"
        >
          {direction ? "Ouvrir le photobooth" : "📷 Prendre une photo"}
        </Link>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-slate-600 space-y-2">
          {direction ? (
            <p>
              Aucune photo pour l&apos;instant. Ouvrez le photobooth sur l&apos;iPad, posez-le sur
              un support, et laissez les jeunes faire le reste.
            </p>
          ) : (
            <>
              <p className="font-medium text-slate-800">
                Vous n&apos;avez encore aucune photo souvenir.
              </p>
              <p>
                Le photobooth marche depuis votre téléphone : appuyez sur
                <strong> 📷 Prendre une photo</strong>, choisissez un cadre FSY, et prenez
                vos jeunes en photo — ou vous-même en selfie. Le bouton 🔄 bascule entre
                la caméra avant et arrière, et <strong>Portrait / Paysage</strong> change le sens
                du cadre.
              </p>
              <p>
                Après la prise :{" "}
                <strong>⬇️ Sur mon appareil</strong> enregistre la photo dans votre téléphone,{" "}
                <strong>💛 Galerie</strong> l&apos;envoie à la direction — et vos plus
                belles photos passeront dans le <strong>diaporama du cinquième jour</strong>.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setOuverte(p)}
              className="relative rounded-xl overflow-hidden shadow-sm hover:shadow transition bg-white"
              style={{ aspectRatio: "3 / 4" }}
            >
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="text-xs text-slate-400">indisponible</span>
              )}
            </button>
          ))}
        </div>
      )}

      {ouverte && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setOuverte(null)}
        >
          {ouverte.pleine && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ouverte.pleine}
              alt=""
              className="max-h-[80vh] max-w-full rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="flex gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
            {ouverte.pleine && (
              <a
                href={ouverte.pleine}
                download={`souvenir-fsy-${ouverte.id}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="bg-white text-slate-800 text-sm font-medium rounded-lg px-4 py-2"
              >
                ⬇️ Télécharger
              </a>
            )}
            {direction && (
            <button
              disabled={pending}
              onClick={() => {
                if (!confirm("Supprimer cette photo ? Elle sera retirée définitivement.")) return;
                startTransition(async () => {
                  await supprimerPhotoSouvenir(ouverte.id);
                  setOuverte(null);
                  router.refresh();
                });
              }}
              className="bg-red-600 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50"
            >
              Supprimer
            </button>
            )}
            <button
              onClick={() => setOuverte(null)}
              className="bg-white/20 text-white text-sm font-medium rounded-lg px-4 py-2"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
