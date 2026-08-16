"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  appliquerReorganisation,
  basculerPresenceEncadrant,
  marquerPresenceJeune,
  restaurerOrganisation,
  simulerReorganisation,
} from "@/lib/actions";
import type { ParametresReorganisation, PlanReorganisation } from "@/lib/reorganisation";

// L'assistant du jour 1, en trois temps : constater qui est là, calculer une
// proposition (sans rien toucher), l'appliquer — avec retour en arrière.

type Encadrant = { id: string; nom: string; role: string; sexe: string; actif: boolean };
type JeuneLigne = { id: string; nom: string; sexe: string; pointe: boolean; manuel: boolean };

const normaliser = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const fmtDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export function AssistantReorganisation({
  resume,
  encadrants,
  jeunes,
  proposes,
  instantanes,
}: {
  resume: {
    inscrits: number;
    presents: number;
    pointes: number;
    manuels: number;
    presentesF: number;
    presentsM: number;
    conseilleresF: number;
    conseillersM: number;
    adjoints: number;
    groupesOrphelins: string[];
  };
  encadrants: Encadrant[];
  jeunes: JeuneLigne[];
  proposes: ParametresReorganisation;
  instantanes: { id: string; motif: string; date: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [params, setParams] = useState(proposes);
  const [proposition, setProposition] = useState<{
    plan: PlanReorganisation;
    noms: Record<string, string>;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rechercheEnc, setRechercheEnc] = useState("");
  const [rechercheJeune, setRechercheJeune] = useState("");

  const encadrantsFiltres = useMemo(() => {
    const q = normaliser(rechercheEnc.trim());
    const absents = encadrants.filter((e) => !e.actif);
    if (!q) return absents.slice(0, 12);
    return encadrants.filter((e) => normaliser(e.nom).includes(q)).slice(0, 12);
  }, [encadrants, rechercheEnc]);

  const jeunesFiltres = useMemo(() => {
    const q = normaliser(rechercheJeune.trim());
    if (q.length < 2) return [];
    return jeunes.filter((j) => normaliser(j.nom).includes(q)).slice(0, 10);
  }, [jeunes, rechercheJeune]);

  const agir = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      setMessage(null);
      await fn();
      router.refresh();
    });

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">🧩 Réorganisation du jour 1</h1>
        <p className="text-slate-500 text-sm">
          Recomposer groupes et compagnies d&apos;après ceux qui sont réellement là — les jeunes
          gardent leur conseiller chaque fois que c&apos;est possible, et tout peut se défaire.
        </p>
      </div>

      {/* ---------- 1. Qui est là ---------- */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">1 · Qui est là</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-center">
          {[
            [`${resume.presents}`, `jeunes présents / ${resume.inscrits}`],
            [`${resume.pointes} + ${resume.manuels}`, "pointés cars + à la main"],
            [`${resume.conseilleresF} F · ${resume.conseillersM} G`, "conseillers présents"],
            [`${resume.adjoints}`, "adjoints présents"],
          ].map(([v, l]) => (
            <div key={l} className="bg-slate-50 rounded-lg p-3">
              <div className="text-xl font-bold text-fsy">{v}</div>
              <div className="text-xs text-slate-500 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
        {resume.groupesOrphelins.length > 0 && (
          <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-3 text-amber-900">
            ⚠️ {resume.groupesOrphelins.length} groupe(s) sans conseiller présent :{" "}
            {resume.groupesOrphelins.join(" · ")}
          </p>
        )}

        {/* Encadrants présents / absents */}
        <div className="mt-4">
          <div className="font-semibold text-sm">Encadrants absents ou à basculer</div>
          <input
            value={rechercheEnc}
            onChange={(e) => setRechercheEnc(e.target.value)}
            placeholder="Rechercher un conseiller ou un adjoint…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base mt-1.5"
          />
          <ul className="divide-y divide-slate-100 mt-1">
            {encadrantsFiltres.map((e) => (
              <li key={e.id} className="py-1.5 flex items-center justify-between gap-2 text-sm">
                <span>
                  {e.nom}{" "}
                  <span className="text-xs text-slate-400">
                    {e.role === "ADJOINT" ? "adjoint" : "conseiller"}
                  </span>
                  {!e.actif && (
                    <span className="ml-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
                      absent
                    </span>
                  )}
                </span>
                <button
                  disabled={pending}
                  onClick={() => agir(() => basculerPresenceEncadrant(e.id))}
                  className={`shrink-0 text-xs font-medium rounded-lg px-2.5 py-1.5 transition ${
                    e.actif
                      ? "text-red-700 hover:bg-red-50"
                      : "bg-fsy text-white hover:bg-fsy-dark"
                  }`}
                >
                  {e.actif ? "Marquer absent" : "Marquer présent"}
                </button>
              </li>
            ))}
            {encadrantsFiltres.length === 0 && (
              <li className="py-1.5 text-sm text-slate-400">
                {rechercheEnc ? "Personne ne correspond." : "Aucun encadrant marqué absent."}
              </li>
            )}
          </ul>
        </div>

        {/* Jeunes arrivés par leurs propres moyens */}
        <div className="mt-4">
          <div className="font-semibold text-sm">Jeune arrivé sans pointage de car ?</div>
          <input
            value={rechercheJeune}
            onChange={(e) => setRechercheJeune(e.target.value)}
            placeholder="Rechercher un jeune pour le marquer présent…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base mt-1.5"
          />
          <ul className="divide-y divide-slate-100 mt-1">
            {jeunesFiltres.map((j) => (
              <li key={j.id} className="py-1.5 flex items-center justify-between gap-2 text-sm">
                <span>
                  {j.nom}{" "}
                  <span className="text-xs text-slate-400">{j.sexe === "F" ? "JF" : "JG"}</span>
                  {j.pointe && (
                    <span className="ml-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                      pointé car
                    </span>
                  )}
                  {j.manuel && (
                    <span className="ml-1.5 text-xs bg-blue-50 text-fsy-dark border border-blue-200 rounded-full px-2 py-0.5">
                      présent (à la main)
                    </span>
                  )}
                </span>
                {!j.pointe && (
                  <button
                    disabled={pending}
                    onClick={() => agir(() => marquerPresenceJeune(j.id, !j.manuel))}
                    className={`shrink-0 text-xs font-medium rounded-lg px-2.5 py-1.5 transition ${
                      j.manuel ? "text-red-700 hover:bg-red-50" : "bg-fsy text-white hover:bg-fsy-dark"
                    }`}
                  >
                    {j.manuel ? "Retirer" : "Marquer présent"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- 2. Paramètres et proposition ---------- */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">2 · Calculer une proposition</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Tailles proposées d&apos;après les présents ; ajustez si besoin. Le calcul ne modifie
          rien : vous verrez tout avant d&apos;appliquer.
        </p>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {(
            [
              ["tailleCibleF", "Jeunes filles / groupe"],
              ["tailleCibleM", "Jeunes gens / groupe"],
              ["groupesParCompagnie", "Groupes / compagnie"],
            ] as const
          ).map(([cle, label]) => (
            <label key={cle} className="text-xs text-slate-500">
              {label}
              <input
                type="number"
                min={cle === "groupesParCompagnie" ? 2 : 4}
                max={cle === "groupesParCompagnie" ? 6 : 20}
                value={params[cle]}
                onChange={(e) =>
                  setParams({ ...params, [cle]: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base mt-1 text-slate-900"
              />
            </label>
          ))}
        </div>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              const r = await simulerReorganisation(params);
              if (r.ok) setProposition({ plan: r.plan, noms: r.noms });
            })
          }
          className="mt-3 bg-fsy hover:bg-fsy-dark text-white font-medium rounded-lg px-4 py-2.5 text-sm transition disabled:opacity-50"
        >
          {pending ? "Calcul…" : "Calculer la proposition"}
        </button>

        {proposition && (
          <div className="mt-4 space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-fsy-dark">
              <strong>
                {proposition.plan.stats.gardentConseiller} jeune(s) gardent leur conseiller
              </strong>{" "}
              ({Math.round(
                (100 * proposition.plan.stats.gardentConseiller) /
                  Math.max(1, proposition.plan.stats.presents)
              )}
              &nbsp;%) · {proposition.plan.stats.changentConseiller} changent ·{" "}
              {proposition.plan.stats.sansGroupeAvant} n&apos;avaient pas de groupe.
              <br />
              {proposition.plan.groupes.length} groupes ({proposition.plan.stats.groupesConserves}{" "}
              conservés) · {proposition.plan.compagnies.length} compagnies (
              {proposition.plan.stats.compagniesConservees} conservées)
              {proposition.plan.stats.conseillersSansGroupe > 0 && (
                <> · {proposition.plan.stats.conseillersSansGroupe} conseiller(s) sans groupe</>
              )}
            </div>
            {proposition.plan.stats.avertissements.map((a) => (
              <p key={a} className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-900">
                ⚠️ {a}
              </p>
            ))}
            <div className="grid sm:grid-cols-2 gap-3">
              {proposition.plan.compagnies.map((c, ci) => (
                <div key={ci} className="border border-slate-200 rounded-lg p-3 text-sm">
                  <div className="font-semibold flex items-center gap-2">
                    {c.nom}
                    {c.conservee && (
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                        conservée
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {c.dirigeantIds.length > 0
                      ? c.dirigeantIds.map((id) => proposition.noms[id] ?? id).join(" · ")
                      : "sans adjoint présent"}
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {c.groupesIdx.map((gi) => {
                      const g = proposition.plan.groupes[gi];
                      return (
                        <li key={gi} className="flex justify-between gap-2">
                          <span>
                            {g.nom}{" "}
                            <span className="text-xs text-slate-400">
                              {g.sexe === "F" ? "JF" : "JG"} · {g.jeuneIds.length}
                            </span>
                          </span>
                          <span className="text-xs text-slate-500 text-right">
                            {proposition.noms[g.conseillerId] ?? "?"}
                            {g.conserve ? "" : " (nouveau)"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <button
              disabled={pending}
              onClick={() => {
                if (
                  !confirm(
                    "Appliquer cette réorganisation ? Un instantané de l'état actuel sera pris : vous pourrez revenir en arrière."
                  )
                )
                  return;
                startTransition(async () => {
                  const r = await appliquerReorganisation(params);
                  setMessage(
                    r.ok
                      ? "✅ Réorganisation appliquée. Chaque encadrant voit ses groupes à jour ; l'instantané d'avant est conservé ci-dessous."
                      : r.motif
                  );
                  if (r.ok) setProposition(null);
                  router.refresh();
                });
              }}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition disabled:opacity-50"
            >
              {pending ? "Application…" : "Appliquer cette réorganisation"}
            </button>
          </div>
        )}
        {message && <p className="text-sm mt-3">{message}</p>}
      </section>

      {/* ---------- 3. Revenir en arrière ---------- */}
      {instantanes.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold">3 · Revenir en arrière</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            L&apos;état photographié juste avant chaque application. La restauration remet
            groupes, compagnies et affectations tels qu&apos;ils étaient.
          </p>
          <ul className="divide-y divide-slate-100 mt-2">
            {instantanes.map((i) => (
              <li key={i.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <span>
                  {i.motif}
                  <span className="block text-xs text-slate-400">{fmtDate.format(new Date(i.date))}</span>
                </span>
                <button
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Restaurer cet état ? La composition actuelle sera remplacée."))
                      return;
                    agir(async () => {
                      const r = await restaurerOrganisation(i.id);
                      setMessage(r.ok ? "✅ État restauré." : r.motif);
                    });
                  }}
                  className="shrink-0 text-xs font-medium text-fsy hover:bg-blue-50 rounded-lg px-2.5 py-1.5 transition"
                >
                  Revenir à cet état
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
