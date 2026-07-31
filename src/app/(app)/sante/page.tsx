import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { voitToutesLesAlertes } from "@/lib/roles";
import { estAttendu } from "@/lib/criteres";
import { RechercheAlertes } from "@/components/RechercheAlertes";

export const metadata = { title: "Santé et alimentation" };

// Liste complète des jeunes signalant un problème de santé ou une contrainte
// alimentaire, tous groupes confondus.
//
// Réservée à ceux qui répondent de la conférence entière — couple dirigeant,
// coordinateurs principaux — et aux adjoints désignés au bien-être. Ailleurs
// dans l'application, chacun ne voit que son périmètre : ces informations
// touchent à la santé de mineurs et ne se consultent pas par curiosité.
export default async function SantePage() {
  const user = await exigerUtilisateur();
  if (!voitToutesLesAlertes(user)) redirect("/accueil");

  const jeunes = await prisma.jeune.findMany({
    where: {
      OR: [
        { medical: { not: null } },
        { alimentaire: { not: null } },
      ],
    },
    include: {
      pieu: { select: { nom: true } },
      groupe: {
        select: {
          nom: true,
          conseiller: { select: { prenom: true, nom: true, telephone: true } },
          compagnie: { select: { nom: true } },
        },
      },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  // Les inscriptions annulées ne viennent pas : les faire figurer sur une liste
  // de vigilance ferait chercher quelqu'un qui n'est pas là.
  const attendus = jeunes.filter((j) => estAttendu(j.statutInscription));

  const fiches = attendus.map((j) => ({
    id: j.id,
    nom: `${j.prenom} ${j.nom}`,
    sexe: j.sexe,
    medical: j.medical,
    alimentaire: j.alimentaire,
    groupe: j.groupe?.nom ?? null,
    compagnie: j.groupe?.compagnie?.nom ?? null,
    pieu: j.pieu.nom,
    conseiller: j.groupe?.conseiller
      ? {
          nom: `${j.groupe.conseiller.prenom} ${j.groupe.conseiller.nom}`,
          telephone: j.groupe.conseiller.telephone,
        }
      : null,
    // Le contact d'urgence n'est pas affiché d'emblée : il ne sert qu'en cas de
    // besoin, et une liste de soixante numéros de parents à l'écran serait une
    // exposition inutile.
    contact: j.contactNom
      ? { nom: j.contactNom, telephone: j.contactTelephone }
      : null,
  }));

  const avecMedical = fiches.filter((f) => f.medical).length;
  const avecAlimentaire = fiches.filter((f) => f.alimentaire).length;
  const sansGroupe = fiches.filter((f) => !f.groupe).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">⚕️ Santé et alimentation</h1>
        <p className="text-slate-500 text-sm">
          Tous les jeunes attendus qui signalent un problème de santé ou une contrainte
          alimentaire, quel que soit leur groupe.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { valeur: fiches.length, label: "jeunes concernés" },
          { valeur: avecMedical, label: "alertes médicales" },
          { valeur: avecAlimentaire, label: "contraintes alimentaires" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-3">
            <div className="text-2xl font-bold text-fsy">{s.valeur}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {sansGroupe > 0 && (
        <p className="text-sm bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">
          ⚠️ <strong>{sansGroupe}</strong> de ces jeunes n'ont pas de groupe : personne n'est
          nommément chargé de veiller sur eux.
        </p>
      )}

      <p className="text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
        Ces renseignements sont ceux du formulaire d'inscription, écrits par les familles.
        Ils concernent des mineurs : ne les recopiez pas ailleurs, et n'en parlez qu'à qui
        en a besoin pour agir.
      </p>

      <RechercheAlertes fiches={fiches} />
    </div>
  );
}
