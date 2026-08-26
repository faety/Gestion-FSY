import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { prisma } from "./db";

const COOKIE_NAME = "fsy_session";

// Secret de signature des sessions.
//
// Il retombait sur une constante écrite dans ce fichier, donc publiée avec le
// dépôt : sans AUTH_SECRET en production, n'importe qui pouvait forger un jeton
// pour n'importe quel compte, y compris le couple dirigeant, et lire les
// données médicales de six cent cinquante mineurs. Un repli silencieux est le
// pire des cas — tout fonctionne, et rien ne signale que la porte est ouverte.
//
// Le calcul est différé plutôt que fait à l'import : la compilation ne dispose
// pas toujours des variables d'environnement, et il n'y a pas de raison de la
// faire échouer pour cela.
let cle: Uint8Array | null = null;

function secretDeSignature(): Uint8Array {
  if (cle) return cle;
  const brut = process.env.AUTH_SECRET;
  if (!brut || brut.length < 24) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET est absent ou trop court (24 caractères au minimum). " +
          "Les sessions ne peuvent pas être signées sûrement. " +
          "Générez-en un avec : openssl rand -base64 48"
      );
    }
    console.warn(
      "AUTH_SECRET absent : secret de développement utilisé. Ne jamais faire cela en production."
    );
    return (cle = new TextEncoder().encode("secret-de-developpement-local-uniquement"));
  }
  return (cle = new TextEncoder().encode(brut));
}

export async function creerSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secretDeSignature());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
  });
}

export async function detruireSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// ---------- Mode aperçu ----------
//
// Le couple dirigeant peut voir l'application comme la voit un coordinateur
// principal, un adjoint ou un conseiller : un cookie porte l'appel choisi, et
// getUtilisateur — l'unique point de passage des pages comme des actions —
// présente alors un profil rétrogradé : appel abaissé, aucun droit nominatif,
// aucune affectation. L'identité reste la vraie : le journal d'audit dit
// toujours qui a réellement agi.
//
// Le cookie n'a d'effet que si le compte est réellement DIRIGEANT : posé sur
// une autre session, il ne fait rien. Et l'aperçu ne peut qu'abaisser, jamais
// élever. Pendant l'aperçu, toute écriture est refusée (voir exiger, dans
// actions.ts) : voir comme un conseiller, oui ; agir en son nom, non.

const COOKIE_APERCU = "fsy_apercu";
export const ROLES_APERCU = ["COORDINATEUR", "ADJOINT", "CONSEILLER"] as const;
export type RoleApercu = (typeof ROLES_APERCU)[number];

export async function poserApercu(role: RoleApercu) {
  const store = await cookies();
  store.set(COOKIE_APERCU, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function retirerApercu() {
  const store = await cookies();
  store.delete(COOKIE_APERCU);
}

// Utilisateur courant, mis en cache par requête
export const getUtilisateur = cache(async () => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretDeSignature());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        pieu: true,
        compagnie: true,
        groupesDiriges: true,
        compagniesCoordonnees: { select: { id: true, nom: true, numero: true } },
      },
    });
    if (!user || !user.actif) return null;

    const demande = store.get(COOKIE_APERCU)?.value;
    if (
      user.role === "DIRIGEANT" &&
      demande &&
      (ROLES_APERCU as readonly string[]).includes(demande)
    ) {
      return {
        ...user,
        role: demande,
        droitsSupplementaires: "[]",
        groupesDiriges: [],
        compagniesCoordonnees: [],
        compagnie: null,
        compagnieId: null,
        apercu: demande as RoleApercu,
      };
    }
    return { ...user, apercu: null as RoleApercu | null };
  } catch {
    return null;
  }
});

export type UtilisateurConnecte = NonNullable<Awaited<ReturnType<typeof getUtilisateur>>>;

/**
 * L'utilisateur connecté, ou une redirection vers la connexion.
 *
 * Le gabarit de `(app)` redirige déjà les visiteurs sans session, mais React
 * rend les pages en même temps que leur gabarit : une page qui suppose la
 * session présente lève avant que la redirection n'aboutisse, et le visiteur
 * voit une erreur serveur au lieu du formulaire de connexion. Passer par ici
 * rend l'affirmation vraie plutôt que de l'espérer.
 */
export const exigerUtilisateur = async () => (await getUtilisateur()) ?? redirect("/login");
