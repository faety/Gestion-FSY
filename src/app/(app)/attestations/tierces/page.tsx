import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import {
  ATTENDUS,
  GENRES,
  lireFaitsTiers,
  nature as natureDe,
  type CleGenre,
} from "@/lib/attestations-tierces";
import {
  CorrigerAttestationTierce,
  FormulaireAttestationTierce,
  RevoquerAttestationTierce,
} from "@/components/OutilsAttestationTierce";

export const metadata = { title: "Attestations des fournisseurs et bénévoles" };

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

// Les attestations de ceux qui n'ont pas de compte : les fournisseurs, et les
// bénévoles de l'équipe logistique. Le couple dirigeant saisit, délivre,
// imprime, et repart avec les documents sous le bras.
export default async function AttestationsTiercesPage() {
  const user = await exigerUtilisateur();
  if (user.role !== "DIRIGEANT") redirect("/accueil");

  const toutes = await prisma.attestationTierce.findMany({
    orderBy: [{ revoqueeLe: "asc" }, { delivreeLe: "asc" }],
  });
  const valides = toutes.filter((a) => !a.revoqueeLe);

  // Le pense-bête : ce que le couple a annoncé vouloir délivrer, et ce qui
  // manque encore. Un fournisseur oublié le samedi soir ne se rattrape plus.
  const reste = ATTENDUS.map((a) => ({
    ...a,
    fait: valides.filter((v) => v.nature === a.nature && v.genre === "FOURNISSEUR").length,
  })).filter((a) => a.fait < a.combien);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🤝 Fournisseurs et bénévoles</h1>
        <p className="text-slate-500 text-sm">
          Les attestations de ceux qui n&apos;ont pas de compte dans l&apos;application : les
          prestataires de la conférence, et les bénévoles de l&apos;équipe logistique. Le
          document porte le même code de vérification que les attestations d&apos;encadrement.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/attestations"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium shadow-sm"
        >
          ← Attestations d&apos;encadrement
        </Link>
        <Link
          href="/attestations/tierces/impression"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium shadow-sm"
        >
          🖨️ Imprimer {valides.length > 0 && `(${valides.length})`}
        </Link>
      </div>

      {reste.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          <p className="font-medium">Il manque encore :</p>
          <ul className="mt-1 space-y-0.5">
            {reste.map((r) => (
              <li key={r.nature}>
                • {r.quoi}
                {r.combien > 1 && ` — ${r.fait} sur ${r.combien}`}
              </li>
            ))}
          </ul>
          <p className="text-xs mt-2">
            Cette liste reprend ce que vous aviez annoncé ; rien n&apos;empêche d&apos;en délivrer
            d&apos;autres, ni d&apos;ignorer une ligne.
          </p>
        </section>
      )}

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">➕ Nouvelle attestation</h2>
        <p className="text-sm text-slate-500 mt-0.5 mb-3">
          Deux champs suffisent : la nature de la prestation et le nom. Le reste s&apos;écrit
          tout seul, et se retouche si vous le voulez.
        </p>
        <FormulaireAttestationTierce />
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">
          📄 Délivrées ({valides.length}
          {toutes.length !== valides.length && ` — ${toutes.length - valides.length} révoquée(s)`})
        </h2>
        {toutes.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">
            Aucune pour l&apos;instant. La première se saisit ci-dessus.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 mt-2">
            {toutes.map((a) => {
              const f = lireFaitsTiers(a.faits);
              const n = natureDe(a.nature);
              const g = GENRES[a.genre as CleGenre] ?? GENRES.FOURNISSEUR;
              return (
                <li key={a.id} className={`py-3 ${a.revoqueeLe ? "opacity-55" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {n?.icone} {f.beneficiaire}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {g.titreCourt} · {n?.label ?? a.nature}
                        {f.representant && ` · ${f.representant}`}
                        {f.fonction && ` · ${f.fonction}`}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        <span className="font-mono">{a.code}</span> · délivrée le{" "}
                        {fmt.format(a.delivreeLe)}
                        {a.modifieeLe && ` · corrigée le ${fmt.format(a.modifieeLe)}`}
                        {a.revoqueeLe &&
                          ` · révoquée le ${fmt.format(a.revoqueeLe)} (${a.motifRevocation})`}
                      </div>
                    </div>
                    {!a.revoqueeLe && (
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {/* Une seule feuille : le fournisseur passe prendre la
                            sienne, on n'imprime pas tout le lot pour lui. */}
                        <Link
                          href={`/attestations/tierces/impression?id=${a.id}`}
                          className="text-xs text-slate-500 hover:text-fsy underline"
                        >
                          Imprimer
                        </Link>
                        <RevoquerAttestationTierce id={a.id} nom={f.beneficiaire} />
                      </div>
                    )}
                  </div>
                  {!a.revoqueeLe && (
                    <CorrigerAttestationTierce
                      attestation={{
                        id: a.id,
                        code: a.code,
                        genre: a.genre,
                        nature: a.nature,
                        beneficiaire: f.beneficiaire,
                        representant: f.representant ?? "",
                        fonction: f.fonction ?? "",
                        objet: f.objet,
                        precisions: f.precisions.join("\n"),
                        periode: f.periode,
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
