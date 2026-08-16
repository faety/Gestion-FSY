import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { ROLE_LABELS, roleAuMoins, type Role } from "@/lib/roles";
import { libelleJour } from "@/lib/rapports";
import { construireSynthese, syntheseEnTexte, type Comptage } from "@/lib/synthese";
import { urlPhoto } from "@/lib/cloudinary";
import { ExportSynthese } from "@/components/ExportSynthese";

const TITRE = "Rapport final — FSY 2026 Abidjan Ouest";
const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long" });

export default async function RapportFinalPage() {
  const user = await exigerUtilisateur();
  if (!roleAuMoins(user.role, "COORDINATEUR")) redirect("/rapports");

  const [rapports, journees, nbEncadrants] = await Promise.all([
    prisma.rapportQuotidien.findMany({
      orderBy: [{ jour: "asc" }, { createdAt: "asc" }],
      include: {
        auteur: { select: { id: true, prenom: true, nom: true, role: true } },
        photos: { select: { id: true, publicId: true, image: true } },
      },
    }),
    prisma.journeeConference.findMany({
      orderBy: { numero: "asc" },
      select: { numero: true, date: true },
    }),
    prisma.user.count({ where: { actif: true } }),
  ]);

  const s = construireSynthese(rapports, journees, nbEncadrants);
  const texte = syntheseEnTexte(s, TITRE);

  if (s.nbRapports === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">📊 Rapport final</h1>
        <p className="bg-white rounded-xl shadow-sm p-4 text-slate-600">
          Aucun rapport quotidien n'a encore été remis. Cette page se construit toute seule à
          mesure que l'encadrement remplit ses rapports :{" "}
          <Link href="/rapports" className="text-fsy hover:underline">
            commencer par le mien
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📊 Rapport final</h1>
        <p className="text-slate-500 text-sm">
          Synthèse automatique des {s.nbRapports} rapports quotidiens remis par {s.nbAuteurs}{" "}
          encadrants. Elle se met à jour à chaque nouveau rapport.
        </p>
      </div>

      <ExportSynthese texte={texte} nomFichier="rapport-final-fsy-2026.md" />

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Chiffre valeur={s.nbRapports} label="Rapports remis" />
        <Chiffre valeur={`${s.nbAuteurs}/${s.nbEncadrants}`} label="Encadrants ayant rapporté" />
        <Chiffre
          valeur={s.ambianceMoyenne !== null ? `${s.ambianceMoyenne.toFixed(1)}/5` : "—"}
          label="Ambiance moyenne"
        />
        <Chiffre valeur={s.demandesAide.length} label="Demandes d'aide" alerte={s.demandesAide.length > 0} />
      </div>

      {/* Demandes d'aide en tête : c'est ce qui appelle une action */}
      {s.demandesAide.length > 0 && (
        <section className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <h2 className="font-bold text-amber-900">🆘 Demandes d'aide</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {s.demandesAide.map((d, i) => (
              <li key={i} className="text-amber-900">
                <span className="font-medium">
                  {libelleJour(d.jour)} — {d.auteur}
                </span>
                <span className="text-amber-700"> · {d.role}</span>
                <p className="text-amber-800">{d.detail || "Sans précision."}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Jour par jour */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-3">Jour par jour</h2>
        <ul className="space-y-2.5">
          {s.parJour.map((j) => (
            <li key={j.numero}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {j.libelle}
                  <span className="text-slate-400"> · {fmtDate.format(j.date)}</span>
                </span>
                <span className="text-slate-500 whitespace-nowrap">
                  {j.remis}/{j.attendus}
                  {j.moyenneAmbiance !== null && ` · ${j.moyenneAmbiance.toFixed(1)}/5`}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-fsy rounded-full"
                  style={{
                    width: `${j.attendus > 0 ? Math.min(100, (j.remis / j.attendus) * 100) : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Ambiance */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-3">Ambiance déclarée</h2>
        <ul className="space-y-2">
          {s.repartitionAmbiance.map((a) => (
            <li key={a.cle} className="flex items-center gap-2 text-sm">
              <span className="text-xl w-7">{a.emoji}</span>
              <span className="w-28 shrink-0 text-slate-600">{a.label}</span>
              <span className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <span
                  className={`block h-full rounded-full ${a.couleur}`}
                  style={{
                    width: `${s.nbRapports > 0 ? (a.nombre / s.nbRapports) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="w-8 text-right text-slate-500">{a.nombre}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Appels des présents */}
      {s.appels.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold">🙋 Appels des présents</h2>
          <p className="text-sm text-slate-500 mb-3">
            Les effectifs comptés et rapportés par la chaîne d&apos;appel — le total ne vaut que
            pour les rapports remis, leur nombre est donné à côté.
          </p>
          <ul className="divide-y divide-slate-100 text-sm">
            {s.appels.map((a) => (
              <li key={a.numero} className="py-2 flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-medium w-16">{a.libelle}</span>
                {a.soir.rapports > 0 && (
                  <span>
                    Soir : <strong>{a.soir.total}</strong> jeunes comptés
                    <span className="text-slate-400"> · {a.soir.rapports} conseiller(s)</span>
                  </span>
                )}
                {a.midi.rapports > 0 && (
                  <span>
                    Midi : <strong>{a.midi.total}</strong>
                    <span className="text-slate-400"> · {a.midi.rapports} conseiller(s)</span>
                  </span>
                )}
                {a.perimetresAdjoints.rapports > 0 && (
                  <span>
                    Adjoints : <strong>{a.perimetresAdjoints.total}</strong>
                    <span className="text-slate-400">
                      {" "}
                      · {a.perimetresAdjoints.rapports} périmètre(s)
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Intendance */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">Intendance et logistique</h2>
        <p className="text-sm text-slate-500 mb-3">
          Classé par nombre de soucis signalés : le haut de liste est ce qu'il faut corriger.
        </p>
        <ul className="divide-y divide-slate-100 text-sm">
          {s.intendance.map((i) => (
            <li key={i.point} className="py-2 flex items-center justify-between gap-3">
              <span className="min-w-0">
                {i.point}
                {i.jours.length > 0 && (
                  <span className="block text-xs text-orange-700">
                    Signalé : {i.jours.join(", ")}
                  </span>
                )}
              </span>
              <span className="flex gap-1.5 shrink-0 text-xs">
                {i.souci > 0 && (
                  <span className="bg-orange-100 text-orange-800 rounded-full px-2 py-0.5">
                    ⚠️ {i.souci}
                  </span>
                )}
                {i.ok > 0 && (
                  <span className="bg-green-100 text-green-800 rounded-full px-2 py-0.5">
                    ✅ {i.ok}
                  </span>
                )}
                {i.souci === 0 && i.ok === 0 && <span className="text-slate-400">non renseigné</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        <Comptages titre="Incidents relevés" icone="⚠️" donnees={s.incidents} />
        <Comptages titre="Santé et bien-être" icone="⚕️" donnees={s.sante} />
        <Comptages titre="Participation des jeunes" icone="🙋" donnees={s.participation} />
        <Comptages titre="Vie spirituelle" icone="🕊️" donnees={s.devotions} />
        <Comptages titre="Coordination" icone="🤝" donnees={s.coordination} />
        <Comptages titre="État des équipes" icone="💪" donnees={s.etatEquipe} />
      </div>

      {/* Verbatim */}
      {s.verbatim.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold mb-3">Ce que les encadrants ont écrit</h2>
          <div className="space-y-4">
            {s.verbatim.map((v) => (
              <div key={v.numero}>
                <div className="font-medium text-sm">
                  {v.libelle}
                  <span className="text-slate-400"> · {fmtDate.format(v.date)}</span>
                </div>
                {v.aMarche.length > 0 && (
                  <ul className="mt-1.5 space-y-1.5">
                    {v.aMarche.map((x, i) => (
                      <li key={i} className="text-sm border-l-4 border-green-400 pl-3">
                        {x.texte}
                        <span className="block text-xs text-slate-400">
                          {x.auteur} · {ROLE_LABELS[x.role as Role]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {v.aAmeliorer.length > 0 && (
                  <ul className="mt-1.5 space-y-1.5">
                    {v.aAmeliorer.map((x, i) => (
                      <li key={i} className="text-sm border-l-4 border-orange-400 pl-3">
                        {x.texte}
                        <span className="block text-xs text-slate-400">
                          {x.auteur} · {ROLE_LABELS[x.role as Role]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {s.absences.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold mb-2">Absences signalées</h2>
          <ul className="space-y-2 text-sm">
            {s.absences.map((a, i) => (
              <li key={i}>
                <span className="text-xs bg-slate-100 text-slate-700 rounded-full px-2 py-0.5">
                  {a.quoi}
                </span>{" "}
                {a.texte}
                <span className="block text-xs text-slate-400">
                  {libelleJour(a.jour)} · {a.auteur}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.temoignages.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold mb-2">🕊️ Moments marquants</h2>
          <ul className="space-y-2 text-sm">
            {s.temoignages.map((t, i) => (
              <li key={i} className="border-l-4 border-fsy pl-3">
                {t.texte}
                <span className="block text-xs text-slate-400">
                  {libelleJour(t.jour)} · {t.auteur}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.decisions.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold mb-2">🧭 Décisions et arbitrages</h2>
          <ul className="space-y-2 text-sm">
            {s.decisions.map((d, i) => (
              <li key={i}>
                <span
                  className={`text-xs rounded-full px-2 py-0.5 ${
                    d.type === "Décision"
                      ? "bg-fsy-light text-fsy-dark"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {d.type}
                </span>{" "}
                {d.texte}
                <span className="block text-xs text-slate-400">
                  {libelleJour(d.jour)} · {d.auteur}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.conseils.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold mb-1">💡 Conseils pour les prochains comités</h2>
          <p className="text-sm text-slate-500 mb-2">
            Exigés par le rapport historique du manuel, transmis au couple consultant de
            l&apos;interrégion.
          </p>
          <ul className="space-y-2 text-sm">
            {s.conseils.map((c, i) => (
              <li key={i} className="border-l-4 border-slate-300 pl-3">
                {c.texte}
                <span className="block text-xs text-slate-400">
                  {libelleJour(c.jour)} · {c.auteur}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.photos.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold mb-3">📷 Photos des rapports ({s.photos.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {s.photos.map((p) => {
              // Vignette de 400 px produite par Cloudinary : la synthèse reste
              // légère même avec des centaines de photos. L'appui ouvre la
              // photo entière, elle aussi servie par une URL signée.
              const vignette = p.publicId ? urlPhoto(p.publicId, 400) : p.image;
              const entiere = p.publicId ? urlPhoto(p.publicId) : p.image;
              if (!vignette) return null;
              return (
                <figure key={p.id}>
                  <a href={entiere ?? vignette} target="_blank" rel="noopener noreferrer">
                    {/* Vignette signée ou data URL héritée : next/image n'apporterait rien */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={vignette}
                      alt={`${libelleJour(p.jour)} — ${p.auteur}`}
                      loading="lazy"
                      className="rounded-lg w-full aspect-square object-cover"
                    />
                  </a>
                  <figcaption className="text-xs text-slate-400 mt-1">
                    {libelleJour(p.jour)} · {p.auteur}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      )}

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-2">Remise par niveau de responsabilité</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {s.parRole
            .filter((r) => r.remis > 0)
            .map((r) => (
              <li key={r.role} className="py-2 flex justify-between gap-2">
                <span>{r.label}</span>
                <span className="text-slate-500">
                  {r.remis} rapport{r.remis > 1 ? "s" : ""} · {r.auteurs} personne
                  {r.auteurs > 1 ? "s" : ""}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function Chiffre({
  valeur,
  label,
  alerte,
}: {
  valeur: string | number;
  label: string;
  alerte?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className={`text-2xl font-bold ${alerte ? "text-amber-600" : "text-fsy"}`}>{valeur}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function Comptages({
  titre,
  icone,
  donnees,
}: {
  titre: string;
  icone: string;
  donnees: Comptage[];
}) {
  if (donnees.length === 0) return null;
  const max = Math.max(...donnees.map((d) => d.nombre));
  return (
    <section className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="font-bold mb-2">
        {icone} {titre}
      </h2>
      <ul className="space-y-1.5 text-sm">
        {donnees.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-slate-600">{d.label}</span>
            <span className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
              <span
                className="block h-full bg-fsy rounded-full"
                style={{ width: `${(d.nombre / max) * 100}%` }}
              />
            </span>
            <span className="w-7 text-right text-slate-500">{d.nombre}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
