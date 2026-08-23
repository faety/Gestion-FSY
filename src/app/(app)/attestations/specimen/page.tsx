import Link from "next/link";
import { exigerUtilisateur } from "@/lib/auth";
import {
  CODE_SPECIMEN,
  MENTIONS,
  MODELES,
  ROLES_ATTESTABLES,
  faitsSpecimen,
  modeleValide,
} from "@/lib/attestations";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { AttestationSelonModele, apercuDuModele } from "@/components/AttestationSelonModele";
import { SITE_AFFICHE } from "@/lib/site";
import { Apercu, StyleImpression } from "@/components/FeuilleImprimable";
import { ImprimerAttestation } from "@/components/OutilsAttestation";

export const metadata = { title: "Spécimen d'attestation" };

// Ouvert à tous les encadrants : chacun choisit le design de son attestation,
// il faut donc pouvoir les regarder en vrai. Les données sont fictives et le
// document est barré SPÉCIMEN — il n'atteste rien.
export default async function SpecimenPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; modele?: string }>;
}) {
  const user = await exigerUtilisateur();

  const { role: roleDemande, modele: modeleDemande } = await searchParams;
  const estDirigeant = user.role === "DIRIGEANT";
  // Le couple prévisualise le document de n'importe quelle fonction ; un
  // encadrant voit le sien, c'est celui qu'il choisit.
  const role = estDirigeant
    ? ROLES_ATTESTABLES.includes(roleDemande as Role)
      ? (roleDemande as string)
      : "CONSEILLER"
    : user.role;
  const modele = modeleDemande && modeleValide(modeleDemande) ? modeleDemande : "CLASSIQUE";
  const feuille = apercuDuModele(modele);

  const lienAvec = (params: Record<string, string>) => {
    const q = new URLSearchParams({ role, modele, ...params });
    return `/attestations/specimen?${q}`;
  };

  return (
    <div className="space-y-4">
      <StyleImpression paysage={feuille.paysage} />

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
          <div className="text-sm font-bold mb-2">Design</div>
          <div className="flex flex-wrap gap-2">
            {MODELES.map((m) => (
              <Link
                key={m.cle}
                href={lienAvec({ modele: m.cle })}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  m.cle === modele
                    ? "bg-fsy text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {m.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Le choix se fait depuis la page{" "}
            <Link href="/attestation" className="underline">
              Mon attestation
            </Link>{" "}
            — c'est lui qui sera imprimé à la clôture.
          </p>
        </div>

        {estDirigeant && (
          <div>
            <div className="text-sm font-bold mb-2">Voir le spécimen pour</div>
            <div className="flex flex-wrap gap-2">
              {ROLES_ATTESTABLES.map((r) => (
                <Link
                  key={r}
                  href={lienAvec({ role: r })}
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
        )}

        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
          Le QR mène à <span className="font-mono">{SITE_AFFICHE}/verification/{CODE_SPECIMEN}</span>,
          qui répond « spécimen » — jamais « authentique ». Scannez-le pour voir ce qu'un
          employeur obtiendra.
        </p>

        <ImprimerAttestation />
      </section>

      <Apercu hauteurMm={feuille.hauteurMm} largeurMm={feuille.largeurMm}>
        <AttestationSelonModele
          modele={modele}
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
