import { urlPhoto } from "@/lib/cloudinary";

// Portrait d'un encadrant, ou ses initiales à défaut.
//
// Les initiales ne sont pas un pis-aller : tant que la photo n'est pas déposée,
// elles restent lisibles et colorées de façon stable, si bien qu'une liste ne
// devient jamais une colonne de silhouettes grises interchangeables.

const initiales = (prenom: string, nom: string) =>
  `${prenom.trim()[0] ?? ""}${nom.trim()[0] ?? ""}`.toUpperCase() || "?";

// Teinte tirée du nom : la même personne garde toujours la même couleur.
const TEINTES = [
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
];

const teinte = (cle: string) => {
  let n = 0;
  for (const c of cle) n = (n + c.charCodeAt(0)) % TEINTES.length;
  return TEINTES[n];
};

export function Avatar({
  prenom,
  nom,
  photoPublicId,
  taille = 40,
  className = "",
}: {
  prenom: string;
  nom: string;
  photoPublicId?: string | null;
  taille?: number;
  className?: string;
}) {
  // La vignette est demandée au double de la taille affichée, pour rester nette
  // sur les écrans de téléphone.
  const url = photoPublicId ? urlPhoto(photoPublicId, taille * 2) : null;

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`${prenom} ${nom}`}
        width={taille}
        height={taille}
        // Chargées à la demande : soixante-dix vignettes d'un coup pèseraient
        // sur un téléphone, alors que seules celles à l'écran comptent.
        loading="lazy"
        decoding="async"
        className={`rounded-full object-cover shrink-0 bg-slate-100 ${className}`}
        style={{ width: taille, height: taille }}
      />
    );
  }

  return (
    <span
      className={`rounded-full inline-flex items-center justify-center font-semibold shrink-0 ${teinte(
        `${prenom}${nom}`
      )} ${className}`}
      style={{ width: taille, height: taille, fontSize: Math.max(10, taille * 0.38) }}
      aria-label={`${prenom} ${nom}`}
    >
      {initiales(prenom, nom)}
    </span>
  );
}
