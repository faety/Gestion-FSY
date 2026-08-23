import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { lireFaits } from "@/lib/attestations";
import {
  AttestationSelonModele,
  estModelePaysage,
  pagesDuModele,
} from "@/components/AttestationSelonModele";
import { Apercu, StyleImpression } from "@/components/FeuilleImprimable";
import { ImprimerAttestation } from "@/components/OutilsAttestation";

export const metadata = { title: "Impression des attestations" };

// Imprimer 64 attestations une par une depuis l'espace de chacun serait
// impraticable le samedi de la clôture : elles sortent ici d'un seul travail
// d'impression, dans l'ordre où elles seront remises.
export default async function ImpressionPage({
  searchParams,
}: {
  searchParams: Promise<{ groupe?: string }>;
}) {
  const user = await exigerUtilisateur();
  if (user.role !== "DIRIGEANT") redirect("/accueil");
  const { groupe } = await searchParams;

  const toutes = await prisma.attestation.findMany({
    where: { revoqueeLe: null },
    include: {
      user: {
        select: { prenom: true, nom: true, sexe: true, role: true, modeleAttestation: true },
      },
    },
    orderBy: [{ role: "asc" }, { user: { nom: "asc" } }],
  });

  // Deux passes d'impression : mélanger des documents d'une page (Prestige) et
  // de deux pages (classique) dans un même travail recto-verso décalerait
  // l'appariement — le recto d'un document se retrouverait au dos d'un autre.
  const estClassique = (a: (typeof toutes)[number]) =>
    pagesDuModele(a.user.modeleAttestation) === 2;
  const attestations =
    groupe === "classique"
      ? toutes.filter(estClassique)
      : groupe === "prestige"
        ? toutes.filter((a) => !estClassique(a))
        : toutes;

  if (toutes.length === 0) {
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

  // Chaque document sort dans le design que la personne a choisi. Le classique
  // fait deux pages (recto-verso), les Prestige une seule à l'italienne.
  const nbClassiques = toutes.filter(estClassique).length;
  const nbPrestige = toutes.length - nbClassiques;
  const melange = nbClassiques > 0 && nbPrestige > 0;
  const totalPages = attestations.reduce(
    (n, a) => n + pagesDuModele(a.user.modeleAttestation),
    0
  );
  // Hauteur de l'aperçu à l'écran : les feuilles paysage y sont à plat (210 mm).
  const hauteurMm = attestations.reduce(
    (h, a) => h + (pagesDuModele(a.user.modeleAttestation) === 2 ? 2 * 297 : 210),
    0
  );
  // L'orientation de la page suit ce qui est affiché : paysage si le lot ne
  // contient que des Prestige, portrait s'il ne contient que des classiques.
  // Une page ne peut pas avoir deux orientations — c'est la raison des deux
  // passes, et la raison pour laquelle on n'imprime pas un lot mélangé.
  const paysage =
    attestations.length > 0 && attestations.every((a) => estModelePaysage(a.user.modeleAttestation));
  const melangeAffiche =
    attestations.some((a) => estModelePaysage(a.user.modeleAttestation)) &&
    attestations.some((a) => !estModelePaysage(a.user.modeleAttestation));

  return (
    <div className="space-y-4">
      <StyleImpression paysage={paysage} />

      <div className="print:hidden">
        <h1 className="text-2xl font-bold">🖨️ Impression des attestations</h1>
        <p className="text-slate-500 text-sm">
          {toutes.length} attestations en cours de validité ({nbClassiques} au design
          classique, {nbPrestige} au design Prestige). Les révoquées sont écartées.
          {groupe && (
            <>
              {" "}
              Vue en cours : {attestations.length} document{attestations.length > 1 ? "s" : ""},{" "}
              {totalPages} pages A4.
            </>
          )}
        </p>
      </div>

      {/* Deux passes quand les designs sont mélangés : un travail recto-verso
          unique décalerait l'appariement des pages entre les documents. */}
      {melange && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 print:hidden text-sm text-amber-900 space-y-2">
          <p className="font-medium">
            Les deux familles de design se lancent en deux impressions séparées :
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/attestations/impression?groupe=classique"
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                groupe === "classique" ? "bg-fsy text-white" : "bg-white border border-amber-300"
              }`}
            >
              1. Classiques ({nbClassiques}) — recto-verso
            </Link>
            <Link
              href="/attestations/impression?groupe=prestige"
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                groupe === "prestige" ? "bg-fsy text-white" : "bg-white border border-amber-300"
              }`}
            >
              2. Prestige ({nbPrestige}) — recto simple
            </Link>
          </div>
          {!groupe && (
            <p className="text-xs">
              L'aperçu ci-dessous montre tout le lot ; pour imprimer, passez par les deux
              boutons ci-dessus, en réglant l'imprimante en recto-verso pour le premier
              travail et en recto simple pour le second.
            </p>
          )}
        </section>
      )}

      <section className="bg-white rounded-xl shadow-sm p-4 print:hidden space-y-2">
        {melangeAffiche ? (
          <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
            <strong>Choisissez d'abord une des deux passes ci-dessus.</strong> Une page
            d'impression n'a qu'une orientation : les classiques sont en portrait, les
            Prestige à l'italienne. Lancés ensemble, les Prestige sortiraient rétrécis dans un
            coin de la feuille. L'aperçu ci-dessous montre tout le lot, il ne s'imprime pas
            tel quel.
          </p>
        ) : (
          <ImprimerAttestation />
        )}
        <p className="text-xs text-slate-500">
          {paysage
            ? "Ce lot s'imprime en A4 paysage, une feuille par attestation : la page est déclarée à l'italienne, la boîte de dialogue doit afficher « Paysage » d'elle-même. Si votre imprimante propose encore Portrait, choisissez Paysage."
            : "Les attestations classiques s'impriment recto-verso, en A4 portrait : le verso anglais de chacune au dos de son recto."}{" "}
          Sur un gros volume, imprimez d'abord une ou deux attestations pour contrôler le
          réglage.
        </p>
      </section>

      <Apercu hauteurMm={hauteurMm} largeurMm={297}>
        {attestations.map((a, i) => (
          <AttestationSelonModele
            key={a.id}
            modele={a.user.modeleAttestation}
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
