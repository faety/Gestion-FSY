// Le rapport des repas, en PDF, pour le fournisseur.
//
// Même porte que la page Santé : ceux qui répondent de la conférence entière —
// couple dirigeant, coordinateurs principaux — et l'adjoint désigné au
// bien-être. Le document ne sort pas de l'application par hasard : chaque
// édition est inscrite au journal, avec qui l'a demandée.
import { getUtilisateur } from "@/lib/auth";
import { voitToutesLesAlertes } from "@/lib/roles";
import { journaliser } from "@/lib/audit";
import { genererRapportRepasPdf } from "@/lib/repas-pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getUtilisateur();
  if (!user) return Response.redirect(new URL("/login", req.url), 302);
  if (!voitToutesLesAlertes(user)) {
    return new Response(
      "Réservé au couple dirigeant, aux coordinateurs principaux et à l'adjoint chargé du bien-être.",
      { status: 403 }
    );
  }

  const { octets, nomFichier, nbConcernes } = await genererRapportRepasPdf(user);
  // Une extraction, pas une consultation : elle se note à chaque fois, sans le
  // regroupement par demi-journée. Ce document quitte l'application.
  await journaliser(
    user.id,
    "EXPORT_REPAS",
    `Rapport des repas pour le fournisseur — ${nbConcernes} jeune(s) concerné(s)`
  );

  return new Response(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
