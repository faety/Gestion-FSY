import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { ROLE_LABELS, libelleRoleAccorde, type Role } from "@/lib/roles";
import {
  MENTIONS,
  RAPPORTS_POSSIBLES,
  ROLES_ATTESTABLES,
  SEUIL_RIGUEUR,
  SIGNATAIRES,
  calculerMention,
  lireFaits,
  mention,
} from "@/lib/attestations";
import { signaturesDuCouple } from "@/lib/signatures";
import { DelivrerAttestations, RevoquerAttestation } from "@/components/OutilsAttestation";
import { PadSignature } from "@/components/PadSignature";
import { CorrectionsRecentes, DemandesNom } from "@/components/DemandesNom";

export const metadata = { title: "Attestations" };

export default async function AttestationsPage() {
  const user = await exigerUtilisateur();
  if (user.role !== "DIRIGEANT") redirect("/accueil");

  const signatures = await signaturesDuCouple();

  const [demandesNom, corrigesRecemment] = await Promise.all([
    prisma.demandeNom.findMany({
      where: { statut: "EN_ATTENTE" },
      orderBy: { creeLe: "asc" },
      include: {
        user: { select: { role: true, sexe: true, attestation: { select: { code: true } } } },
      },
    }),
    // Les corrections acceptées récemment, avec de quoi réimprimer leur feuille.
    prisma.demandeNom.findMany({
      where: { statut: "ACCEPTEE" },
      orderBy: { traiteeLe: "desc" },
      take: 10,
      include: { user: { select: { attestation: { select: { id: true } } } } },
    }),
  ]);
  const fmtCourt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });
  // Journal des vérifications publiques : le couple voit qui scanne quoi, et
  // repère un code inconnu répété — le signe d'un document trafiqué en
  // circulation.
  const [nbScans, derniersScans] = await Promise.all([
    prisma.scanVerification.count(),
    prisma.scanVerification.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const [encadrants, attestations, tierces] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [...ROLES_ATTESTABLES] }, actif: true, valide: true },
      orderBy: [{ role: "asc" }, { nom: "asc" }],
      include: {
        attestation: true,
        rapports: { select: { points: true } },
        groupesDiriges: { select: { _count: { select: { jeunes: true } } } },
      },
    }),
    prisma.attestation.count(),
    prisma.attestationTierce.count({ where: { revoqueeLe: null } }),
  ]);

  const sansAttestation = encadrants.filter((e) => !e.attestation);

  // Un conseiller sans groupe, un adjoint sans compagnie : son attestation dira
  // « un groupe d'adolescents » au lieu de « un groupe de 9 adolescents ». C'est
  // le chiffre qui fait la valeur du document auprès d'un employeur, et les
  // faits sont figés à la délivrance — donc on prévient avant, pas après.
  const sansAffectation = sansAttestation.filter(
    (e) =>
      (e.role === "CONSEILLER" && e.groupesDiriges.length === 0) ||
      (e.role === "ADJOINT" && !e.compagnieId)
  );

  // Répartition prévue si l'on délivrait maintenant : le couple voit d'avance
  // combien de mentions seront décernées.
  const previsions = { EXCELLENCE: 0, RIGUEUR: 0, SANS: 0 };
  for (const e of sansAttestation) {
    const points = e.rapports.reduce((n, r) => n + r.points, 0);
    previsions[calculerMention(e.rapports.length, points) ?? "SANS"]++;
  }

  return (
    <div className="space-y-4">
      {/* Les corrections de nom en attente, avant tout le reste : quelqu'un
          attend son document pour un dossier. */}
      <DemandesNom
        demandes={demandesNom.map((d) => ({
          id: d.id,
          ancien: `${d.ancienPrenom} ${d.ancienNom}`,
          nouveau: `${d.prenom} ${d.nom}`,
          motif: d.motif,
          role: libelleRoleAccorde(d.user.role, d.user.sexe),
          code: d.user.attestation?.code ?? null,
          creeLe: fmtCourt.format(d.creeLe),
        }))}
      />

      <CorrectionsRecentes
        corrections={corrigesRecemment.map((d) => ({
          id: d.id,
          nouveau: `${d.prenom} ${d.nom}`,
          ancien: `${d.ancienPrenom} ${d.ancienNom}`,
          attestationId: d.user.attestation?.id ?? null,
          traiteeLe: d.traiteeLe ? fmtCourt.format(d.traiteeLe) : "—",
        }))}
      />

      <div>
        <h1 className="text-2xl font-bold">🎓 Attestations d'encadrement</h1>
        <p className="text-slate-500 text-sm">
          Remises à la clôture aux coordinateurs principaux, aux adjoints et aux conseillers.
          Le couple dirigeant délivre, il ne s'atteste pas lui-même.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/attestations/specimen"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium shadow-sm"
        >
          📄 Voir un spécimen
        </Link>
        <Link
          href="/attestations/impression"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium shadow-sm"
        >
          🖨️ Imprimer en lot {attestations > 0 && `(${attestations})`}
        </Link>
        {/* Ceux qui n'ont pas de compte : traiteurs, transporteur, imprimeur,
            couple logistique et son équipe. Rien de tout cela ne se calcule —
            d'où une page à part, où le couple déclare ce qu'il a constaté. */}
        <Link
          href="/attestations/tierces"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium shadow-sm"
        >
          🤝 Fournisseurs et bénévoles {tierces > 0 && `(${tierces})`}
        </Link>
      </div>

      {/* Les signatures manuscrites du couple, tracées une fois chacune —
          au doigt ou au stylet, éventuellement sur la même tablette — puis
          apposées sur toutes les vraies attestations. */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">✍️ Vos signatures manuscrites</h2>
        <p className="text-sm text-slate-500 mt-0.5 mb-3">
          Chacun signe une fois, au doigt ou au stylet — la tablette peut passer de main en
          main. La signature s&apos;appose sur toutes les attestations, y compris celles déjà
          délivrées ; sans tracé, le document sort avec le nom seul. Le spécimen n&apos;est pas
          concerné.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SIGNATAIRES.map((s) => (
            <PadSignature key={s.nom} nom={s.nom} signatureExistante={signatures[s.nom] ?? null} />
          ))}
        </div>
      </section>

      {/* Qui vérifie quoi : chaque scan de la page publique est consigné. Un
          code inconnu répété = un document trafiqué circule. */}
      {nbScans > 0 && (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold">🔎 Vérifications publiques ({nbScans})</h2>
          <p className="text-sm text-slate-500 mt-0.5 mb-2">
            Les derniers scans de la page de vérification. Un code inconnu qui revient
            souvent mérite l&apos;attention : quelqu&apos;un présente peut-être un document
            trafiqué.
          </p>
          <ul className="divide-y divide-slate-100 text-sm">
            {derniersScans.map((s) => (
              <li key={s.id} className="py-1.5 flex items-center justify-between gap-3">
                <span className="font-mono">{s.code}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {!s.connu && (
                    <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
                      inconnu
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "Africa/Abidjan",
                    }).format(s.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Chiffre valeur={encadrants.length} label="Encadrants concernés" />
          <Chiffre valeur={attestations} label="Déjà délivrées" />
          <Chiffre valeur={previsions.EXCELLENCE} label="Mentions Excellence à venir" />
          <Chiffre valeur={previsions.RIGUEUR} label="Mentions Rigueur à venir" />
        </div>

        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <strong>{MENTIONS.RIGUEUR.label}</strong> : {MENTIONS.RIGUEUR.critere}.{" "}
          <strong>{MENTIONS.EXCELLENCE.label}</strong> : {MENTIONS.EXCELLENCE.critere} et niveau
          d'assiduité « Pilier ». Sans mention, l'attestation est délivrée quand même — c'est la
          semaine donnée qu'elle reconnaît.
        </p>

        {sansAffectation.length > 0 && (
          <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
            ⚠️ <strong>{sansAffectation.length} encadrants</strong> n'ont pas encore de groupe ou de
            compagnie attribués. Leur attestation dira « un groupe d'adolescents » au lieu de
            « un groupe de 9 adolescents » — et ce chiffre ne pourra plus être ajouté après la
            délivrance. Complétez les affectations depuis{" "}
            <Link href="/groupes" className="underline font-medium">
              Groupes
            </Link>{" "}
            avant de délivrer.
          </p>
        )}

        <DelivrerAttestations candidats={sansAttestation.length} />
        <p className="text-xs text-slate-500">
          Les faits sont figés à la délivrance : une attestation ne change plus, même si les
          données évoluent ensuite. Attendez donc la fin de la conférence.
        </p>
      </section>

      <section className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <div className="p-4 pb-0 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bold">Détail par personne</h2>
          <span className="text-sm text-slate-500 print:hidden">
            Chacun retrouve la sienne dans son espace ; pour la cérémonie, imprimez-les toutes
            en une fois.
          </span>
        </div>
        <table className="w-full text-sm mt-2">
          <thead className="text-left text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-3">Nom</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Rapports</th>
              <th className="p-3">Mention</th>
              <th className="p-3">Attestation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {encadrants.map((e) => {
              const points = e.rapports.reduce((n, r) => n + r.points, 0);
              const prevue = calculerMention(e.rapports.length, points);
              const m = e.attestation ? mention(e.attestation.mention) : mention(prevue);
              const faits = e.attestation ? lireFaits(e.attestation.faits) : null;
              return (
                <tr key={e.id}>
                  <td className="p-3">
                    <div className="font-medium">
                      {e.prenom} {e.nom}
                    </div>
                    {faits && faits.jeunesEncadres > 0 && (
                      <div className="text-xs text-slate-400">
                        {faits.jeunesEncadres} jeunes encadrés
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{ROLE_LABELS[e.role as Role] ?? e.role}</td>
                  <td className="p-3">
                    <span
                      className={
                        e.rapports.length >= SEUIL_RIGUEUR ? "text-green-700" : "text-slate-500"
                      }
                    >
                      {e.rapports.length} / {RAPPORTS_POSSIBLES}
                    </span>
                  </td>
                  <td className="p-3">
                    {m ? (
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          m.couleur === "amber"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-fsy-light text-fsy-dark"
                        }`}
                      >
                        {m.label}
                        {!e.attestation && " (prévue)"}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {e.attestation ? (
                      e.attestation.revoqueeLe ? (
                        <span className="text-xs text-red-700">
                          Révoquée — {e.attestation.motifRevocation}
                        </span>
                      ) : (
                        <>
                          <Link
                            href={`/verification/${e.attestation.code}`}
                            className="font-mono text-xs text-fsy hover:underline"
                          >
                            {e.attestation.code}
                          </Link>
                          <div className="print:hidden">
                            <RevoquerAttestation
                              id={e.attestation.id}
                              nom={`${e.prenom} ${e.nom}`}
                            />
                          </div>
                        </>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">à délivrer</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Chiffre({ valeur, label }: { valeur: number; label: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="text-2xl font-bold text-fsy">{valeur}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
