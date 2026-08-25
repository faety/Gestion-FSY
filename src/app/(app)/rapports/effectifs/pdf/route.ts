// Effectifs des repas — jeunes, encadrants et toute personne servie sur place,
// d'une seule numérotation continue.
import { NextRequest } from "next/server";
import { getUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { journaliser } from "@/lib/audit";
import { genererEffectifsRepasPdf } from "@/lib/listes-pdf";

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

  // Par défaut, seuls les jeunes arrivés : on ne sert pas un repas à une
  // inscription. La variante « tous les attendus » reste possible tant que la
  // présence n'est pas à jour dans l'application.
  const tousLesJeunes = requete.nextUrl.searchParams.get("tous") === "1";
  const { octets, nomFichier, total, nbJeunes } = await genererEffectifsRepasPdf(user, {
    tousLesJeunes,
  });
  await journaliser(
    user.id,
    "EXPORT_EFFECTIFS_REPAS",
    `${nbJeunes} jeune(s) ${tousLesJeunes ? "attendus" : "arrivés"} — numérotation jusqu'à ${total}`
  );

  return new Response(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
