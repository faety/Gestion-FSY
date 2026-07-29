import Link from "next/link";
import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { activitePourSexe, annonceVisible, roleAuMoins } from "@/lib/roles";
import { Horaire, BadgesActivite } from "@/components/StatutActivite";

const fmtDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export default async function Accueil() {
  const user = (await getUtilisateur())!;

  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const finJour = new Date(debutJour);
  finJour.setDate(finJour.getDate() + 1);

  // Groupes du conseiller pour filtrer son programme du jour
  const mesGroupeIds = user.groupesDiriges.map((g) => g.id);

  const inclureActivite = {
    groupes: { include: { groupe: true } },
    compagnie: true,
  } as const;

  const [annonces, activitesAujourdhui, stats, propositionsEnAttente] = await Promise.all([
    prisma.annonce.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { creePar: true },
    }),
    prisma.activite.findMany({
      where: { debut: { gte: debutJour, lt: finJour } },
      orderBy: { debut: "asc" },
      include: inclureActivite,
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

  // Avant (ou après) la conférence, il n'y a rien « aujourd'hui » : on affiche
  // alors la prochaine journée du programme.
  let activitesJour = activitesAujourdhui;
  let titreJour: string | null = null;
  if (activitesAujourdhui.length === 0) {
    const prochaine = await prisma.activite.findFirst({
      where: { debut: { gte: finJour } },
      orderBy: { debut: "asc" },
    });
    if (prochaine) {
      const debutProchain = new Date(prochaine.debut);
      debutProchain.setHours(0, 0, 0, 0);
      const finProchain = new Date(debutProchain);
      finProchain.setDate(finProchain.getDate() + 1);
      activitesJour = await prisma.activite.findMany({
        where: { debut: { gte: debutProchain, lt: finProchain } },
        orderBy: { debut: "asc" },
        include: inclureActivite,
      });
      titreJour = fmtDate.format(debutProchain);
    }
  }

  const estConseiller = user.role === "CONSEILLER";
  const sexesDeMesGroupes = [...new Set(user.groupesDiriges.map((g) => g.sexe))];
  const activitesPourMoi = estConseiller
    ? activitesJour.filter(
        (a) =>
          // Activités du bon public (Jeunes Gens / Jeunes Filles / tous)…
          sexesDeMesGroupes.some((s) => activitePourSexe(a.publicCible, s)) &&
          // …et qui concernent ses groupes ou toute la conférence
          (a.type === "GENERAL" ||
            a.groupes.some((g) => mesGroupeIds.includes(g.groupeId)) ||
            (a.compagnieId
              ? user.groupesDiriges.some((g) => g.compagnieId === a.compagnieId)
              : a.type === "COMPAGNIE"))
      )
    : activitesJour;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bonjour {user.prenom} 👋</h1>
        <p className="text-slate-500 capitalize">{fmtDate.format(new Date())}</p>
      </div>

      {/* Thème de la conférence */}
      <div className="bg-fsy-dark text-white rounded-xl p-4">
        <div className="text-xs uppercase tracking-wide text-blue-200">
          FSY 2026 · Thème de l'année
        </div>
        <div className="font-bold text-lg">« Marche avec moi »</div>
        <p className="text-sm text-blue-100 mt-1">
          « Les montagnes fuiront devant toi et les fleuves se détourneront de leur cours.
          Tu demeureras en moi et moi en toi ; c'est pourquoi, marche avec moi. »
          <span className="block text-blue-200 mt-0.5">Moïse 6:34</span>
        </p>
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
            {titreJour ? (
              <>
                Prochaine journée
                <span className="block text-sm font-normal text-slate-500 capitalize">
                  {titreJour}
                </span>
              </>
            ) : estConseiller ? (
              "Mon programme du jour"
            ) : (
              "Programme du jour"
            )}
          </h2>
          <Link href="/programme" className="text-sm text-fsy hover:underline shrink-0">
            Programme complet →
          </Link>
        </div>
        {activitesPourMoi.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune activité au programme.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activitesPourMoi.map((a) => (
              <li key={a.id} className="py-2.5 flex items-start gap-3">
                <Horaire debut={a.debut.toISOString()} fin={a.fin?.toISOString()} />
                <div className="min-w-0">
                  <div className={`font-medium ${a.statut === "ANNULE" ? "line-through text-slate-400" : ""}`}>
                    {a.titre}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <BadgesActivite statut={a.statut} publicCible={a.publicCible} />
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
