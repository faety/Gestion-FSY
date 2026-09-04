import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { lireFaits } from "@/lib/attestations";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import {
  AttestationSelonModele,
  estModelePaysage,
  pagesDuModele,
} from "@/components/AttestationSelonModele";
import { Apercu, StyleImpression } from "@/components/FeuilleImprimable";
import { ImprimerAttestation } from "@/components/OutilsAttestation";
import { ChoixAttestations } from "@/components/ChoixAttestations";

export const metadata = { title: "Impression des attestations" };

// Imprimer les attestations de la clôture, en deux passes.
//
// La première sort celles des encadrants qui ont rendu au moins un rapport :
// l'application en répond, le chiffre est sur le document, il n'y a rien à
// décider.
//
// La seconde est un jugement, et elle revient au couple dirigeant. N'avoir
// rendu aucun rapport ne veut pas dire n'avoir rien fait : il y a eu des
// téléphones à plat, des cartes sans données, des conseillers qui ont veillé
// six nuits sans jamais ouvrir l'application. Distinguer ceux-là de qui n'est
// pas venu, l'application ne le peut pas — d'où une liste à cocher, et aucune
// règle automatique. La machine ne tranche pas ce qu'elle ne sait pas.
//
// Le format par défaut donne une feuille par personne : à la remise, on prend
// une pile et on distribue. Le modèle choisi par chacun reste accessible pour
// qui veut son recto-verso bilingue.

const LOTS = {
  rapports: { titre: "Ont rendu au moins un rapport", court: "1. Avec rapport" },
  sans: { titre: "N'ont rendu aucun rapport", court: "2. Sans rapport — à choisir" },
  tous: { titre: "Tout le monde", court: "Tous" },
} as const;

type CleLot = keyof typeof LOTS;

