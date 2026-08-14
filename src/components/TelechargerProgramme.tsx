import { NB_JOURS, dateDuJour } from "@/lib/theme";

// Téléchargement du programme en PDF — visible du couple dirigeant et des
// coordinateurs principaux seulement (la page ne l'affiche qu'à eux, la route
// le vérifie de son côté). Un lien par jour, plus la conférence entière.
const fmtJour = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });

export function TelechargerProgramme() {
  const jours = Array.from({ length: NB_JOURS + 1 }, (_, n) => n);
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="font-semibold text-slate-800">📄 Télécharger le programme en PDF</h2>
      <p className="text-sm text-slate-500 mt-0.5">
        Le document est composé à l&apos;instant du téléchargement : il contient toutes les mises à
        jour — horaires confirmés, activités modifiées, annulées ou ajoutées sur place.
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <a
          href="/programme/pdf"
          className="text-sm font-medium bg-fsy text-white rounded-lg px-3.5 py-2 hover:bg-fsy-dark transition-colors"
        >
          Conférence entière
        </a>
        {jours.map((n) => (
          <a
            key={n}
            href={`/programme/pdf?jour=${n}`}
            className="text-sm bg-white border border-slate-300 text-slate-700 rounded-lg px-3 py-2 hover:border-fsy hover:text-fsy transition-colors"
          >
            {n === 0 ? "Veille" : `J${n}`} · {fmtJour.format(dateDuJour(n))}
          </a>
        ))}
      </div>
    </section>
  );
}
