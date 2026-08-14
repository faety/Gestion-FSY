import { ordreDuJourDe } from "@/lib/ordres-du-jour";

// L'ordre du jour suggéré par le manuel de l'encadrant, replié par défaut pour
// ne pas alourdir le programme — un clic l'ouvre. Attaché à l'affichage, jamais
// en base : les modifications des coordinateurs restent intouchées.
export function OrdreDuJourSuggere({
  titre,
  jour,
  debut,
}: {
  titre: string;
  jour: number | undefined;
  debut: string;
}) {
  const fiche = ordreDuJourDe(titre, jour ?? -1, new Date(debut).getHours());
  if (!fiche) return null;
  return (
    <details className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm open:bg-white">
      <summary className="cursor-pointer select-none px-3 py-1.5 text-fsy-dark font-medium">
        📋 {fiche.nature === "ordre" ? "Ordre du jour suggéré" : "Repères"}
        <span className="text-slate-400 font-normal"> — manuel de l&apos;encadrant</span>
      </summary>
      <div className="px-3 pb-2.5 space-y-1.5">
        {fiche.objet && <p className="text-slate-500 italic">{fiche.objet}</p>}
        <ul className="space-y-0.5">
          {fiche.points.map((p) =>
            p.startsWith("◦") ? (
              <li key={p} className="pl-5 text-slate-500">
                {p}
              </li>
            ) : (
              <li key={p} className="text-slate-700">
                • {p}
              </li>
            )
          )}
        </ul>
        {fiche.formations && (
          <details className="pt-1">
            <summary className="cursor-pointer select-none text-slate-500">
              Sujets de formation suggérés ({fiche.formations.length})
            </summary>
            <ul className="mt-1 space-y-0.5 text-slate-500">
              {fiche.formations.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </details>
  );
}
