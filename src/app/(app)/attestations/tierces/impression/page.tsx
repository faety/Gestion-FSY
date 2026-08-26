import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { AttestationTierce } from "@/components/AttestationTierce";
import { Apercu, StyleImpression } from "@/components/FeuilleImprimable";
import { ImprimerAttestation } from "@/components/OutilsAttestation";

export const metadata = { title: "Impression — fournisseurs et bénévoles" };

// Toutes ces attestations sont à l'italienne, sur une seule feuille : pas de
// deux passes ici, contrairement au lot des encadrants où deux designs se
// mélangent. Un seul travail d'impression, en A4 paysage.
export default async function ImpressionTiercesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await exigerUtilisateur();
  if (user.role !== "DIRIGEANT") redirect("/accueil");
  const { id } = await searchParams;

  const attestations = await prisma.attestationTierce.findMany({
    where: { revoqueeLe: null, ...(id ? { id } : {}) },
    orderBy: [{ genre: "asc" }, { nature: "asc" }, { delivreeLe: "asc" }],
  });

  if (attestations.length === 0) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-2xl font-bold">🖨️ Fournisseurs et bénévoles</h1>
        <p className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm">
          Aucune attestation à imprimer. Saisissez-en une depuis la page{" "}
          <Link href="/attestations/tierces" className="underline font-medium">
            Fournisseurs et bénévoles
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StyleImpression paysage />

      <div className="print:hidden">
        <h1 className="text-2xl font-bold">🖨️ Fournisseurs et bénévoles</h1>
        <p className="text-slate-500 text-sm">
          {attestations.length} attestation{attestations.length > 1 ? "s" : ""} en cours de
          validité, une feuille chacune. Les révoquées sont écartées.{" "}
          <Link href="/attestations/tierces" className="underline">
            Revenir à la saisie
          </Link>
        </p>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-4 print:hidden space-y-2">
        <ImprimerAttestation />
        <p className="text-xs text-slate-500">
          Impression en A4 paysage, recto simple : la page est déclarée à l&apos;italienne, la
          boîte de dialogue doit afficher « Paysage » d&apos;elle-même. Sur un gros volume,
          imprimez-en une d&apos;abord pour contrôler le réglage.
        </p>
      </section>

      <Apercu hauteurMm={attestations.length * 210} largeurMm={297}>
        {attestations.map((a, i) => (
          <AttestationTierce
            key={a.id}
            derniere={i === attestations.length - 1}
            donnees={{
              code: a.code,
              genre: a.genre,
              nature: a.nature,
              faits: a.faits,
              delivreeLe: a.delivreeLe,
            }}
          />
        ))}
      </Apercu>
    </div>
  );
}
