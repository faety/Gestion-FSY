import { getUtilisateur } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { APP } from "@/lib/app";
import { Composeur, enTeteDocument, reponsePdf } from "@/lib/pdf";
import { SITE_URL } from "@/lib/site";
import { libelleRoleAccorde } from "@/lib/roles";

// PDF composé côté serveur : liste des comptes, avec un QR vers le site.
// Les routes qui livrent des documents vérifient la session elles-mêmes : le
// gabarit (app) ne les protège pas.
export async function GET() {
  const user = await getUtilisateur();
  if (!user) return new Response("Connexion requise", { status: 401 });

  const comptes = await prisma.user.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }] });
  const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

  const c = new Composeur();
  await c.initialiser();
  await enTeteDocument(c, "Liste des comptes", `${APP.nom} · ${fmt.format(new Date())}`);
  await c.qr(SITE_URL, 595.28 - 46 - 60, 841.89 - 46, 60);

  c.paragraphe(
    `Document d'exemple composé avec pdf-lib. ${comptes.length} compte(s). Il montre l'en-tête au logo, un paragraphe découpé automatiquement sur la largeur de la page, un tableau qui passe à la page suivante, et un QR code.`
  );
  c.titre("Comptes");
  c.tableau(
    [
      { titre: "Nom", largeur: 200 },
      { titre: "Adresse", largeur: 190 },
      { titre: "Rôle", largeur: 113 },
    ],
    comptes.map((u) => [`${u.prenom} ${u.nom}`, u.email, libelleRoleAccorde(u.role, u.sexe)])
  );

  return reponsePdf(await c.octets(), "comptes.pdf");
}
