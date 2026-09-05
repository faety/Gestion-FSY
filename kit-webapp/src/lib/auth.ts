import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { APP } from "./app";
import { prisma } from "./db";
import { roleAuMoins, type Role } from "./roles";

// Sessions : un JWT signé (HS256) dans un cookie httpOnly. Pas de table de
// sessions, pas de bibliothèque d'authentification : une centaine de lignes
// qu'on comprend entièrement.

const COOKIE_NAME = `${APP.court}_session`;

// Secret de signature.
//
// Ne JAMAIS retomber en silence sur une constante écrite dans le code : sans
// AUTH_SECRET en production, n'importe qui pourrait forger un jeton pour
// n'importe quel compte. Un repli silencieux est le pire des cas — tout
// fonctionne, et rien ne signale que la porte est ouverte.
//
// Le calcul est différé plutôt que fait à l'import : la compilation ne dispose
// pas toujours des variables d'environnement.
let cle: Uint8Array | null = null;

function secretDeSignature(): Uint8Array {
  if (cle) return cle;
  const brut = process.env.AUTH_SECRET;
  if (!brut || brut.length < 24) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET est absent ou trop court (24 caractères au minimum). " +
          "Générez-en un avec : openssl rand -base64 48"
      );
    }
    console.warn("AUTH_SECRET absent : secret de développement utilisé.");
    return (cle = new TextEncoder().encode("secret-de-developpement-local-uniquement"));
  }
  return (cle = new TextEncoder().encode(brut));
}

export async function creerSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${APP.sessionJours}d`)
    .sign(secretDeSignature());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * APP.sessionJours,
    path: "/",
  });
}

export async function detruireSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Utilisateur courant, mis en cache par requête : le gabarit, la page et les
 * actions le demandent tous, une seule lecture en base suffit.
 *
 * Pour enrichir le profil (relations, droits), c'est ici qu'on ajoute un
 * `include` — tout le monde passe par cette fonction.
 */
export const getUtilisateur = cache(async () => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretDeSignature());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.actif) return null;
    return user;
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
 * session présente lèverait avant que la redirection n'aboutisse.
 */
export const exigerUtilisateur = async () => (await getUtilisateur()) ?? redirect("/login");

/** Comme exigerUtilisateur, avec un rôle minimum ; sinon retour à l'accueil. */
export async function exigerRole(minimum: Role) {
  const user = await exigerUtilisateur();
  if (!roleAuMoins(user.role, minimum)) redirect("/accueil");
  return user;
}
