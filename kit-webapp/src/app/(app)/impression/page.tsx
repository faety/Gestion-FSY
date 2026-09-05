import Link from "next/link";
import { APP } from "@/lib/app";
import { exigerUtilisateur } from "@/lib/auth";
import { libelleRoleAccorde } from "@/lib/roles";
import { SITE_AFFICHE } from "@/lib/site";
import { Apercu, StyleImpression } from "@/components/FeuilleImprimable";
import { BoutonImprimer } from "@/components/BoutonImprimer";

export const metadata = { title: "Exemple imprimable" };

// Exemple des deux façons de produire un document :
//   • cette page : HTML composé en millimètres, imprimé depuis le navigateur ;
//   • /api/exemple.pdf : PDF composé côté serveur avec pdf-lib ;
//   • /api/exemple.zip : archive livrée en flux.
export default async function ImpressionPage() {
  const user = await exigerUtilisateur();
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());

  return (
    <div className="space-y-4">
      <StyleImpression paysage />
      <div className="print:hidden flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold flex-1">Exemple imprimable</h1>
        <BoutonImprimer />
        <Link href="/api/exemple.pdf" className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium" target="_blank">
          PDF côté serveur
        </Link>
        <Link href="/api/exemple.zip" className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium">
          Archive ZIP
        </Link>
      </div>

      <Apercu hauteurMm={210} largeurMm={297}>
        <div className="feuille paysage relative border border-slate-200 print:border-0" style={{ padding: "18mm 22mm" }}>
          <div className="absolute inset-0 m-[8mm] border-4 border-double border-marque-sombre/60 pointer-events-none" />
          <p className="text-marque-sombre font-bold tracking-[0.3em] uppercase text-sm">{APP.nom}</p>
          <h2 className="text-4xl font-bold mt-10 text-slate-800">Attestation</h2>
          <p className="mt-8 text-lg leading-relaxed text-slate-700 max-w-[200mm]">
            Il est attesté que <strong>{user.prenom} {user.nom}</strong>, {libelleRoleAccorde(user.role, user.sexe).toLowerCase()},
            a bien utilisé ce document d&apos;exemple pour vérifier que la feuille à l&apos;italienne s&apos;imprime à
            taille réelle, bord à bord, sans rotation.
          </p>
          <div className="absolute bottom-[18mm] left-[22mm] right-[22mm] flex items-end justify-between text-sm text-slate-600">
            <div>
              Fait le {date}
              <br />
              <span className="text-xs text-slate-400">{SITE_AFFICHE}</span>
            </div>
            <div className="text-right">
              <div className="h-14" />
              <div className="border-t border-slate-400 pt-1 w-56">{APP.signature}</div>
            </div>
          </div>
        </div>
      </Apercu>
    </div>
  );
}
