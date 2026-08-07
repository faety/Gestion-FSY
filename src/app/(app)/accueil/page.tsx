import { A_ANNONCER } from "@/lib/report";
import { MessageReport } from "@/components/BandeauReport";
import { signatureDuCouple } from "@/lib/couple";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/Avatar";
import { CLOUDINARY_ACTIF } from "@/lib/cloudinary";
import { exigerUtilisateur } from "@/lib/auth";
import { activitePourMoi, annonceVisible, monRoleActivite, roleAuMoins } from "@/lib/roles";
import { Horaire, BadgesActivite, BadgeRole } from "@/components/StatutActivite";

const fmtDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export default async function Accueil() {
  const user = await exigerUtilisateur();

  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const finJour = new Date(debutJour);
  finJour.setDate(finJour.getDate() + 1);

  // Groupes du conseiller, pour filtrer son programme du jour
  const mesGroupes = user.groupesDiriges.map((g) => ({
    id: g.id,
    sexe: g.sexe,
    compagnieId: g.compagnieId,
  }));

  const inclureActivite = {
    groupes: { include: { groupe: true } },
    compagnie: true,
  } as const;

  const [annonces, activitesAujourdhui, stats, propositionsEnAttente, journeeDuJour] =
    await Promise.all([
    prisma.annonce.findMany({
      where: { datePublication: { lte: new Date() } },
      orderBy: { datePublication: "desc" },
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
    prisma.journeeConference.findFirst({
      where: { date: { gte: debutJour, lt: finJour } },
    }),
  ]);

  // Rappel du rapport quotidien : seulement pendant la conférence.
  const monRapportDuJour = journeeDuJour
    ? await prisma.rapportQuotidien.findUnique({
        where: { auteurId_jour: { auteurId: user.id, jour: journeeDuJour.numero } },
        select: { points: true },
      })
    : null;

  const [nbJeunes, nbGroupes, nbArrives, nbConseillers] = stats;
  const annoncesVisibles = annonces.filter((a) => annonceVisible(a.cible, user.role));

  // Avant (ou après) la conférence, il n'y a rien « aujourd'hui » : on affiche
  // alors la prochaine journée du programme.
  let activitesJour = activitesAujourdhui;
  let dateJour = debutJour;
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
      dateJour = debutProchain;
      titreJour = fmtDate.format(debutProchain);
    }
  }

  // Anniversaires de la journée affichée (comparaison jour + mois)
  // Le jour et le mois ne sont pas indexables tels quels : on restreint d'abord
  // en base sur l'intervalle des dates possibles, puis on compare précisément.
  // Sans cela, l'accueil chargeait les 650 jeunes et leurs relations à chaque
  // affichage, pour n'en retenir qu'un ou deux.
  const anniversairesDuJour = (
    await prisma.$queryRaw<
      { id: string; prenom: string; nom: string; dateNaissance: Date; groupe: string | null; pieu: string }[]
    >`
      SELECT j.id, j.prenom, j.nom, j."dateNaissance", g.nom AS groupe, p.nom AS pieu
      FROM "Jeune" j
      LEFT JOIN "Groupe" g ON g.id = j."groupeId"
      JOIN "Pieu" p ON p.id = j."pieuId"
      WHERE j."statutInscription" <> 'Annulé(e)'
        AND j."dateNaissance" IS NOT NULL
        AND EXTRACT(MONTH FROM j."dateNaissance") = ${dateJour.getMonth() + 1}
        AND EXTRACT(DAY FROM j."dateNaissance") = ${dateJour.getDate()}
      ORDER BY j.nom, j.prenom
    `
  ).map((j) => ({ ...j, groupeNom: j.groupe, pieuNom: j.pieu }));

  // Journée de conférence correspondante (numéro + tenue vestimentaire)
  const finDateJour = new Date(dateJour);
  finDateJour.setDate(finDateJour.getDate() + 1);
  const journee = await prisma.journeeConference.findFirst({
    where: { date: { gte: dateJour, lt: finDateJour } },
  });

  // Chaque activité est filtrée sur le rôle attendu de l'utilisateur (les
  // réunions d'encadrants qui ne le concernent pas disparaissent) et, pour un
  // conseiller, sur le public et les groupes visés.
  const activitesPourMoi = activitesJour.filter((a) =>
    activitePourMoi({ ...a, groupeIds: a.groupes.map((g) => g.groupeId) }, user.role, mesGroupes)
  );

  const aCompleter = [
    !user.photoPublicId && CLOUDINARY_ACTIF && "votre photo",
    !user.telephone && "votre numéro",
  ].filter(Boolean) as string[];

  const signature = A_ANNONCER ? await signatureDuCouple() : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bonjour {user.prenom} 👋</h1>
        <p className="text-slate-500 capitalize">{fmtDate.format(new Date())}</p>
      </div>

      {A_ANNONCER && <MessageReport signature={signature} />}

      {/* Profil incomplet : rappel discret mais présent. Un numéro manquant se
          paie le jour du départ, quand personne n'arrive à joindre la personne. */}
      {aCompleter.length > 0 && (
        <Link
          href="/profil"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 hover:bg-amber-100 transition"
        >
          <Avatar
            prenom={user.prenom}
            nom={user.nom}
            photoPublicId={user.photoPublicId}
            taille={42}
          />
          <div className="text-sm text-amber-900 min-w-0">
            <div className="font-medium">Complétez votre profil</div>
            <div className="opacity-90">
              Il manque {aCompleter.join(" et ")}. C'est l'affaire d'une minute.
            </div>
          </div>
        </Link>
      )}

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

      {/* Anniversaires du jour */}
      {anniversairesDuJour.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <div className="font-bold text-amber-900">
            🎂 {anniversairesDuJour.length} anniversaire
            {anniversairesDuJour.length > 1 ? "s" : ""}
            {titreJour ? " ce jour-là" : " aujourd'hui"}
          </div>
          <ul className="text-sm text-amber-800 mt-1 space-y-0.5">
            {anniversairesDuJour.map((j) => (
              <li key={j.id}>
                <span className="font-medium">
                  {j.prenom} {j.nom}
                </span>{" "}
                — {dateJour.getFullYear() - j.dateNaissance.getFullYear()} ans ·{" "}
                {j.groupeNom ?? j.pieuNom}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rapport du jour : un seul appui pour y aller */}
      {journeeDuJour && (
        <Link
          href="/rapports"
          className={`block rounded-xl p-4 transition ${
            monRapportDuJour
              ? "bg-green-50 border border-green-300 text-green-900 hover:bg-green-100"
              : "bg-fsy text-white hover:bg-fsy-dark shadow"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold">
                {monRapportDuJour
                  ? "✅ Votre rapport du jour est remis"
                  : "📝 Votre rapport du jour"}
              </div>
              <p className={`text-sm ${monRapportDuJour ? "text-green-800" : "text-blue-100"}`}>
                {monRapportDuJour
                  ? `+${monRapportDuJour.points} points. Vous pouvez encore le compléter.`
                  : "Deux minutes, presque tout au doigt."}
              </p>
            </div>
            <span className="text-2xl shrink-0">→</span>
          </div>
        </Link>
      )}

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
            {titreJour
              ? `Prochaine journée${journee ? ` — Jour ${journee.numero}` : ""}`
              : "Mon programme du jour"}
            {titreJour && (
              <span className="block text-sm font-normal text-slate-500 capitalize">
                {titreJour}
              </span>
            )}
            {/* Tenue de l'encadrant, et celle des jeunes quand elle diffère */}
            {journee?.tenueEncadrants && (
              <span className="block text-sm font-normal text-fsy">
                👕 {journee.tenueEncadrants}
                {journee?.tenue && journee.tenue !== journee.tenueEncadrants && (
                  <span className="text-slate-400"> · jeunes : {journee.tenue}</span>
                )}
              </span>
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
                    <BadgeRole role={monRoleActivite(user.role, a)} />
                    <BadgesActivite
                      statut={a.statut}
                      publicCible={a.publicCible}
                      type={a.type}
                      pourEncadrants={a.pourEncadrants}
                    />
                  </div>
                  {(a.lieu || a.compagnie || a.groupes.length > 0) && (
                    <div className="text-sm text-slate-500">
                      {a.lieu}
                      {a.compagnie && `${a.lieu ? " — " : ""}${a.compagnie.nom}`}
                      {a.groupes.length > 0 &&
                        ` — ${a.groupes.map((g) => g.groupe.nom).join(", ")}`}
                    </div>
                  )}
                  {a.description && (
                    <p className="text-sm text-slate-600 mt-0.5">{a.description}</p>
                  )}
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
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(a.datePublication)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
