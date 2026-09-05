import { NextResponse, type NextRequest } from "next/server";

// Avant toute page : le chemin demandé, recopié dans un en-tête.
//
// Le gabarit de l'application en a besoin pour laisser passer la page de
// changement de mot de passe et rediriger tout le reste ; les composants
// serveur n'ont pas accès à l'URL demandée autrement.
//
// C'est aussi ici — et seulement ici — qu'on peut décider selon l'hôte : le
// middleware voit le nom de domaine, une page non. Exemple, un sous-domaine
// qui renvoie ailleurs quel que soit le chemin :
//
//   const hote = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
//   if (hote.startsWith("album.")) {
//     return NextResponse.redirect("https://…", { status: 302,
//       headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
//   }
export function middleware(request: NextRequest) {
  const entetes = new Headers(request.headers);
  entetes.set("x-chemin", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: entetes } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
