import Link from "next/link";
import { redirect } from "next/navigation";
import { getUtilisateur } from "@/lib/auth";
import { CODE_SPECIMEN, MENTIONS, ROLES_ATTESTABLES, faitsSpecimen } from "@/lib/attestations";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Attestation } from "@/components/Attestation";
import { Apercu, StyleImpression } from "@/components/FeuilleImprimable";
import { ImprimerAttestation } from "@/components/OutilsAttestation";

export const metadata = { title: "Spécimen d'attestation" };

// Le couple dirigeant délivre les attestations mais n'en reçoit pas : sans cette
// page, il signerait un document qu'il n'aurait jamais vu.
export default async function SpecimenPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const user = (await getUtilisateur())!;
  if (user.role !== "DIRIGEANT") redirect("/accueil");

  const { role: demande } = await searchParams;
  const role = ROLES_ATTESTABLES.includes(demande as Role)
    ? (demande as string)
    : "CONSEILLER";

  return (
    <div className="space-y-4">
      <StyleImpression />

      <div className="print:hidden">
        <h1 className="text-2xl font-bold">🎓 Spécimen d'attestation</h1>
        <p className="text-slate-500 text-sm">
          Le document tel qu'il sera remis, avec des données fictives. Il porte la mention
          SPÉCIMEN en travers : un exemplaire imprimé ne peut pas être présenté comme une
          attestation véritable.
        </p>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-4 print:hidden space-y-3">
        <div>
          <div className="text-sm font-bold mb-2">Voir le spécimen pour</div>
          <div className="flex flex-wrap gap-2">
            {ROLES_ATTESTABLES.map((r) => (
              <Link
                key={r}
                href={`/attestations/specimen?role=${r}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  r === role
                    ? "bg-fsy text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {ROLE_LABELS[r]}
              </Link>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
          Le QR mène à <span className="font-mono">2026.fsy.ci/verification/{CODE_SPECIMEN}</span>,
          qui répond « spécimen » — jamais « authentique ». Scannez-le pour voir ce qu'un
          employeur obtiendra.
        </p>

        <ImprimerAttestation />
      </section>

      <Apercu>
        <Attestation
          donnees={{
            code: CODE_SPECIMEN,
            role,
            sexe: user.sexe,
            mention: MENTIONS.EXCELLENCE.cle,
            faits: faitsSpecimen(),
            delivreeLe: new Date(),
            revoqueeLe: null,
            specimen: true,
          }}
        />
      </Apercu>
    </div>
  );
}
