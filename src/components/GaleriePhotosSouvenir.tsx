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
  lots,
  lienAlbum,
}: {
  photos: { id: string; url: string | null; pleine: string | null; cadre: string; date: string }[];
  /** Couple dirigeant et coordinateurs principaux : toutes les photos, et la suppression. */
  direction: boolean;
  /** Nombre d'archives à proposer — 0 quand ce compte n'a pas le
   *  téléchargement groupé. Au-delà d'une centaine de photos, on télécharge en
   *  plusieurs fois plutôt qu'un seul fichier géant et fragile. */
  lots: number;
  /** L'album partagé de la conférence, derrière le lien court fsy.ci/souvenir2026. */
  lienAlbum: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ouverte, setOuverte] = useState<(typeof photos)[number] | null>(null);

  return (
    <div className="space-y-4">
      {/* Sur téléphone, le titre et les boutons se suivent ; à partir de la
          tablette, ils se partagent la ligne. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
        <div className="shrink-0 flex flex-wrap gap-2 sm:justify-end">
          {/* Tout emporter d'un coup : une archive ZIP, à ranger le soir même
              sur un ordinateur ou un disque. C'est la sauvegarde de ces
              jours-là — réservée pour l'instant au compte qui en répond. */}
          {photos.length > 0 &&
            lots > 0 &&
            (lots === 1 ? (
              <a
                href="/souvenir/galerie/zip"
                className="bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg px-3.5 py-2 hover:bg-slate-50 transition"
              >
                ⬇️ Tout télécharger
              </a>
            ) : (
              Array.from({ length: lots }, (_, i) => (
                <a
                  key={i}
                  href={`/souvenir/galerie/zip?lot=${i + 1}`}
                  className="bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg px-3.5 py-2 hover:bg-slate-50 transition"
                >
                  ⬇️ Lot {i + 1}/{lots}
                </a>
              ))
            ))}
          <Link
            href="/souvenir"
            className="bg-fsy text-white text-sm font-medium rounded-lg px-3.5 py-2 hover:bg-fsy-dark transition"
          >
            {direction ? "Ouvrir le photobooth" : "📷 Prendre une photo"}
          </Link>
        </div>
      </div>

      {/* Le lien court : celui qu'on dicte au micro et qu'on met dans un
          message. Il est ici pour que personne n'ait à le chercher. */}
      <a
        href={lienAlbum}
        target="_blank"
        rel="noreferrer"
        className="block bg-white rounded-xl shadow-sm p-3 hover:bg-slate-50 transition"
      >
        <div className="text-sm font-medium">🖼️ L&apos;album partagé de la conférence</div>
        <div className="text-xs text-slate-500 mt-0.5">
          Toutes les photos de FSY 2026, à partager par ce lien court :{" "}
          <span className="font-mono text-fsy">fsy.ci/souvenir2026</span>
        </div>
      </a>

      {photos.length > 0 && lots > 1 && (
        <p className="text-xs text-slate-500 -mt-2">
          Les photos sont réparties en {lots} archives : au-delà d&apos;une centaine, un seul
          fichier mettrait trop de temps à descendre et risquerait de s&apos;interrompre.
          Téléchargez-les l&apos;une après l&apos;autre.
        </p>
      )}

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
