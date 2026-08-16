import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import {
  CODE_SPECIMEN,
  MENTIONS,
  faitsSpecimen,
  lireFaits,
  mention,
  phraseCV,
  RAPPORTS_POSSIBLES,
  SEUIL_RIGUEUR,
} from "@/lib/attestations";
import { DetailAttestation } from "@/components/Attestation";
import { AttestationSelonModele, apercuDuModele } from "@/components/AttestationSelonModele";
import { ChoixModeleAttestation } from "@/components/ChoixModeleAttestation";
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
  // pas une surprise le dernier jour — et le document lui-même, au nom de la
  // personne, pour donner envie de l'obtenir. Le couple dirigeant délivre mais
  // n'en reçoit pas : pas d'aperçu à son nom.
  if (!attestation) {
    const manquants = Math.max(0, SEUIL_RIGUEUR - mesRapports);
    const apercuPersonnel = user.role !== "DIRIGEANT";
    return (
      <div className="space-y-4">
        <StyleImpression />
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold">🎓 Mon attestation</h1>
          <p className="text-slate-500 text-sm">
            Elle sera délivrée par le couple dirigeant à la clôture de la conférence.
          </p>
        </div>

        <section className="bg-white rounded-xl shadow-sm p-4 max-w-xl">
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

        <ChoixModeleAttestation modeleActuel={user.modeleAttestation} />

        {/* L'aperçu au nom de la personne, dans le design qu'elle a choisi,
            avec la mention Excellence en ligne de mire. Barré SPÉCIMEN et
            porteur du code de démonstration : rien à en faire d'autre que
            d'avoir envie du vrai. */}
        {apercuPersonnel && (
          <section>
            <h2 className="font-bold">Votre attestation, telle qu'elle vous sera remise</h2>
            <p className="text-sm text-slate-500 mt-0.5 mb-3 max-w-xl">
              Aperçu à votre nom, dans le design choisi ci-dessus, avec la mention Excellence —
              celle que visent {RAPPORTS_POSSIBLES} rapports sur {RAPPORTS_POSSIBLES}. Les
              chiffres sont fictifs jusqu'à la remise : les vôtres y seront figés à la clôture.
            </p>
            <Apercu {...apercuDuModele(user.modeleAttestation)}>
              <AttestationSelonModele
                modele={user.modeleAttestation}
                donnees={{
                  code: CODE_SPECIMEN,
                  role: user.role,
                  sexe: user.sexe,
                  mention: MENTIONS.EXCELLENCE.cle,
                  faits: { ...faitsSpecimen(), nomComplet: `${user.prenom} ${user.nom}` },
                  delivreeLe: new Date(),
                  revoqueeLe: null,
                  specimen: true,
                }}
              />
            </Apercu>
          </section>
        )}
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

      <ChoixModeleAttestation modeleActuel={user.modeleAttestation} />

      {/* Le document lui-même, dans le design choisi. À l'écran il est
          réduit ; à l'impression il est à taille réelle. */}
      <Apercu {...apercuDuModele(user.modeleAttestation)}>
        <AttestationSelonModele
          modele={user.modeleAttestation}
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
