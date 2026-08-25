// Effectifs des repas — jeunes, encadrants et toute personne servie sur place,
// d'une seule numérotation continue.
import { getUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { journaliser } from "@/lib/audit";
import { genererEffectifsRepasPdf } from "@/lib/listes-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(requete: Request) {
  const user = await getUtilisateur();
  if (!user) return Response.redirect(new URL("/login", requete.url), 302);
  if (!roleAuMoins(user.role, "COORDINATEUR")) {
    return new Response("Réservé au couple dirigeant et aux coordinateurs principaux.", {
      status: 403,
    });
  }

  const { octets, nomFichier, total } = await genererEffectifsRepasPdf(user);
  await journaliser(user.id, "EXPORT_EFFECTIFS_REPAS", `Numérotation imprimée jusqu'à ${total}`);

  return new Response(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
