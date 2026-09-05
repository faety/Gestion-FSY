import { prisma } from "./db";

/** Trace une action : qui, quoi, un détail libre. */
export async function journaliser(userId: string, action: string, details?: string) {
  await prisma.auditLog.create({ data: { userId, action, details } });
}

/**
 * Trace une *consultation*, pas une modification.
 *
 * Des données sensibles se regardent sans rien changer : sans trace, personne
 * ne saurait jamais qui les a ouvertes. On note l'accès une fois par personne
 * et par demi-journée — noter chaque rafraîchissement noierait le journal.
 */
export async function journaliserConsultation(userId: string, action: string, details?: string) {
  const depuis = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const deja = await prisma.auditLog.findFirst({
    where: { userId, action, createdAt: { gte: depuis } },
    select: { id: true },
  });
  if (deja) return;
  await prisma.auditLog.create({ data: { userId, action, details } });
}
