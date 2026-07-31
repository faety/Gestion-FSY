import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { voitToutesLesAlertes } from "@/lib/roles";
import { estAccepte, estAnnule } from "@/lib/criteres";
import { CATEGORIES, RECOMMANDATIONS, classer } from "@/lib/vigilance";
import { journaliserConsultation } from "@/lib/audit";
import { RechercheAlertes } from "@/components/RechercheAlertes";

export const metadata = {
  title: "Santé et alimentation",
  // Ces pages ne doivent apparaître dans aucun index, ni dans aucun aperçu de
  // lien partagé : ce sont des dossiers médicaux de mineurs.
  robots: { index: false, follow: false, nocache: true },
};

// Rien de tout cela ne se met en cache : la page est reconstruite à chaque
// consultation, pour l'exactitude comme pour la trace.
export const dynamic = "force-dynamic";

// Liste complète des jeunes signalant un problème de santé ou une contrainte
// alimentaire, tous groupes confondus, et lecture de cette liste par nature de
// vigilance — l'ordre du rapport de l'administrateur du bien-être.
//
// Réservée à ceux qui répondent de la conférence entière — couple dirigeant,
// coordinateurs principaux — et aux adjoints désignés au bien-être. Ailleurs
// dans l'application, chacun ne voit que son périmètre : ces informations
// touchent à la santé de mineurs et ne se consultent pas par curiosité.
export default async function SantePage() {
  const user = await exigerUtilisateur();
  if (!voitToutesLesAlertes(user)) redirect("/accueil");
  await journaliserConsultation(
    user.id,
    "CONSULTATION_SANTE",
    "liste des renseignements médicaux et alimentaires"
  );

  const jeunes = await prisma.jeune.findMany({
    where: {
      OR: [{ medical: { not: null } }, { alimentaire: { not: null } }],
    },
    include: {
      pieu: { select: { nom: true } },
      groupe: {
        select: {
          nom: true,
          conseiller: { select: { prenom: true, nom: true, telephone: true } },
          compagnie: { select: { nom: true } },
        },
      },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  // Les inscriptions annulées ne viennent pas : les faire figurer sur une liste
  // de vigilance ferait chercher quelqu'un qui n'est pas là. Celles encore en
  // attente d'approbation sont montrées à part — leur cas devra être réintégré
  // si la situation se régularise, et l'oublier serait une mauvaise surprise.
  const attendus = jeunes.filter((j) => !estAnnule(j.statutInscription));
  const enAttente = attendus.filter((j) => !estAccepte(j.statutInscription));
  const approuves = attendus.filter((j) => estAccepte(j.statutInscription));

  const fiches = approuves.map((j) => ({
    id: j.id,
    nom: `${j.prenom} ${j.nom}`,
    sexe: j.sexe,
    medical: j.medical,
    alimentaire: j.alimentaire,
    groupe: j.groupe?.nom ?? null,
    compagnie: j.groupe?.compagnie?.nom ?? null,
    pieu: j.pieu.nom,
    conseiller: j.groupe?.conseiller
      ? {
          nom: `${j.groupe.conseiller.prenom} ${j.groupe.conseiller.nom}`,
          telephone: j.groupe.conseiller.telephone,
        }
      : null,
    // Le contact d'urgence n'est pas affiché d'emblée : il ne sert qu'en cas de
    // besoin, et une liste de soixante numéros de parents à l'écran serait une
    // exposition inutile.
    contact: j.contactNom ? { nom: j.contactNom, telephone: j.contactTelephone } : null,
  }));

  const avecMedical = fiches.filter((f) => f.medical).length;
  const avecAlimentaire = fiches.filter((f) => f.alimentaire).length;
  const sansGroupe = fiches.filter((f) => !f.groupe).length;
  const filles = fiches.filter((f) => f.sexe === "F").length;

  // Classement par nature de vigilance, à partir de ce que les familles ont
  // écrit. Une même personne peut relever de plusieurs natures : un asthme
  // sous traitement est les deux.
  const classements = new Map(
    approuves.map((j) => [j.id, classer(j.medical, j.alimentaire)] as const)
  );
  const parCategorie = CATEGORIES.map((c) => ({
    ...c,
    concernes: fiches.filter((f) => classements.get(f.id)?.categories.includes(c.cle)),
  })).filter((c) => c.concernes.length > 0);
  const aClarifier = fiches.filter((f) => classements.get(f.id)?.aClarifier);
  // Ce qu'aucune catégorie ne reconnaît : à lire à la main, plutôt qu'à perdre.
  const nonClasses = fiches.filter((f) => (classements.get(f.id)?.categories.length ?? 0) === 0);

  const parPieu = [...new Map(fiches.map((f) => [f.pieu, 0])).keys()]
    .map((pieu) => ({
      pieu,
      total: fiches.filter((f) => f.pieu === pieu).length,
      filles: fiches.filter((f) => f.pieu === pieu && f.sexe === "F").length,
    }))
    .sort((a, b) => b.total - a.total || a.pieu.localeCompare(b.pieu, "fr"));

  const total = await prisma.jeune.count({ where: { statutInscription: { not: "Annulé(e)" } } });
  const part = total > 0 ? ((fiches.length / total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">⚕️ Santé et alimentation</h1>
        <p className="text-slate-500 text-sm">
          Tous les jeunes attendus qui signalent un problème de santé ou une contrainte
          alimentaire, quel que soit leur groupe. Renseignements déclarés à l&apos;inscription
          par les familles.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { valeur: fiches.length, label: "jeunes concernés" },
          { valeur: avecMedical, label: "alertes médicales" },
          { valeur: avecAlimentaire, label: "contraintes alimentaires" },
          { valeur: `${part} %`, label: "des jeunes attendus" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-3">
            <div className="text-2xl font-bold text-fsy">{s.valeur}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        {filles} filles · {fiches.length - filles} garçons · répartis sur {parPieu.length} pieux
        et districts
      </p>

      {sansGroupe > 0 && (
        <p className="text-sm bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">
          ⚠️ <strong>{sansGroupe}</strong> de ces jeunes n&apos;ont pas de groupe : personne
          n&apos;est nommément chargé de veiller sur eux.
        </p>
      )}

      <p className="text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
        Ces renseignements concernent des mineurs. Ne les recopiez pas ailleurs, n&apos;en
        parlez qu&apos;à qui en a besoin pour agir, et sachez que chaque consultation de cette
        page est enregistrée au journal.
      </p>

      {/* ---------- Points de vigilance ---------- */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div>
          <h2 className="font-bold">Points de vigilance</h2>
          <p className="text-sm text-slate-500">
            Les mêmes personnes, rangées par nature de ce qu&apos;elles ont déclaré. Une
            déclaration peut relever de plusieurs natures.
          </p>
        </div>

        {aClarifier.length > 0 && (
          <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
            <strong>À clarifier avant la conférence — {aClarifier.length}</strong>
            <p className="mt-0.5">
              Ces déclarations nomment un produit sans dire ce qu&apos;il faut en faire.
              Allergie ou traitement habituel ? Les deux conduites sont opposées : la question
              se pose maintenant, pas devant le jeune.
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {aClarifier.map((f) => (
                <li key={f.id}>
                  • <strong>{f.nom}</strong> ({f.pieu}) — « {f.medical} »
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          {parCategorie.map((c) => (
            <details
              key={c.cle}
              className={`rounded-lg border p-3 ${
                c.urgent ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
              }`}
            >
              <summary className="cursor-pointer font-medium text-sm">
                {c.urgent && "🔴 "}
                {c.titre}{" "}
                <span className="text-slate-500 font-normal">— {c.concernes.length}</span>
              </summary>
              <p className="text-xs text-slate-600 mt-1.5">{c.aide}</p>
              <ul className="text-sm mt-2 space-y-1">
                {c.concernes.map((f) => (
                  <li key={f.id} className="flex justify-between gap-3 flex-wrap">
                    <span>
                      <strong>{f.nom}</strong>{" "}
                      <span className="text-slate-500">
                        — {[f.medical, f.alimentaire].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {f.groupe ?? "sans groupe"}
                      {f.conseiller && ` · ${f.conseiller.nom}`}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}

          {nonClasses.length > 0 && (
            <details className="rounded-lg border bg-slate-50 border-slate-200 p-3">
              <summary className="cursor-pointer font-medium text-sm">
                Autres déclarations{" "}
                <span className="text-slate-500 font-normal">— {nonClasses.length}</span>
              </summary>
              <p className="text-xs text-slate-600 mt-1.5">
                Aucune des natures ci-dessus ne les reconnaît. À lire une par une.
              </p>
              <ul className="text-sm mt-2 space-y-1">
                {nonClasses.map((f) => (
                  <li key={f.id}>
                    <strong>{f.nom}</strong>{" "}
                    <span className="text-slate-500">
                      — {[f.medical, f.alimentaire].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>

      {/* ---------- Répartition par pieu ---------- */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-2">Répartition par pieu et district</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {parPieu.map((p) => (
            <li key={p.pieu} className="flex justify-between py-1.5">
              <span>{p.pieu}</span>
              <span className="text-slate-500">
                {p.total} cas <span className="text-slate-400">({p.filles} F / {p.total - p.filles} G)</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Cas écartés ---------- */}
      {enAttente.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="font-bold text-amber-900">
            Cas écartés — inscription non validée ({enAttente.length})
          </h2>
          <p className="text-sm text-amber-800 mt-1">
            Ces jeunes ont déclaré un renseignement médical mais ne sont pas attendus en
            l&apos;état. Si leur inscription est régularisée, leur cas devra être réintégré aux
            listes ci-dessus.
          </p>
          <ul className="text-sm mt-2 space-y-1 text-amber-900">
            {enAttente.map((j) => (
              <li key={j.id}>
                <strong>
                  {j.prenom} {j.nom}
                </strong>{" "}
                ({j.pieu.nom}) — {[j.medical, j.alimentaire].filter(Boolean).join(" · ")}{" "}
                <span className="text-amber-700">· {j.statutInscription}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Recommandations ---------- */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-2">Recommandations</h2>
        <ul className="text-sm space-y-1.5 text-slate-700">
          {RECOMMANDATIONS.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      </section>

      <RechercheAlertes fiches={fiches} />
    </div>
  );
}
