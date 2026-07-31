import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { lireFaits, mention, phraseCV, RAPPORTS_POSSIBLES, SEUIL_RIGUEUR } from "@/lib/attestations";
import { Attestation, DetailAttestation } from "@/components/Attestation";
import { Apercu, StyleImpression } from "@/components/FeuilleImprimable";
import { CopierTexte, ImprimerAttestation } from "@/components/OutilsAttestation";

export const metadata = { title: "Mon attestation" };

export default async function MonAttestationPage() {
  const user = await exigerUtilisateur();

  const [attestation, mesRapports] = await Promise.all([
    prisma.attestation.findUnique({ where: { userId: user.id } }),
    prisma.rapportQuotidien.count({ where: { auteurId: user.id } }),
  ]);

  // Avant la délivrance : on montre où l'on en est, pour que la mention ne soit
  // pas une surprise le dernier jour.
  if (!attestation) {
    const manquants = Math.max(0, SEUIL_RIGUEUR - mesRapports);
    return (
      <div className="space-y-4 max-w-xl">
        <div>
          <h1 className="text-2xl font-bold">🎓 Mon attestation</h1>
          <p className="text-slate-500 text-sm">
            Elle sera délivrée par le couple dirigeant à la clôture de la conférence.
          </p>
        </div>

        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold">Où vous en êtes</h2>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-fsy">{mesRapports}</span>
            <span className="text-slate-500">rapports remis sur {RAPPORTS_POSSIBLES}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-fsy rounded-full"
              style={{ width: `${Math.min(100, (mesRapports / RAPPORTS_POSSIBLES) * 100)}%` }}
            />
          </div>
          <p className="text-sm mt-3">
            {mesRapports >= RAPPORTS_POSSIBLES ? (
              <span className="text-amber-800">
                🏆 Vous remplissez les conditions de la <strong>mention Excellence</strong>, sous
                réserve du niveau d'assiduité atteint.
              </span>
            ) : mesRapports >= SEUIL_RIGUEUR ? (
              <span className="text-fsy-dark">
                ⭐ Vous remplissez les conditions de la{" "}
                <strong>mention Rigueur et suivi</strong>.
              </span>
            ) : (
              <span className="text-slate-600">
                Encore <strong>{manquants} rapport{manquants > 1 ? "s" : ""}</strong> pour obtenir
                la mention « Rigueur et suivi ».
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-3">
            L'attestation est remise à tous les encadrants présents jusqu'au bout. Les mentions
            distinguent la régularité du suivi quotidien, elles ne conditionnent pas le document.
          </p>
        </section>
      </div>
    );
  }

  const faits = lireFaits(attestation.faits);
  const m = mention(attestation.mention);

  if (attestation.revoqueeLe) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold">🎓 Mon attestation</h1>
        <p className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          Cette attestation a été révoquée le{" "}
          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(attestation.revoqueeLe)}.
          Motif : {attestation.motifRevocation ?? "non précisé"}. Adressez-vous au couple
          dirigeant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* @page est une règle globale : on ne la pose que sur cette page, pour
          ne pas imposer ce format au rapport final. A4 portrait sans marge :
          c'est le réglage par défaut de toutes les imprimantes, le document
          sort entier sans que personne ait à toucher aux options. */}
      <StyleImpression />

      <div className="print:hidden">
        <h1 className="text-2xl font-bold">🎓 Mon attestation</h1>
        <p className="text-slate-500 text-sm">
          Code de vérification <span className="font-mono font-medium">{attestation.code}</span>{" "}
          {m && <>· {m.label}</>}
        </p>
      </div>

      <div className="print:hidden">
        <ImprimerAttestation />
      </div>

      <section className="bg-white rounded-xl shadow-sm p-4 print:hidden">
        <h2 className="font-bold mb-1">Ce que l'attestation certifie</h2>
        <DetailAttestation role={attestation.role} faits={faits} />
        <p className="text-xs text-slate-500 mt-3">
          Ces chiffres figurent sur la page de vérification, consultable par un employeur avec le
          code ci-dessus. Le document imprimé reste sobre.
        </p>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4 print:hidden">
        <h2 className="font-bold">Pour votre CV</h2>
        <p className="text-sm text-slate-500 mb-2">
          Formulation prête à copier, dans un curriculum vitæ ou sur un profil professionnel.
        </p>
        <CopierTexte texte={phraseCV(attestation.role, user.sexe, faits)} />
      </section>

      {/* Le document lui-même : deux feuilles A4 paysage, recto français et
          verso anglais. À l'écran il est réduit ; à l'impression il est à taille. */}
      <Apercu>
        <Attestation
          donnees={{
            code: attestation.code,
            role: attestation.role,
            sexe: user.sexe,
            mention: attestation.mention,
            faits,
            delivreeLe: attestation.delivreeLe,
            revoqueeLe: attestation.revoqueeLe,
          }}
        />
      </Apercu>
    </div>
  );
}
