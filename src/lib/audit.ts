import { prisma } from "./db";

export async function journaliser(userId: string, action: string, details?: string) {
  await prisma.auditLog.create({ data: { userId, action, details } });
}
