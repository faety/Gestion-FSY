// Téléchargement du programme en PDF — couple dirigeant et coordinateurs
// principaux uniquement. `?jour=0` pour la veille, 1 à 6 pour un jour, rien
// pour la conférence entière. Le document est composé depuis la base au moment
// de l'appel : il reflète toutes les mises à jour.
import { getUtilisateur } from "@/lib/auth";
import { roleAuMoins } from "@/lib/roles";
import { NB_JOURS } from "@/lib/theme";
import { genererProgrammeCondensePdf, genererProgrammePdf } from "@/lib/programme-pdf";

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

  // Version condensée : une ligne par activité, instructeurs S&I en tête —
  // pour les dirigeants de pieux et les partenaires.
  if (new URL(req.url).searchParams.get("format") === "condense") {
    const { octets, nomFichier } = await genererProgrammeCondensePdf(user);
    return new Response(Buffer.from(octets), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomFichier}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const brut = new URL(req.url).searchParams.get("jour");
  const jour = brut === null || brut === "" ? null : Number(brut);
  if (jour !== null && (!Number.isInteger(jour) || jour < 0 || jour > NB_JOURS)) {
    return new Response(`Le jour doit être compris entre 0 (veille) et ${NB_JOURS}.`, {
      status: 400,
    });
  }

  const { octets, nomFichier } = await genererProgrammePdf(jour, user);
  return new Response(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
