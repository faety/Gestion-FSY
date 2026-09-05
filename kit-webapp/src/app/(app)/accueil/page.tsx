import { exigerUtilisateur } from "@/lib/auth";
import { libelleRoleAccorde } from "@/lib/roles";
import { prisma } from "@/lib/db";

export const metadata = { title: "Accueil" };

export default async function AccueilPage() {
  const user = await exigerUtilisateur();
  const dernieres = await prisma.auditLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Bonjour {user.prenom} 👋</h1>
        <p className="text-slate-500 text-sm">{libelleRoleAccorde(user.role, user.sexe)}</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">Vos dernières actions</h2>
        {dernieres.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">Rien pour l&apos;instant.</p>
        ) : (
          <ul className="text-sm mt-2 space-y-1">
            {dernieres.map((a) => (
              <li key={a.id} className="flex gap-2">
                <span className="text-slate-400 shrink-0">{fmt.format(a.createdAt)}</span>
                <span className="font-mono text-xs self-center">{a.action}</span>
                {a.details && <span className="text-slate-500 truncate">{a.details}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
