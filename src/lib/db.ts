import { PrismaClient } from "@prisma/client";

// PostgreSQL (Neon). Sur Vercel, chaque fonction serverless est un processus
// séparé : sans limite, quelques dizaines d'encadrants connectés en même temps
// épuiseraient les connexions autorisées par la base. On demande donc une seule
// connexion par instance, réutilisée d'une requête à l'autre.
function urlBase(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !process.env.VERCEL || url.includes("connection_limit=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=1&pool_timeout=20`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: urlBase() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
