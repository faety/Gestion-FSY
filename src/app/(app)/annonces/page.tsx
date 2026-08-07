import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { annonceVisible, CIBLE_LABELS, roleAuMoins } from "@/lib/roles";
import { creerAnnonce, supprimerAnnonce } from "@/lib/actions";
import { ANNONCE_LE, A_ANNONCER } from "@/lib/report";
import { MessageReport } from "@/components/BandeauReport";
import { signatureDuCouple } from "@/lib/couple";

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default async function AnnoncesPage() {
  const user = await exigerUtilisateur();
  const peutCreer = roleAuMoins(user.role, "COORDINATEUR");

  const maintenant = new Date();
  const [annonces, programmees] = await Promise.all([
    // Publiées : date de publication atteinte
    prisma.annonce.findMany({
      where: { datePublication: { lte: maintenant } },
      orderBy: { datePublication: "desc" },
      include: { creePar: true },
    }),
    // À venir : visibles des seuls coordinateurs, qui peuvent les ajuster
    peutCreer
      ? prisma.annonce.findMany({
          where: { datePublication: { gt: maintenant } },
          orderBy: { datePublication: "asc" },
          include: { creePar: true },
        })
      : [],
  ]);
  const visibles = annonces.filter((a) => annonceVisible(a.cible, user.role));
  const aVenir = programmees.filter((a) => annonceVisible(a.cible, user.role));

  const signature = A_ANNONCER ? await signatureDuCouple() : "";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📢 Annonces</h1>

      {/* Épinglée en tête, et non mêlée aux autres : c'est l'annonce qui
          conditionne toutes les autres, et elle ne doit pas glisser vers le bas
          à mesure qu'on en publie de nouvelles. */}
      {A_ANNONCER && (
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold mb-1">
            📌 Épinglé — {ANNONCE_LE}
          </p>
          <MessageReport signature={signature} />
        </div>
      )}

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

      {/* File des annonces programmées (coordinateurs) */}
      {aVenir.length > 0 && (
        <details className="bg-white rounded-xl shadow-sm p-4">
          <summary className="font-bold cursor-pointer">
            🕗 Annonces programmées ({aVenir.length})
          </summary>
          <p className="text-sm text-slate-500 mt-2">
            Publiées automatiquement à la date indiquée. Vous pouvez les supprimer si
            besoin.
          </p>
          <ul className="mt-3 space-y-3">
            {aVenir.map((a) => (
              <li key={a.id} className="border-l-4 border-slate-200 pl-3">
                <div className="text-xs text-fsy font-medium">
                  {fmt.format(a.datePublication)}
                  {a.automatique && " · automatique"}
                </div>
                <div className="font-medium">{a.titre}</div>
                <p className="text-sm text-slate-600 whitespace-pre-line">{a.contenu}</p>
                <div className="text-xs text-slate-400 mt-1">
                  {CIBLE_LABELS[a.cible] ?? a.cible}
                  {" · "}
                  <form
                    action={async () => {
                      "use server";
                      await supprimerAnnonce(a.id);
                    }}
                    className="inline"
                  >
                    <button className="text-red-500 hover:underline">Supprimer</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ul className="space-y-3">
        {visibles.map((a) => (
          <li key={a.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold">{a.titre}</div>
                <p className="text-slate-600 mt-1 whitespace-pre-line">{a.contenu}</p>
                <div className="text-xs text-slate-400 mt-2">
                  {a.creePar.prenom} {a.creePar.nom} — {fmt.format(a.datePublication)} —{" "}
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
