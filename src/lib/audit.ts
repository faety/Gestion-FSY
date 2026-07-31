import { prisma } from "./db";

export async function journaliser(userId: string, action: string, details?: string) {
  await prisma.auditLog.create({ data: { userId, action, details } });
}

/**
 * Trace une *consultation*, pas une modification.
 *
 * Les dossiers médicaux de mineurs se regardent sans rien changer : sans trace,
 * personne ne saurait jamais qui les a ouverts. On garde donc l'accès, mais une
 * fois par personne et par demi-journée — noter chaque rafraîchissement de page
 * noierait le journal et rendrait le reste illisible, ce qui reviendrait à ne
 * rien tracer du tout.
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
