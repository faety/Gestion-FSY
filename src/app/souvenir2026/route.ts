// fsy.ci/souvenir2026 → l'album partagé de la conférence.
//
// Le lien court que l'on dicte au micro et que l'on imprime sur une affiche.
// Voir src/lib/souvenirs.ts pour le pourquoi du chemin plutôt que du
// sous-domaine, et pour changer d'album.
import { NextResponse } from "next/server";
import { LIEN_ALBUM_SOUVENIRS } from "@/lib/souvenirs";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.redirect(LIEN_ALBUM_SOUVENIRS, {
    // 302 : temporaire. L'album peut changer, et un navigateur qui aurait
    // gravé un 301 continuerait d'envoyer les gens sur l'ancien.
    status: 302,
    headers: {
      // Des photos de mineurs : cette adresse n'a rien à faire dans un moteur
      // de recherche, même comme simple redirection.
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
