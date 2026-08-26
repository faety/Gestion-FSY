// fsy.ci/souvenirs → le même album que /souvenir2026.
//
// Deux chemins pour une seule adresse : celui qu'on imprime (souvenir2026) et
// celui qu'on tape de mémoire. Rien ne coûte moins qu'un alias, et rien ne
// coûte plus qu'un lien dicté de travers un samedi soir.
import { NextResponse } from "next/server";
import { LIEN_ALBUM_SOUVENIRS } from "@/lib/souvenirs";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.redirect(LIEN_ALBUM_SOUVENIRS, {
    status: 302,
    headers: {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
