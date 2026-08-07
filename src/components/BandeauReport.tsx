import { MESSAGE, QUAND, REPORTEE, RESUME, SIGNATURE_ROLE, TITRE } from "@/lib/report";

// Une mauvaise nouvelle et une bonne ne se disent pas de la même couleur.
// L'ambre pour le report — une déception, pas un danger ; le vert pour les
// nouvelles dates, parce que quelqu'un qui a lu « reportée » doit voir au
// premier coup d'œil que ce n'est plus la même chose qui est écrite.
const TON = REPORTEE
  ? {
      signe: "⚠️",
      barre: "bg-amber-100 border-amber-300 text-amber-900",
      barreDetail: "text-amber-800",
      encart: "bg-amber-50 border-amber-300 text-amber-900",
      message: "bg-amber-50 border-amber-300 text-amber-950",
      trait: "border-amber-300",
      secondaire: "text-amber-800",
    }
  : {
      signe: "📅",
      barre: "bg-green-100 border-green-300 text-green-900",
      barreDetail: "text-green-800",
      encart: "bg-green-50 border-green-300 text-green-900",
      message: "bg-green-50 border-green-300 text-green-950",
      trait: "border-green-300",
      secondaire: "text-green-800",
    };

// L'annonce en cours, sous trois formes selon la place disponible.
//
// La même nouvelle, dite au même endroit dans la page, avec la même couleur :
// quelqu'un qui l'a lue une fois la reconnaît partout et n'a pas à la relire.

/** Barre fine, en tête de chaque page de l'espace encadrant. */
export function BarreReport() {
  return (
    <div
      data-report="barre"
      role="status"
      className={`border-b text-sm ${TON.barre}`}
    >
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-baseline gap-2 flex-wrap">
        <span className="font-semibold">{TON.signe} {TITRE}.</span>
        <span className={TON.barreDetail}>{QUAND}</span>
      </div>
    </div>
  );
}

/** Encadré, en tête d'une page dont le contenu est directement concerné. */
export function EncartReport({ precision }: { precision?: string }) {
  return (
    <div
      data-report="encart"
      role="status"
      className={`border rounded-xl p-4 ${TON.encart}`}
    >
      <h2 className="font-bold">{TON.signe} {TITRE}</h2>
      <p className="text-sm mt-1">{RESUME}</p>
      {precision && <p className="text-sm mt-1.5 font-medium">{precision}</p>}
      <p className={`text-sm mt-1.5 ${TON.secondaire}`}>{QUAND}</p>
    </div>
  );
}

/**
 * Le message entier, signé.
 *
 * Sur le site public et sur la page d'accueil de l'espace encadrant : c'est là
 * qu'on arrive, et c'est là que la nouvelle doit être lue en entier plutôt
 * qu'aperçue.
 */
export function MessageReport({ signature }: { signature?: string }) {
  return (
    <section
      data-report="message"
      className={`border-2 rounded-2xl p-5 sm:p-6 ${TON.message}`}
    >
      <h2 className="text-xl sm:text-2xl font-bold">{TON.signe} {TITRE}</h2>
      <div className="mt-3 space-y-2.5 text-sm sm:text-base leading-relaxed">
        {MESSAGE.map((paragraphe) => (
          <p key={paragraphe}>{paragraphe}</p>
        ))}
      </div>
      <div className={`mt-4 pt-3 border-t text-sm ${TON.trait}`}>
        <div className="font-semibold">{signature}</div>
        <div className={TON.secondaire}>{SIGNATURE_ROLE}</div>
      </div>
    </section>
  );
}
