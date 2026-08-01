import { MESSAGE, QUAND, RESUME, SIGNATURE_ROLE, TITRE } from "@/lib/report";

// Le report de la conférence, sous trois formes selon la place disponible.
//
// La même nouvelle, dite au même endroit dans la page, avec la même couleur :
// quelqu'un qui l'a lue une fois la reconnaît partout et n'a pas à la relire.
// L'ambre plutôt que le rouge — c'est une déception, pas un danger.

/** Barre fine, en tête de chaque page de l'espace encadrant. */
export function BarreReport() {
  return (
    <div
      data-report="barre"
      role="status"
      className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm"
    >
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-baseline gap-2 flex-wrap">
        <span className="font-semibold">⚠️ {TITRE}.</span>
        <span className="text-amber-800">{QUAND}</span>
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
      className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-900"
    >
      <h2 className="font-bold">⚠️ {TITRE}</h2>
      <p className="text-sm mt-1">{RESUME}</p>
      {precision && <p className="text-sm mt-1.5 font-medium">{precision}</p>}
      <p className="text-sm mt-1.5 text-amber-800">{QUAND}</p>
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
      className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 sm:p-6 text-amber-950"
    >
      <h2 className="text-xl sm:text-2xl font-bold">⚠️ {TITRE}</h2>
      <div className="mt-3 space-y-2.5 text-sm sm:text-base leading-relaxed">
        {MESSAGE.map((paragraphe) => (
          <p key={paragraphe}>{paragraphe}</p>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-amber-300 text-sm">
        <div className="font-semibold">{signature}</div>
        <div className="text-amber-800">{SIGNATURE_ROLE}</div>
      </div>
    </section>
  );
}
