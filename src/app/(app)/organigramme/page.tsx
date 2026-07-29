import { prisma } from "@/lib/db";

export default async function OrganigrammePage() {
  const [dirigeants, coordinateurs, compagnies, groupesSansCompagnie] = await Promise.all([
    prisma.user.findMany({ where: { role: "DIRIGEANT", actif: true }, orderBy: { nom: "asc" } }),
    prisma.user.findMany({ where: { role: "COORDINATEUR", actif: true }, orderBy: { nom: "asc" } }),
    prisma.compagnie.findMany({
      orderBy: { nom: "asc" },
      include: {
        dirigeants: { where: { actif: true } },
        groupes: {
          orderBy: { nom: "asc" },
          include: { conseiller: true, _count: { select: { jeunes: true } } },
        },
      },
    }),
    prisma.groupe.findMany({
      where: { compagnieId: null },
      include: { conseiller: true, _count: { select: { jeunes: true } } },
    }),
  ]);

  const Carte = ({
    titre,
    personnes,
    couleur,
  }: {
    titre: string;
    personnes: string[];
    couleur: string;
  }) => (
    <div className={`rounded-xl p-4 ${couleur}`}>
      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{titre}</div>
      {personnes.length === 0 ? (
        <div className="text-sm opacity-60">Non assigné</div>
      ) : (
        personnes.map((p) => (
          <div key={p} className="font-medium">
            {p}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organigramme</h1>

      <div className="max-w-md mx-auto space-y-3">
        <Carte
          titre="Couple dirigeant"
          personnes={dirigeants.map((d) => `${d.prenom} ${d.nom}`)}
          couleur="bg-fsy-dark text-white text-center"
        />
        <div className="text-center text-slate-300">│</div>
        <Carte
          titre="Coordinateurs principaux"
          personnes={coordinateurs.map((c) => `${c.prenom} ${c.nom}`)}
          couleur="bg-fsy text-white text-center"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {compagnies.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div>
              <div className="font-bold text-lg">{c.nom}</div>
              <div className="text-sm text-slate-500">
                Adjoints :{" "}
                {c.dirigeants.length > 0
                  ? c.dirigeants.map((d) => `${d.prenom} ${d.nom}`).join(" & ")
                  : "non assignés"}
              </div>
            </div>
            <ul className="space-y-2">
              {c.groupes.map((g) => (
                <li key={g.id} className="bg-slate-50 rounded-lg p-2 text-sm flex justify-between">
                  <div>
                    <span className="font-medium">{g.nom}</span>
                    <span className="text-slate-400 ml-1">
                      ({g.sexe === "M" ? "G" : "F"})
                    </span>
                    <div className="text-slate-500">
                      {g.conseiller
                        ? `${g.conseiller.prenom} ${g.conseiller.nom}${!g.conseiller.actif ? " (absent)" : ""}`
                        : "Sans conseiller"}
                    </div>
                  </div>
                  <span className="text-slate-400">{g._count.jeunes} jeunes</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {groupesSansCompagnie.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-medium text-amber-800 mb-2">Groupes sans compagnie</div>
          <ul className="text-sm text-amber-700">
            {groupesSansCompagnie.map((g) => (
              <li key={g.id}>
                {g.nom} — {g._count.jeunes} jeunes
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
