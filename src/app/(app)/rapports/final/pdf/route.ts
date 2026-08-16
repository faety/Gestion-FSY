// Rapport final en PDF — couple dirigeant et coordinateurs principaux
// uniquement, comme la page qu'il reflète. Composé depuis la base au moment
// de l'appel : prêt à partir le dernier jour, toutes les remises comprises.
import { getUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { genererRapportFinalPdf } from "@/lib/synthese-pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getUtilisateur();
  if (!user) {
    return Response.redirect(new URL("/login", req.url), 302);
  }
  if (!roleAuMoins(user.role, "COORDINATEUR")) {
    return new Response("Réservé au couple dirigeant et aux coordinateurs principaux.", {
      status: 403,
    });
  }

  const { octets, nomFichier } = await genererRapportFinalPdf(user);
  return new Response(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
