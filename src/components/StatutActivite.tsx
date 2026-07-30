import { PUBLIC_LABELS, ROLE_ACTIVITE_LABELS, TYPE_LABELS, roleEstActif } from "@/lib/roles";

const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

// Plage horaire : « 9h45 » ou « 9h45 → 10h45 » si l'heure de fin est connue
export function Horaire({ debut, fin }: { debut: string; fin?: string | null }) {
  return (
    <span className="font-mono text-xs sm:text-sm bg-fsy-light text-fsy-dark rounded px-2 py-0.5 whitespace-nowrap">
      {fmtHeure.format(new Date(debut))}
      {fin && <span className="hidden sm:inline"> → {fmtHeure.format(new Date(fin))}</span>}
    </span>
  );
}

// Rôle attendu de l'utilisateur pour l'activité (manuel de l'encadrant).
// Mis en évidence quand il engage une responsabilité directe.
export function BadgeRole({ role }: { role: string | null }) {
  if (!role) return null;
  const actif = roleEstActif(role);
  return (
    <span
      className={`text-xs rounded-full px-2 py-0.5 font-medium ${
        actif ? "bg-fsy text-white" : "bg-slate-100 text-slate-500"
      }`}
    >
      {actif && "★ "}
      {ROLE_ACTIVITE_LABELS[role] ?? role}
    </span>
  );
}

// Badges de statut, d'organisation et de public ciblé
export function BadgesActivite({
  statut,
  publicCible,
  type,
  pourEncadrants,
}: {
  statut: string;
  publicCible?: string;
  type?: string;
  pourEncadrants?: boolean;
}) {
  return (
    <>
      {pourEncadrants && (
        <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">
          Encadrants
        </span>
      )}
      {(type === "PAR_GROUPE" || type === "PAR_COMPAGNIE") && (
        <span className="text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">
          {TYPE_LABELS[type]}
        </span>
      )}
      {statut === "A_CONFIRMER" && (
        <span
          className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5"
          title="Horaire provisoire — à confirmer par les coordinateurs"
        >
          À confirmer
        </span>
      )}
      {statut === "ANNULE" && (
        <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
          Annulée
        </span>
      )}
      {statut === "MODIFIE" && (
        <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
          Modifiée
        </span>
      )}
      {publicCible && publicCible !== "TOUS" && (
        <span
          className={`text-xs rounded-full px-2 py-0.5 ${
            publicCible === "GARCONS"
              ? "bg-blue-100 text-blue-700"
              : "bg-pink-100 text-pink-700"
          }`}
        >
          {PUBLIC_LABELS[publicCible]}
        </span>
      )}
    </>
  );
}
