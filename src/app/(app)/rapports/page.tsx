import Link from "next/link";
import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { ROLE_LABELS, roleAuMoins, type Role } from "@/lib/roles";
import {
  ambiance,
  libelleJour,
  libelleJourCourt,
  lireReponses,
  niveau,
  sectionsPour,
} from "@/lib/rapports";
import { CLOUDINARY_ACTIF, urlPhoto } from "@/lib/cloudinary";
import { FormulaireRapport } from "@/components/FormulaireRapport";

const fmtJour = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const libelleJournee = (numero: number, date: Date) =>
  `${libelleJour(numero)}, ${fmtJour.format(date)}`;

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ jour?: string }>;
}) {
  const { jour: jourDemande } = await searchParams;
  const user = (await getUtilisateur())!;

  const journees = await prisma.journeeConference.findMany({ orderBy: { numero: "asc" } });
  if (journees.length === 0) {
    return <p className="text-slate-500">Le programme n'est pas encore chargé.</p>;
  }

  // Journée par défaut : celle d'aujourd'hui, sinon la dernière déjà passée,
  // sinon la première — pour que le rapport du jour s'ouvre sans rien chercher.
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const memeJour = journees.find((j) => {
    const d = new Date(j.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === aujourdhui.getTime();
  });
  const passees = journees.filter((j) => new Date(j.date) <= aujourdhui);
  const defaut = memeJour ?? passees[passees.length - 1] ?? journees[0];

  const numeroChoisi = Number(jourDemande);
  const journee =
    journees.find((j) => j.numero === numeroChoisi) ?? defaut;

  const [monRapport, mesRapports, classement, rapportsDuJour, nbEncadrants] = await Promise.all([
    prisma.rapportQuotidien.findUnique({
      where: { auteurId_jour: { auteurId: user.id, jour: journee.numero } },
      include: { photos: true },
    }),
    prisma.rapportQuotidien.findMany({
      where: { auteurId: user.id },
      orderBy: { jour: "asc" },
      select: { jour: true, points: true, ambiance: true },
    }),
    prisma.rapportQuotidien.groupBy({
      by: ["auteurId"],
      _sum: { points: true },
      _count: true,
      orderBy: { _sum: { points: "desc" } },
      take: 10,
    }),
    roleAuMoins(user.role, "ADJOINT")
      ? prisma.rapportQuotidien.count({ where: { jour: journee.numero } })
      : 0,
    roleAuMoins(user.role, "ADJOINT")
      ? prisma.user.count({ where: { actif: true } })
      : 0,
  ]);

  const mesPoints = mesRapports.reduce((n, r) => n + r.points, 0);
  const monNiveau = niveau(mesPoints);

  // Série en cours : nombre de journées consécutives remises jusqu'à la dernière
  const remis = new Set(mesRapports.map((r) => r.jour));
  let serie = 0;
  for (let n = journee.numero; n >= 0 && remis.has(n); n--) serie++;

  const auteurs =
    classement.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: classement.map((c) => c.auteurId) } },
          select: { id: true, prenom: true, nom: true, role: true },
        })
      : [];
  const nomAuteur = (id: string) => {
    const u = auteurs.find((a) => a.id === id);
    return u ? `${u.prenom} ${u.nom}` : "—";
  };

  return (
    <div className="space-y-4">
      {/* Sélecteur de journée */}
      <div className="bg-white rounded-xl shadow-sm p-3 -mx-1">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {journees.map((j) => {
            const fait = remis.has(j.numero);
            const actif = j.numero === journee.numero;
            return (
              <Link
                key={j.numero}
                href={`/rapports?jour=${j.numero}`}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm text-center transition ${
                  actif
                    ? "bg-fsy text-white font-semibold"
                    : fait
                      ? "bg-green-50 text-green-800"
                      : "bg-slate-50 text-slate-600"
                }`}
              >
                <span className="block">{libelleJourCourt(j.numero)}</span>
                <span className="block text-[11px] opacity-80">{fait ? "✓ remis" : "—"}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mes points */}
      <div className="bg-fsy-dark text-white rounded-xl p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-blue-200">Mes points</div>
          <div className="text-3xl font-bold">{mesPoints}</div>
          <div className="text-sm text-blue-100">
            {monNiveau.emoji} {monNiveau.nom} · {mesRapports.length} rapport
            {mesRapports.length > 1 ? "s" : ""} remis
          </div>
        </div>
        {serie > 1 && (
          <div className="text-center bg-white/10 rounded-xl px-3 py-2">
            <div className="text-2xl">🔥</div>
            <div className="text-xs text-blue-100">
              série de {serie} jours
            </div>
          </div>
        )}
      </div>

      {roleAuMoins(user.role, "ADJOINT") && (
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <strong>
              {rapportsDuJour} / {nbEncadrants}
            </strong>{" "}
            rapports remis pour {journee.numero === 0 ? "la veille" : `le jour ${journee.numero}`}
          </div>
          {roleAuMoins(user.role, "COORDINATEUR") && (
            <Link href="/rapports/final" className="text-sm text-fsy hover:underline shrink-0">
              Synthèse →
            </Link>
          )}
        </div>
      )}

      <FormulaireRapport
        jour={journee.numero}
        libelleJour={libelleJournee(journee.numero, journee.date)}
        sections={sectionsPour(user.role)}
        cloudinaryActif={CLOUDINARY_ACTIF}
        existant={
          monRapport
            ? {
                ambiance: monRapport.ambiance,
                reponses: lireReponses(monRapport.reponses) as never,
                aMarche: monRapport.aMarche,
                aAmeliorer: monRapport.aAmeliorer,
                besoinAide: monRapport.besoinAide,
                detailAide: monRapport.detailAide ?? "",
                photos: monRapport.photos.map((p) => ({
                  publicId: p.publicId ?? undefined,
                  largeur: p.largeur ?? undefined,
                  hauteur: p.hauteur ?? undefined,
                  // Vignette signée pour une photo chez Cloudinary, data URL
                  // pour celles envoyées avant sa mise en place.
                  apercu: p.publicId ? (urlPhoto(p.publicId, 600) ?? "") : (p.image ?? ""),
                })),
                points: monRapport.points,
              }
            : null
        }
      />

      {/* Mon historique */}
      {mesRapports.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold mb-2">Mes rapports</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {mesRapports.map((r) => {
              const a = ambiance(r.ambiance);
              const j = journees.find((x) => x.numero === r.jour);
              return (
                <li key={r.jour} className="py-2 flex items-center justify-between gap-2">
                  <Link href={`/rapports?jour=${r.jour}`} className="hover:underline">
                    {a?.emoji} {libelleJour(r.jour)}
                    {j && (
                      <span className="text-slate-400">
                        {" "}
                        · {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(j.date)}
                      </span>
                    )}
                  </Link>
                  <span className="text-fsy font-medium">+{r.points}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Classement */}
      {classement.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold mb-2">🏆 Les plus assidus</h2>
          <ol className="divide-y divide-slate-100 text-sm">
            {classement.map((c, i) => (
              <li
                key={c.auteurId}
                className={`py-2 flex items-center gap-3 ${
                  c.auteurId === user.id ? "font-semibold text-fsy-dark" : ""
                }`}
              >
                <span className="w-6 text-center text-slate-400">
                  {["🥇", "🥈", "🥉"][i] ?? i + 1}
                </span>
                <span className="flex-1 min-w-0 truncate">
                  {nomAuteur(c.auteurId)}
                  {c.auteurId === user.id && " (vous)"}
                  <span className="block text-xs text-slate-400 font-normal">
                    {ROLE_LABELS[
                      (auteurs.find((a) => a.id === c.auteurId)?.role ?? "CONSEILLER") as Role
                    ]}{" "}
                    · {c._count} rapport{c._count > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="text-fsy">{c._sum.points ?? 0} pts</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
