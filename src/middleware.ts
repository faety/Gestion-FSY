import { NextResponse, type NextRequest } from "next/server";
import { LIEN_ALBUM_SOUVENIRS, SOUS_DOMAINES_ALBUM } from "@/lib/souvenirs";

// Deux choses, avant toute page.
//
// 1. Le sous-domaine de l'album. souvenir2026.fsy.ci ne sert aucune page : il
//    renvoie sur l'album partagé, quel que soit le chemin demandé. C'est ici
//    que cela se décide, pas dans une route — le middleware voit l'hôte, et
//    lui seul peut trancher avant que Next ne cherche une page à afficher.
//
// 2. Le chemin demandé, recopié dans un en-tête. Le gabarit de l'application
//    en a besoin pour laisser passer la page de changement de mot de passe et
//    rediriger tout le reste ; les composants serveur n'y ont pas accès.
export function middleware(request: NextRequest) {
  const hote = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (SOUS_DOMAINES_ALBUM.includes(hote.split(".")[0])) {
    return NextResponse.redirect(LIEN_ALBUM_SOUVENIRS, {
      // Temporaire, et jamais mise en cache : l'album doit rester changeable.
      status: 302,
      headers: {
        // Des photos de mineurs : rien de tout cela dans un moteur de recherche.
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      },
    });
  }

  const entetes = new Headers(request.headers);
  entetes.set("x-chemin", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: entetes } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
