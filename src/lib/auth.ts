import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { prisma } from "./db";

const COOKIE_NAME = "fsy_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fsy-dev-secret"
);

export async function creerSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);
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

// Utilisateur courant, mis en cache par requête
export const getUtilisateur = cache(async () => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { pieu: true, compagnie: true, groupesDiriges: true },
    });
    return user && user.actif ? user : null;
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
