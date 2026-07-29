import Link from "next/link";
import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { annonceVisible, roleAuMoins } from "@/lib/roles";

const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export default async function Accueil() {
  const user = (await getUtilisateur())!;

  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const finJour = new Date(debutJour);
  finJour.setDate(finJour.getDate() + 1);

  // Groupes du conseiller pour filtrer son programme du jour
  const mesGroupeIds = user.groupesDiriges.map((g) => g.id);

  const [annonces, activitesJour, stats, propositionsEnAttente] = await Promise.all([
    prisma.annonce.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { creePar: true },
    }),
    prisma.activite.findMany({
      where: { debut: { gte: debutJour, lt: finJour } },
      orderBy: { debut: "asc" },
      include: { groupes: { include: { groupe: true } }, compagnie: true },
    }),
    Promise.all([
      prisma.jeune.count(),
      prisma.groupe.count(),
      prisma.mouvement.count({ where: { type: "ARRIVEE" } }),
      prisma.user.count({ where: { role: "CONSEILLER", actif: true } }),
    ]),
    roleAuMoins(user.role, "COORDINATEUR")
      ? prisma.modificationProgramme.count({ where: { statut: "PROPOSE" } })
      : 0,
  ]);

  const [nbJeunes, nbGroupes, nbArrives, nbConseillers] = stats;
  const annoncesVisibles = annonces.filter((a) => annonceVisible(a.cible, user.role));

  const estConseiller = user.role === "CONSEILLER";
  const activitesPourMoi = estConseiller
    ? activitesJour.filter(
        (a) =>
          a.type === "GENERAL" ||
          a.groupes.some((g) => mesGroupeIds.includes(g.groupeId)) ||
          (a.compagnie && user.groupesDiriges.some((g) => g.compagnieId === a.compagnieId))
      )
    : activitesJour;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bonjour {user.prenom} 👋</h1>
        <p className="text-slate-500 capitalize">{fmtDate.format(new Date())}</p>
      </div>

      {propositionsEnAttente > 0 && (
        <Link
          href="/programme"
          className="block bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-800 font-medium hover:bg-amber-100 transition"
        >
          ⚠️ {propositionsEnAttente} modification(s) de programme en attente de validation
        </Link>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Jeunes inscrits", valeur: nbJeunes, href: "/jeunes" },
          { label: "Arrivés au site", valeur: nbArrives, href: "/cars" },
          { label: "Groupes", valeur: nbGroupes, href: "/groupes" },
          { label: "Conseillers actifs", valeur: nbConseillers, href: "/organigramme" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-xl shadow-sm p-4 hover:shadow transition">
            <div className="text-3xl font-bold text-fsy">{s.valeur}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
          </Link>
        ))}
      </div>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">
            {estConseiller ? "Mon programme du jour" : "Programme du jour"}
          </h2>
          <Link href="/programme" className="text-sm text-fsy hover:underline">
            Programme complet →
          </Link>
        </div>
        {activitesPourMoi.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune activité prévue aujourd'hui.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activitesPourMoi.map((a) => (
              <li key={a.id} className="py-2 flex items-start gap-3">
                <span className="font-mono text-sm bg-fsy-light text-fsy-dark rounded px-2 py-0.5 mt-0.5">
                  {fmtHeure.format(a.debut)}
                </span>
                <div>
                  <div className={`font-medium ${a.statut === "ANNULE" ? "line-through text-slate-400" : ""}`}>
                    {a.titre}
                    {a.statut === "ANNULE" && <span className="ml-2 text-xs text-red-600">Annulée</span>}
                    {a.statut === "MODIFIE" && <span className="ml-2 text-xs text-amber-600">Modifiée</span>}
                  </div>
                  <div className="text-sm text-slate-500">
                    {a.lieu}
                    {a.compagnie && ` — ${a.compagnie.nom}`}
                    {a.groupes.length > 0 && ` — ${a.groupes.map((g) => g.groupe.nom).join(", ")}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">📢 Annonces</h2>
          <Link href="/annonces" className="text-sm text-fsy hover:underline">
            Toutes les annonces →
          </Link>
        </div>
        {annoncesVisibles.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune annonce pour le moment.</p>
        ) : (
          <ul className="space-y-3">
            {annoncesVisibles.slice(0, 3).map((a) => (
              <li key={a.id} className="border-l-4 border-fsy pl-3">
                <div className="font-medium">{a.titre}</div>
                <p className="text-sm text-slate-600">{a.contenu}</p>
                <div className="text-xs text-slate-400 mt-1">
                  {a.creePar.prenom} {a.creePar.nom} —{" "}
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(a.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