export default async function ImpressionPage({
  searchParams,
}: {
  searchParams: Promise<{ lot?: string; groupe?: string; format?: string; ids?: string }>;
}) {
  const user = await exigerUtilisateur();
  if (user.role !== "DIRIGEANT") redirect("/accueil");
  const params = await searchParams;

  const lot: CleLot = params.lot && params.lot in LOTS ? (params.lot as CleLot) : "rapports";
  // Une feuille par personne, sauf demande contraire : c'est ce qu'on distribue
  // debout, en fin de cérémonie.
  const unePage = params.format !== "choisi";
  const groupe = params.groupe;

  const toutes = await prisma.attestation.findMany({
    where: { revoqueeLe: null },
    include: {
      user: {
        select: { prenom: true, nom: true, sexe: true, role: true, modeleAttestation: true },
      },
    },
    orderBy: [{ role: "asc" }, { user: { nom: "asc" } }],
  });

  if (toutes.length === 0) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-2xl font-bold">🖨️ Impression des attestations</h1>
        <p className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm">
          Aucune attestation n&apos;a encore été délivrée. Revenez ici une fois la remise faite
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

  // Le nombre de rapports est celui figé sur le document à la délivrance, pas
  // un comptage refait aujourd'hui : c'est ce que l'attestation affirme qui
  // décide dans quel lot elle tombe.
  const aRendu = (a: (typeof toutes)[number]) => lireFaits(a.faits).rapportsRemis >= 1;
  const avecRapport = toutes.filter(aRendu);
  const sansRapport = toutes.filter((a) => !aRendu(a));

  // Sélection explicite, cochée à l'écran précédent.
  const choisies = params.ids ? new Set(params.ids.split(",").filter(Boolean)) : null;
  const format = unePage ? "page" : "choisi";

  const Onglets = () => (
    <div className="flex flex-wrap gap-2 print:hidden">
      {(
        [
          ["rapports", avecRapport.length],
          ["sans", sansRapport.length],
          ["tous", toutes.length],
        ] as [CleLot, number][]
      ).map(([cle, n]) => (
        <Link
          key={cle}
          href={`/attestations/impression?lot=${cle}&format=${format}`}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium border transition ${
            !choisies && lot === cle
              ? "bg-fsy text-white border-fsy"
              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {LOTS[cle].court} ({n})
        </Link>
      ))}
    </div>
  );

  const Format = ({ suffixe }: { suffixe: string }) => (
    <div className="flex flex-wrap gap-2 print:hidden items-center">
      <span className="text-xs text-slate-500">Format :</span>
      {(
        [
          ["page", "Une feuille par personne"],
          ["choisi", "Le modèle choisi par chacun"],
        ] as [string, string][]
      ).map(([cle, label]) => (
        <Link
          key={cle}
          href={`/attestations/impression?${suffixe}&format=${cle}`}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
            (cle === "page") === unePage
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );

  // ---------- Deuxième passe : le couple choisit ----------
  if (lot === "sans" && !choisies) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">🖨️ Impression des attestations</h1>
          <p className="text-slate-500 text-sm">
            Deuxième passe : les {sansRapport.length} encadrants dont l&apos;application
            n&apos;a reçu aucun rapport.
          </p>
        </div>

        <Onglets />

        <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div>
            <h2 className="font-bold">Qui était là malgré tout ?</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              N&apos;avoir rendu aucun rapport ne veut pas dire n&apos;avoir rien fait : un
              téléphone à plat, une carte sans données, et six jours de veille ne laissent
              aucune trace ici. L&apos;application ne peut pas les distinguer de quelqu&apos;un
              qui n&apos;est pas venu — vous, si. Cochez ceux qui repartent avec leur
              attestation.
            </p>
          </div>
          {sansRapport.length === 0 ? (
            <p className="text-sm text-slate-500">
              Personne dans ce cas : tous les encadrants ont rendu au moins un rapport.
            </p>
          ) : (
            <ChoixAttestations
              format={format}
              candidats={sansRapport.map((a) => ({
                id: a.id,
                code: a.code,
                nom: `${a.user.prenom} ${a.user.nom}`,
                role: ROLE_LABELS[a.user.role as Role] ?? a.user.role,
              }))}
            />
          )}
        </section>

        <p className="text-xs text-slate-500">
          Ne rien cocher ne révoque rien : les attestations non imprimées restent délivrées et
          valides, et chacun retrouve la sienne dans son espace.
        </p>
      </div>
    );
  }

  // ---------- L'aperçu ----------
  const duLot = choisies
    ? toutes.filter((a) => choisies.has(a.id))
    : lot === "tous"
      ? toutes
      : avecRapport;

  // Le modèle réellement rendu : celui de la personne, ou la feuille unique.
  const modeleDe = (a: (typeof toutes)[number]) =>
    unePage ? "PRESTIGE_FR" : a.user.modeleAttestation;

  // Deux passes d'impression quand les modèles se mélangent : un travail unique
  // mêlant des documents d'une et de deux pages décalerait l'appariement
  // recto-verso, et une page n'a qu'une orientation. Le format « une feuille
  // par personne » ne connaît pas ce problème.
  const estClassique = (a: (typeof toutes)[number]) => pagesDuModele(modeleDe(a)) === 2;
  const nbClassiques = duLot.filter(estClassique).length;
  const nbPrestige = duLot.length - nbClassiques;
  const melange = nbClassiques > 0 && nbPrestige > 0;

  const attestations =
    groupe === "classique"
      ? duLot.filter(estClassique)
      : groupe === "prestige"
        ? duLot.filter((a) => !estClassique(a))
        : duLot;

  const totalPages = attestations.reduce((n, a) => n + pagesDuModele(modeleDe(a)), 0);
  const hauteurMm = attestations.reduce(
    (h, a) => h + (pagesDuModele(modeleDe(a)) === 2 ? 2 * 297 : 210),
    0
  );
  const paysage =
    attestations.length > 0 && attestations.every((a) => estModelePaysage(modeleDe(a)));
  const melangeAffiche =
    attestations.some((a) => estModelePaysage(modeleDe(a))) &&
    attestations.some((a) => !estModelePaysage(modeleDe(a)));

  const suffixe = choisies ? `ids=${[...choisies].join(",")}` : `lot=${lot}`;

  return (
    <div className="space-y-4">
      <StyleImpression paysage={paysage} />

      <div className="print:hidden space-y-3">
        <div>
          <h1 className="text-2xl font-bold">🖨️ Impression des attestations</h1>
          <p className="text-slate-500 text-sm">
            {choisies ? (
              <>
                {/* On arrive ici de deux façons : par la sélection des
                    encadrants sans rapport, ou par la réimpression d'une
                    feuille après correction de nom. La phrase reste neutre —
                    elle serait fausse dans l'autre cas. */}
                {attestations.length} attestation{attestations.length > 1 ? "s" : ""}{" "}
                sélectionnée{attestations.length > 1 ? "s" : ""}, {totalPages} page
                {totalPages > 1 ? "s" : ""} A4.{" "}
                <Link href="/attestations/impression?lot=sans" className="underline">
                  Choisir parmi les encadrants sans rapport
                </Link>
              </>
            ) : (
              <>
                {LOTS[lot].titre} — {attestations.length} document
                {attestations.length > 1 ? "s" : ""}, {totalPages} page
                {totalPages > 1 ? "s" : ""} A4. Les révoquées sont écartées.
              </>
            )}
          </p>
        </div>

        {!choisies && <Onglets />}
        <Format suffixe={suffixe} />
      </div>

      {attestations.length === 0 ? (
        <p className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm print:hidden">
          Personne dans ce lot.
        </p>
      ) : (
        <>
          {melange && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 print:hidden text-sm text-amber-900 space-y-2">
              <p className="font-medium">
                Ce lot mêle les deux familles de modèle : deux impressions séparées.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/attestations/impression?${suffixe}&format=choisi&groupe=classique`}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    groupe === "classique" ? "bg-fsy text-white" : "bg-white border border-amber-300"
                  }`}
                >
                  1. Classiques ({nbClassiques}) — recto-verso
                </Link>
                <Link
                  href={`/attestations/impression?${suffixe}&format=choisi&groupe=prestige`}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    groupe === "prestige" ? "bg-fsy text-white" : "bg-white border border-amber-300"
                  }`}
                >
                  2. Prestige ({nbPrestige}) — recto simple
                </Link>
              </div>
              <p className="text-xs">
                Ou repassez à <strong>une feuille par personne</strong> ci-dessus : un seul
                travail d&apos;impression, une page chacun.
              </p>
            </section>
          )}

          <section className="bg-white rounded-xl shadow-sm p-4 print:hidden space-y-2">
            {melangeAffiche ? (
              <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
                <strong>Choisissez d&apos;abord une des deux passes ci-dessus.</strong> Une page
                d&apos;impression n&apos;a qu&apos;une orientation : les classiques sont en
                portrait, les Prestige à l&apos;italienne. Lancés ensemble, les Prestige
                sortiraient rétrécis dans un coin de la feuille.
              </p>
            ) : (
              <ImprimerAttestation />
            )}
            <p className="text-xs text-slate-500">
              {paysage
                ? "Ce lot s'imprime en A4 paysage, une feuille par attestation : la page est déclarée à l'italienne, la boîte de dialogue doit afficher « Paysage » d'elle-même. Si votre imprimante propose encore Portrait, choisissez Paysage."
                : "Les attestations classiques s'impriment recto-verso, en A4 portrait : le verso anglais de chacune au dos de son recto."}{" "}
              Sur un gros volume, imprimez d&apos;abord une ou deux attestations pour contrôler
              le réglage.
            </p>
          </section>

          <Apercu hauteurMm={hauteurMm} largeurMm={paysage ? 297 : 210}>
            {attestations.map((a, i) => (
              <AttestationSelonModele
                key={a.id}
                modele={modeleDe(a)}
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
        </>
      )}
    </div>
  );
}
