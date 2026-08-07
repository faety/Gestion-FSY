// État du calendrier en base — de quoi vérifier, sans se connecter, que la
// production s'est bien réalignée après un changement de dates. N'expose que
// des comptes et des dates d'activités, déjà publiés sur la page d'accueil :
// rien de personnel n'en sort.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CONFERENCE, DATE_FIN, DATE_VEILLE } from "@/lib/theme";

export const dynamic = "force-dynamic";

const memeJour = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const jour = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" });

export async function GET() {
  const [activites, officielles, premiere, derniere] = await Promise.all([
    prisma.activite.count(),
    prisma.activite.count({ where: { officielle: true } }),
    prisma.activite.findFirst({
      where: { officielle: true },
      orderBy: { debut: "asc" },
      select: { debut: true },
    }),
    prisma.activite.findFirst({
      where: { officielle: true },
      orderBy: { debut: "desc" },
      select: { debut: true },
    }),
  ]);

  // Aligné : le programme officiel commence à la veille et finit le dernier
  // jour. C'est le contrat que l'amorçage rétablit à chaque déploiement.
  const aligne =
    premiere !== null &&
    derniere !== null &&
    memeJour(premiere.debut, DATE_VEILLE) &&
    memeJour(derniere.debut, DATE_FIN);

  return NextResponse.json({
    attendu: { veille: jour.format(DATE_VEILLE), dernierJour: jour.format(DATE_FIN), periode: CONFERENCE.duAu },
    enBase: {
      activites,
      officielles,
      premiereOfficielle: premiere ? jour.format(premiere.debut) : null,
      derniereOfficielle: derniere ? jour.format(derniere.debut) : null,
    },
    aligne,
  });
}
