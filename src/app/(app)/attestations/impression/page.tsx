import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { lireFaits } from "@/lib/attestations";
import { Attestation } from "@/components/Attestation";
import { Apercu, StyleImpression } from "@/components/FeuilleImprimable";
import { ImprimerAttestation } from "@/components/OutilsAttestation";

export const metadata = { title: "Impression des attestations" };

// Imprimer 64 attestations une par une depuis l'espace de chacun serait
// impraticable le samedi de la clôture : elles sortent ici d'un seul travail
// d'impression, dans l'ordre où elles seront remises.
export default async function ImpressionPage() {
  const user = (await getUtilisateur())!;
  if (user.role !== "DIRIGEANT") redirect("/accueil");

  const attestations = await prisma.attestation.findMany({
    where: { revoqueeLe: null },
    include: { user: { select: { prenom: true, nom: true, sexe: true, role: true } } },
    orderBy: [{ role: "asc" }, { user: { nom: "asc" } }],
  });

  if (attestations.length === 0) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-2xl font-bold">🖨️ Impression des attestations</h1>
        <p className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm">
          Aucune attestation n'a encore été délivrée. Revenez ici une fois la remise faite
          depuis la page{" "}
          <Link href="/attestations" className="underline font-medium">
            Attestations
          </Link>
          . En attendant, le{" "}
          <Link href="/attestations/specimen" className="underline font-medium">
            spécimen
          </Link>{" "}
          montre à quoi ressemble le document.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StyleImpression />

      <div className="print:hidden">
        <h1 className="text-2xl font-bold">🖨️ Impression des attestations</h1>
        <p className="text-slate-500 text-sm">
          {attestations.length} attestations en cours de validité, soit{" "}
          {attestations.length * 2} pages A4. Les révoquées sont écartées.
        </p>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-4 print:hidden space-y-2">
        <ImprimerAttestation />
        <p className="text-xs text-slate-500">
          Vérifiez que l'impression recto-verso est activée : le verso anglais de chacun
          doit se trouver au dos de son recto. Sur un gros volume, imprimez d'abord une
          seule attestation pour contrôler le réglage.
        </p>
      </section>

      <Apercu feuilles={attestations.length * 2}>
        {attestations.map((a, i) => (
          <Attestation
            key={a.id}
            derniere={i === attestations.length - 1}
            donnees={{
              code: a.code,
              role: a.role,
              sexe: a.user.sexe,
              mention: a.mention,
              faits: lireFaits(a.faits),
              delivreeLe: a.delivreeLe,
              revoqueeLe: a.revoqueeLe,
            }}
          />
        ))}
      </Apercu>
    </div>
  );
}
