import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { ROLE_LABELS, roleAuMoins, type Role } from "@/lib/roles";
import { Avatar } from "@/components/Avatar";

// L'arbre d'une personne : tout ce qui est sous sa responsabilité, en détail.
//
// Rendu entièrement côté serveur — pas un gramme de JavaScript de plus sur le
// téléphone — et chargé à la personne : l'organigramme général reste léger,
// le détail n'arrive que quand on le demande.
//
// Les noms des jeunes ne s'affichent qu'à l'encadrement à partir des adjoints,
// ou au conseiller du groupe lui-même — la même retenue que le reste de
// l'application : les effectifs pour tous, les listes nominatives à ceux qui
// en ont la charge.

const Tel = ({ telephone }: { telephone: string | null }) =>
  telephone ? (
    <a href={`tel:${telephone.replace(/\s/g, "")}`} className="text-sm text-fsy underline">
      {telephone}
    </a>
  ) : null;

type PersonneLien = {
  id: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  photoPublicId: string | null;
  actif: boolean;
};

const LignePersonne = ({ p, sousTitre }: { p: PersonneLien; sousTitre?: string }) => (
  <Link
    href={`/organigramme/${p.id}`}
    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-slate-50"
  >
    <Avatar prenom={p.prenom} nom={p.nom} photoPublicId={p.photoPublicId} taille={36} />
    <span className="min-w-0">
      <span className="font-medium block leading-tight">
        {p.prenom} {p.nom}
        {!p.actif && <span className="text-red-600 text-xs font-normal"> (absent)</span>}
      </span>
      {sousTitre && <span className="text-xs text-slate-500">{sousTitre}</span>}
    </span>
  </Link>
);

