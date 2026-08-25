// Feuilles d'émargement par pieu — une page par pieu ou district.
//
// Ces feuilles nomment des mineurs et partent en salle : réservées à ceux qui
// répondent de la conférence entière, et chaque édition est inscrite au journal.
import { NextRequest } from "next/server";
import { getUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { journaliser } from "@/lib/audit";
import { genererEmargementPdf } from "@/lib/listes-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(requete: NextRequest) {
  const user = await getUtilisateur();
  if (!user) return Response.redirect(new URL("/login", requete.url), 302);
  if (!roleAuMoins(user.role, "COORDINATEUR")) {
    return new Response("Réservé au couple dirigeant et aux coordinateurs principaux.", {
      status: 403,
    });
  }

  // Par défaut la feuille porte tous les jeunes attendus : c'est elle qui
  // établit qui est là, elle ne peut pas partir d'un pointage incomplet.
  const presentsSeulement = requete.nextUrl.searchParams.get("presents") === "1";
  const { octets, nomFichier, nbJeunes } = await genererEmargementPdf(user, { presentsSeulement });
  await journaliser(
    user.id,
    "EXPORT_EMARGEMENT",
    `Feuilles d'émargement par pieu — ${nbJeunes} jeune(s)` +
      (presentsSeulement ? " (présents seulement)" : " (tous les attendus)")
  );

  return new Response(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
