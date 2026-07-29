import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { annonceVisible, CIBLE_LABELS, roleAuMoins } from "@/lib/roles";
import { creerAnnonce, supprimerAnnonce } from "@/lib/actions";

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default async function AnnoncesPage() {
  const user = (await getUtilisateur())!;
  const peutCreer = roleAuMoins(user.role, "COORDINATEUR");

  const annonces = await prisma.annonce.findMany({
    orderBy: { createdAt: "desc" },
    include: { creePar: true },
  });
  const visibles = annonces.filter((a) => annonceVisible(a.cible, user.role));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📢 Annonces</h1>

      {peutCreer && (
        <form
          action={creerAnnonce}
          className="bg-white rounded-xl shadow-sm p-4 space-y-3 text-sm"
        >
          <h2 className="font-bold">Nouvelle annonce</h2>
          <input
            name="titre"
            required
            placeholder="Titre"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <textarea
            name="contenu"
            required
            rows={3}
            placeholder="Contenu de l'annonce…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <div className="flex gap-3 items-center flex-wrap">
            <label className="text-slate-600">Destinataires :</label>
            <select name="cible" className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
              {Object.entries(CIBLE_LABELS).map(([valeur, label]) => (
                <option key={valeur} value={valeur}>
                  {label}
                </option>
              ))}
            </select>
            <button className="bg-fsy text-white rounded-lg px-4 py-2 font-medium hover:bg-fsy-dark">
              Publier
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {visibles.map((a) => (
          <li key={a.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold">{a.titre}</div>
                <p className="text-slate-600 mt-1 whitespace-pre-line">{a.contenu}</p>
                <div className="text-xs text-slate-400 mt-2">
                  {a.creePar.prenom} {a.creePar.nom} — {fmt.format(a.createdAt)} —{" "}
                  <span className="bg-slate-100 rounded-full px-2 py-0.5">
                    {CIBLE_LABELS[a.cible] ?? a.cible}
                  </span>
                </div>
              </div>
              {peutCreer && (
                <form
                  action={async () => {
                    "use server";
                    await supprimerAnnonce(a.id);
                  }}
                >
                  <button className="text-xs text-red-500 hover:underline">Supprimer</button>
                </form>
              )}
            </div>
          </li>
        ))}
        {visibles.length === 0 && <p className="text-slate-500">Aucune annonce.</p>}
      </ul>
    </div>
  );
}