export default async function ArbrePersonnePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const moi = await exigerUtilisateur();
  const { id } = await params;

  const personne = await prisma.user.findUnique({
    where: { id },
    include: {
      compagnie: true,
      compagniesCoordonnees: { select: { id: true } },
      groupesDiriges: { orderBy: { nom: "asc" } },
    },
  });
  if (!personne || !personne.valide) notFound();

  const peutVoirJeunesDe = (conseillerId: string | null) =>
    roleAuMoins(moi.role, "ADJOINT") || (conseillerId !== null && conseillerId === moi.id);

  // Ce que la personne a sous sa responsabilité, selon son appel.
  // Un adjoint répond de son secteur entier. Le secteur des fiches papier
  // fait foi dès qu'il existe ; le rattachement historique à une compagnie
  // n'est qu'un repli d'avant la réorganisation.
  const compagniesAdjointIds =
    personne.compagniesCoordonnees.length > 0
      ? personne.compagniesCoordonnees.map((c) => c.id)
      : personne.compagnieId
        ? [personne.compagnieId]
        : [];
  const [compagniesAdjoint, groupesDuConseiller, compagniesVueDirection] = await Promise.all([
    personne.role === "ADJOINT" && compagniesAdjointIds.length > 0
      ? prisma.compagnie.findMany({
          where: { id: { in: compagniesAdjointIds }, groupes: { some: {} } },
          orderBy: [{ numero: "asc" }, { nom: "asc" }],
          include: {
            dirigeants: { where: { actif: true } },
            coordonnateurs: { where: { actif: true } },
            groupes: {
              orderBy: { numeroDansCompagnie: "asc" },
              include: {
                conseiller: true,
                jeunes: { orderBy: [{ prenom: "asc" }], select: { id: true, prenom: true, nom: true } },
              },
            },
          },
        })
      : [],
    personne.role === "CONSEILLER"
      ? prisma.groupe.findMany({
          where: { conseillerId: personne.id },
          orderBy: { nom: "asc" },
          include: {
            compagnie: { include: { dirigeants: { where: { actif: true } } } },
            jeunes: { orderBy: [{ prenom: "asc" }], select: { id: true, prenom: true, nom: true } },
          },
        })
      : [],
    roleAuMoins(personne.role, "COORDINATEUR")
      ? prisma.compagnie.findMany({
          where: { groupes: { some: {} } },
          orderBy: [{ numero: "asc" }, { nom: "asc" }],
          include: {
            dirigeants: { where: { actif: true } },
            groupes: { select: { id: true, _count: { select: { jeunes: true } } } },
          },
        })
      : [],
  ]);

  const groupesAdjoint = compagniesAdjoint.flatMap((c) => c.groupes);
  const jeunesSousAdjoint = groupesAdjoint.reduce((n, g) => n + g.jeunes.length, 0);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Link href="/organigramme" className="text-sm text-fsy hover:underline">
        ← Organigramme
      </Link>

      {/* La personne */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
        <Avatar
          prenom={personne.prenom}
          nom={personne.nom}
          photoPublicId={personne.photoPublicId}
          taille={72}
          className="ring-2 ring-fsy-light"
        />
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight">
            {personne.prenom} {personne.nom}
            {!personne.actif && <span className="text-red-600 text-sm font-normal"> (absent)</span>}
          </h1>
          <div className="text-sm text-slate-600">
            {ROLE_LABELS[personne.role as Role] ?? personne.role}
            {personne.compagnie && ` — ${personne.compagnie.nom}`}
          </div>
          <Tel telephone={personne.telephone} />
        </div>
      </div>

      {/* ---------- Adjoint : son secteur, compagnie par compagnie ---------- */}
      {personne.role === "ADJOINT" && (
        <>
          {compagniesAdjoint.length > 0 ? (
            <>
              <div className="text-sm text-slate-500">
                {compagniesAdjoint.length > 1
                  ? `Secteur de ${compagniesAdjoint.length} compagnies`
                  : compagniesAdjoint[0].nom}{" "}
                · {groupesAdjoint.length} groupes · {jeunesSousAdjoint} jeunes
                {(() => {
                  const binome = [
                    ...new Set(
                      compagniesAdjoint
                        .flatMap((c) => [...c.coordonnateurs, ...c.dirigeants])
                        .filter((d) => d.id !== personne.id)
                        .map((d) => `${d.prenom} ${d.nom}`)
                    ),
                  ];
                  return binome.length > 0 ? ` · avec ${binome.join(" & ")}` : "";
                })()}
              </div>
              {compagniesAdjoint.map((c) => (
                <div key={c.id} className="space-y-2">
                  {compagniesAdjoint.length > 1 && (
                    <div className="font-semibold text-slate-700 mt-2">{c.nom}</div>
                  )}
                  {c.groupes.map((g) => (
                    <div key={g.id} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div className="font-bold">
                          {g.nom}{" "}
                          <span className="text-slate-400 font-normal text-sm">
                            ({g.sexe === "M" ? "Garçons" : "Filles"} · {g.jeunes.length} jeunes)
                          </span>
                        </div>
                      </div>
                      {g.conseiller ? (
                        <LignePersonne p={g.conseiller} sousTitre="Conseiller(ère)" />
                      ) : (
                        <div className="text-sm text-amber-700">Sans conseiller</div>
                      )}
                      {peutVoirJeunesDe(g.conseillerId) ? (
                        <ul className="text-sm text-slate-600 columns-2 gap-4">
                          {g.jeunes.map((j) => (
                            <li key={j.id} className="break-inside-avoid">
                              {j.prenom} {j.nom}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Liste nominative visible du conseiller du groupe et de l&apos;encadrement.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-slate-500 bg-white rounded-xl shadow-sm p-4">
              Aucune compagnie ne lui est encore affectée — cela se fait depuis la page
              Administration.
            </p>
          )}
        </>
      )}

      {/* ---------- Conseiller : son ou ses groupes ---------- */}
      {personne.role === "CONSEILLER" &&
        (groupesDuConseiller.length > 0 ? (
          groupesDuConseiller.map((g) => (
            <div key={g.id} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <div className="font-bold">
                {g.nom}{" "}
                <span className="text-slate-400 font-normal text-sm">
                  ({g.sexe === "M" ? "Garçons" : "Filles"} · {g.jeunes.length} jeunes
                  {g.compagnie && ` · ${g.compagnie.nom}`})
                </span>
              </div>
              {g.compagnie && g.compagnie.dirigeants.length > 0 && (
                <div className="text-xs text-slate-500">
                  Sous la responsabilité de{" "}
                  {g.compagnie.dirigeants.map((d, i) => (
                    <span key={d.id}>
                      {i > 0 && " & "}
                      <Link href={`/organigramme/${d.id}`} className="text-fsy hover:underline">
                        {d.prenom} {d.nom}
                      </Link>
                    </span>
                  ))}
                </div>
              )}
              {peutVoirJeunesDe(g.conseillerId) ? (
                <ul className="text-sm text-slate-600 columns-2 gap-4">
                  {g.jeunes.map((j) => (
                    <li key={j.id} className="break-inside-avoid">
                      {j.prenom} {j.nom}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  Liste nominative visible du conseiller du groupe et de l&apos;encadrement.
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 bg-white rounded-xl shadow-sm p-4">
            Aucun groupe ne lui est encore attribué — cela se fait depuis la page Groupes.
          </p>
        ))}

      {/* ---------- Coordinateur ou couple : les compagnies d'un coup d'œil ---------- */}
      {roleAuMoins(personne.role, "COORDINATEUR") && (
        <div className="space-y-2">
          <div className="text-sm text-slate-500">
            Sous sa responsabilité : {compagniesVueDirection.length} compagnies —{" "}
            {compagniesVueDirection.reduce(
              (n, c) => n + c.groupes.reduce((m, g) => m + g._count.jeunes, 0),
              0
            )}{" "}
            jeunes. Appuyez sur un adjoint pour descendre dans son arbre.
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {compagniesVueDirection.map((c) => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm p-3">
                <div className="font-semibold text-sm mb-1.5">
                  {c.nom}
                  <span className="text-slate-400 font-normal">
                    {" "}
                    · {c.groupes.reduce((m, g) => m + g._count.jeunes, 0)} jeunes
                  </span>
                </div>
                {c.dirigeants.length > 0 ? (
                  <div className="space-y-1">
                    {c.dirigeants.map((d) => (
                      <LignePersonne key={d.id} p={d} />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-amber-700">Adjoints non assignés</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
