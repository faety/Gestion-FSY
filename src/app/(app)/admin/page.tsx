import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { ROLE_LABELS, roleAuMoins, type Role } from "@/lib/roles";
import {
  creerUtilisateur,
  basculerDroitModification,
  basculerActif,
} from "@/lib/actions";

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" });

export default async function AdminPage() {
  const user = (await getUtilisateur())!;
  if (!roleAuMoins(user.role, "COORDINATEUR")) redirect("/accueil");
  const estDirigeant = user.role === "DIRIGEANT";

  const [utilisateurs, compagnies, audit] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { nom: "asc" }],
      include: { compagnie: true, groupesDiriges: true },
    }),
    prisma.compagnie.findMany({ orderBy: { nom: "asc" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Administration</h1>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-3">Créer un compte</h2>
        <form action={creerUtilisateur} className="grid sm:grid-cols-3 gap-3 text-sm">
          <input name="prenom" required placeholder="Prénom" className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="nom" required placeholder="Nom" className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="email" type="email" required placeholder="Email" className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="motDePasse" type="password" required minLength={6} placeholder="Mot de passe (min. 6)" className="rounded-lg border border-slate-300 px-3 py-2" />
          <select name="sexe" className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
            <option value="M">Homme</option>
            <option value="F">Femme</option>
          </select>
          <select name="role" className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
            <option value="CONSEILLER">Conseiller / Conseillère</option>
            <option value="ADJOINT">Coordinateur adjoint</option>
            <option value="COORDINATEUR">Coordinateur principal</option>
            {estDirigeant && <option value="DIRIGEANT">Couple dirigeant</option>}
          </select>
          <select name="compagnieId" className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
            <option value="">Compagnie (adjoints uniquement)</option>
            {compagnies.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <button className="bg-fsy text-white rounded-lg px-4 py-2 font-medium hover:bg-fsy-dark sm:col-span-2">
            Créer le compte
          </button>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <h2 className="font-bold p-4 pb-0">Équipe ({utilisateurs.length})</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-3">Nom</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Affectation</th>
              {estDirigeant && <th className="p-3">Droit de modif. directe</th>}
              {estDirigeant && <th className="p-3">Présence</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {utilisateurs.map((u) => {
              const aDroit = u.droitsSupplementaires.includes("MODIFICATION_DIRECTE");
              return (
                <tr key={u.id} className={!u.actif ? "opacity-50" : ""}>
                  <td className="p-3">
                    <div className="font-medium">{u.prenom} {u.nom}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="p-3">{ROLE_LABELS[u.role as Role] ?? u.role}</td>
                  <td className="p-3 text-slate-600">
                    {u.compagnie?.nom ?? u.groupesDiriges.map((g) => g.nom).join(", ") ?? "—"}
                  </td>
                  {estDirigeant && (
                    <td className="p-3">
                      {u.role === "ADJOINT" ? (
                        <form
                          action={async () => {
                            "use server";
                            await basculerDroitModification(u.id);
                          }}
                        >
                          <button
                            className={`text-xs rounded-full px-3 py-1 ${
                              aDroit
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {aDroit ? "Accordé ✓" : "Non accordé"}
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {roleAuMoins(u.role, "COORDINATEUR") ? "Toujours" : "—"}
                        </span>
                      )}
                    </td>
                  )}
                  {estDirigeant && (
                    <td className="p-3">
                      <form
                        action={async () => {
                          "use server";
                          await basculerActif(u.id);
                        }}
                      >
                        <button
                          className={`text-xs rounded-full px-3 py-1 ${
                            u.actif
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {u.actif ? "Présent" : "Absent"}
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-3">🕐 Journal d'audit (100 derniers)</h2>
        <ul className="space-y-1 text-sm max-h-96 overflow-y-auto">
          {audit.map((log) => (
            <li key={log.id} className="flex justify-between gap-3 text-slate-600">
              <span>
                <span className="font-medium">{log.user.prenom} {log.user.nom}</span>{" "}
                — {log.action}
                {log.details && <span className="text-slate-400"> ({log.details})</span>}
              </span>
              <span className="text-slate-400 font-mono whitespace-nowrap">
                {fmt.format(log.createdAt)}
              </span>
            </li>
          ))}
          {audit.length === 0 && <li className="text-slate-400">Aucune action enregistrée.</li>}
        </ul>
      </section>
    </div>
  );
}
