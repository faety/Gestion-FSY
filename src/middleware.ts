import { NextResponse, type NextRequest } from "next/server";

// Le gabarit de l'application a besoin de connaître le chemin demandé pour
// laisser passer la page de changement de mot de passe et rediriger tout le
// reste. Les composants serveur n'y ont pas accès : le middleware le recopie
// dans un en-tête.
export function middleware(request: NextRequest) {
  const entetes = new Headers(request.headers);
  entetes.set("x-chemin", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: entetes } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
