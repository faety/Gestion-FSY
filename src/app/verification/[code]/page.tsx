import Link from "next/link";
import { prisma } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { CODE_SPECIMEN, CONFERENCE, lireFaits, mention } from "@/lib/attestations";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Vérification d'une attestation",
  description:
    "Vérifier l'authenticité d'une attestation d'encadrement délivrée par la conférence FSY 2026 Abidjan Ouest.",
};

const fmtLong = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

// Page publique : un employeur saisit le code figurant sur le document, ou scanne
// le QR, et obtient une réponse claire. Aucune donnée de contact n'y figure —
// seulement ce que l'attestation affirme déjà.
export default async function VerificationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const propre = decodeURIComponent(code).trim().toUpperCase();

  const attestation = await prisma.attestation.findUnique({
    where: { code: propre },
    include: { user: { select: { role: true } } },
  });

  const Cadre = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Logo taille={44} />
          <div>
            <div className="font-bold text-fsy-dark">FSY 2026 — Abidjan Ouest</div>
            <div className="text-sm text-slate-500">Vérification d'attestation</div>
          </div>
        </div>
        {children}
        <p className="text-xs text-slate-400 mt-6 text-center">
          <Link href="/" className="hover:text-fsy">
            2026.fsy.ci
          </Link>{" "}
          · Conférence pour la jeunesse, {CONFERENCE.du} au {CONFERENCE.au}
        </p>
      </div>
    </main>
  );

  // Le code réservé au spécimen ne prétend rien : il explique. C'est ce que voit
  // le couple dirigeant quand il scanne le document de démonstration.
  if (propre === CODE_SPECIMEN) {
    return (
      <Cadre>
        <div className="bg-white rounded-2xl shadow-sm p-6 border-t-4 border-amber-400">
          <div className="text-5xl text-center">📄</div>
          <h1 className="text-xl font-bold mt-3 text-center">Spécimen</h1>
          <p className="text-slate-600 mt-3 text-sm leading-relaxed">
            Ce code correspond au <strong>modèle de démonstration</strong> de l'attestation
            d'encadrement, et non à une personne. Une attestation véritable affiche ici le nom
            de son titulaire, la fonction qu'il a exercée, les effectifs dont il a eu la
            charge, le nombre de comptes rendus quotidiens qu'il a remis, et la date de
            délivrance.
          </p>
          <p className="text-slate-500 mt-3 text-sm">
            Le document correspondant porte la mention SPÉCIMEN en travers de la page.
          </p>
        </div>
      </Cadre>
    );
  }

  if (!attestation) {
    return (
      <Cadre>
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <div className="text-5xl">❓</div>
          <h1 className="text-xl font-bold mt-3">Code inconnu</h1>
          <p className="text-slate-600 mt-2 text-sm">
            Aucune attestation ne correspond au code{" "}
            <span className="font-mono font-medium">{propre}</span>. Vérifiez la saisie — le code
            comporte huit caractères, séparés par un tiret.
          </p>
        </div>
      </Cadre>
    );
  }

  if (attestation.revoqueeLe) {
    return (
      <Cadre>
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center border-t-4 border-red-500">
          <div className="text-5xl">⛔</div>
          <h1 className="text-xl font-bold mt-3">Attestation révoquée</h1>
          <p className="text-slate-600 mt-2 text-sm">
            Ce document n'est plus valable depuis le {fmtLong.format(attestation.revoqueeLe)}.
          </p>
          <p className="text-slate-500 mt-1 text-sm">
            Motif : {attestation.motifRevocation ?? "non précisé"}
          </p>
        </div>
      </Cadre>
    );
  }

  const faits = lireFaits(attestation.faits);
  const m = mention(attestation.mention);

  const lignes: [string, string][] = [
    ["Fonction exercée", ROLE_LABELS[attestation.role as Role] ?? attestation.role],
    ...(faits.compagnie ? ([["Compagnie dirigée", faits.compagnie]] as [string, string][]) : []),
    ...(faits.groupes.length > 0
      ? ([["Groupe encadré", faits.groupes.join(", ")]] as [string, string][])
      : []),
    ...(faits.jeunesEncadres > 0
      ? ([["Jeunes sous sa responsabilité", String(faits.jeunesEncadres)]] as [string, string][])
      : []),
    ["Conférence", `${CONFERENCE.nom}, du ${CONFERENCE.du} au ${CONFERENCE.au}`],
    [
      "Comptes rendus quotidiens remis",
      `${faits.rapportsRemis} sur ${faits.rapportsPossibles}`,
    ],
    ...(faits.pointagesValides > 0
      ? ([["Présences validées", String(faits.pointagesValides)]] as [string, string][])
      : []),
    ...(faits.responsabilitesCars.length > 0
      ? ([["Pointages sous sa charge", faits.responsabilitesCars.join(" · ")]] as [
          string,
          string,
        ][])
      : []),
    ["Délivrée le", fmtLong.format(attestation.delivreeLe)],
  ];

  return (
    <Cadre>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border-t-4 border-green-500">
        <div className="p-6 text-center border-b border-slate-100">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-bold mt-3">Attestation authentique</h1>
          <p className="text-2xl font-bold text-fsy-dark mt-3">{faits.nomComplet}</p>
          {m && (
            <div
              className={`inline-block mt-2 rounded-full px-4 py-1 text-sm font-semibold ${
                m.couleur === "amber"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-fsy-light text-fsy-dark"
              }`}
            >
              {m.label}
            </div>
          )}
        </div>

        <dl className="divide-y divide-slate-100 px-6">
          {lignes.map(([k, v]) => (
            <div key={k} className="py-3 flex justify-between gap-4 text-sm">
              <dt className="text-slate-500 shrink-0">{k}</dt>
              <dd className="font-medium text-right">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="bg-slate-50 px-6 py-4 text-xs text-slate-500 leading-relaxed">
          Document délivré par le couple dirigeant de la conférence. Les chiffres ci-dessus sont
          ceux constatés dans l'application de gestion au moment de la délivrance ; ils n'ont pas
          été modifiés depuis. Code de vérification{" "}
          <span className="font-mono font-medium">{attestation.code}</span>.
        </div>
      </div>
    </Cadre>
  );
}
