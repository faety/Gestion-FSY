import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";

export default async function OrganigrammePage() {
  // Le gabarit redirige déjà les visiteurs sans session, mais chaque page
  // l'affirme elle-même : les deux rendus étant simultanés, une page qui
  // suppose la session peut partir avant que la redirection n'aboutisse.
  await exigerUtilisateur();
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

  // Le téléphone est cliquable : sur mobile, un appui suffit pour appeler.
  const Carte = ({
    titre,
    personnes,
    couleur,
  }: {
    titre: string;
    personnes: {
      id: string;
      prenom: string;
      nom: string;
      telephone: string | null;
      photoPublicId: string | null;
    }[];
    couleur: string;
  }) => (
    <div className={`rounded-xl p-4 ${couleur}`}>
      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{titre}</div>
      {personnes.length === 0 ? (
        <div className="text-sm opacity-60">Non assigné</div>
      ) : (
        personnes.map((p) => (
          // Deux comptes homonymes existaient : la clé doit rester distincte,
          // sinon React n'en affiche qu'un et le doublon devient invisible.
          <div key={p.id} className="mt-2 first:mt-0 flex items-center justify-center gap-2.5">
            <Link href={`/organigramme/${p.id}`} className="shrink-0">
              <Avatar
                prenom={p.prenom}
                nom={p.nom}
                photoPublicId={p.photoPublicId}
                taille={38}
                className="ring-2 ring-white/40"
              />
            </Link>
            <div className="text-left min-w-0">
              <Link
                href={`/organigramme/${p.id}`}
                className="font-medium leading-tight block hover:underline"
              >
                {p.prenom} {p.nom}
              </Link>
              {p.telephone && (
                <a
                  href={`tel:${p.telephone.replace(/\s/g, "")}`}
                  className="text-sm underline opacity-80"
                >
                  {p.telephone}
                </a>
              )}
            </div>
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
          personnes={dirigeants.map((d) => ({
            id: d.id,
            prenom: d.prenom,
            nom: d.nom,
            telephone: d.telephone,
            photoPublicId: d.photoPublicId,
          }))}
          couleur="bg-fsy-dark text-white text-center"
        />
        <div className="text-center text-slate-300">│</div>
        <Carte
          titre="Coordinateurs principaux"
          personnes={coordinateurs.map((c) => ({
            id: c.id,
            prenom: c.prenom,
            nom: c.nom,
            telephone: c.telephone,
            photoPublicId: c.photoPublicId,
          }))}
          couleur="bg-fsy text-white text-center"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {compagnies.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div>
              <div className="font-bold text-lg">{c.nom}</div>
              {/* L'adjoint est le nœud suivant de l'arbre : sa photo et un
                  appui ouvrent son arbre détaillé, groupes et jeunes compris. */}
              {c.dirigeants.length > 0 ? (
                <div className="mt-1.5 space-y-1">
                  {c.dirigeants.map((d) => (
                    <Link
                      key={d.id}
                      href={`/organigramme/${d.id}`}
                      className="flex items-center gap-2 rounded-lg -mx-1 px-1 py-0.5 hover:bg-slate-50"
                    >
                      <Avatar
                        prenom={d.prenom}
                        nom={d.nom}
                        photoPublicId={d.photoPublicId}
                        taille={32}
                      />
                      <span className="text-sm min-w-0">
                        <span className="font-medium">
                          {d.prenom} {d.nom}
                        </span>
                        <span className="text-slate-400"> — adjoint</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">Adjoints : non assignés</div>
              )}
            </div>
            <ul className="space-y-2">
              {c.groupes.map((g) => (
                <li key={g.id} className="bg-slate-50 rounded-lg p-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      <span className="font-medium">{g.nom}</span>
                      <span className="text-slate-400 ml-1">({g.sexe === "M" ? "G" : "F"})</span>
                    </span>
                    <span className="text-slate-400">{g._count.jeunes} jeunes</span>
                  </div>
                  {g.conseiller ? (
                    <Link
                      href={`/organigramme/${g.conseiller.id}`}
                      className="mt-1 flex items-center gap-2 rounded -mx-0.5 px-0.5 hover:bg-white"
                    >
                      <Avatar
                        prenom={g.conseiller.prenom}
                        nom={g.conseiller.nom}
                        photoPublicId={g.conseiller.photoPublicId}
                        taille={26}
                      />
                      <span className="text-slate-600 min-w-0 truncate">
                        {g.conseiller.prenom} {g.conseiller.nom}
                        {!g.conseiller.actif && <span className="text-red-600"> (absent)</span>}
                      </span>
                    </Link>
                  ) : (
                    <div className="text-slate-500 mt-1">Sans conseiller</div>
                  )}
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
