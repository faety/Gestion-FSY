import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

// Sur Vercel (serverless), le système de fichiers du projet est en lecture
// seule : on copie la base de démonstration embarquée vers /tmp au premier
// démarrage. Attention : /tmp est éphémère — pour une vraie mise en
// production, utiliser PostgreSQL (voir README).
function resoudreUrlBase(): string | undefined {
  if (process.env.VERCEL) {
    const cible = "/tmp/fsy.db";
    if (!fs.existsSync(cible)) {
      const demo = path.join(process.cwd(), "prisma", "demo.db");
      fs.copyFileSync(demo, cible);
    }
    return `file:${cible}`;
  }
  return process.env.DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: resoudreUrlBase() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
