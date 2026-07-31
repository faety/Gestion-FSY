import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { ROLE_LABELS, roleAuMoins, type Role } from "@/lib/roles";
import {
  creerUtilisateur,
  basculerDroit,
  basculerActif,
  affecterCompagnie,
} from "@/lib/actions";
import { DROITS, lireDroits } from "@/lib/roles";
import { CHOSES_A_EFFACER } from "@/lib/remise-a-zero";
import { BoutonAdresse, BoutonMotDePasse, EssaiEmail } from "@/components/OutilsCompte";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { ChangerAppel } from "@/components/ChangerAppel";
import { EMAIL_ACTIF, diagnosticEnvoi, estAdresseDAttente } from "@/lib/email";
import { candidats, doublons, rapprochementBloquant, rapprochementSur } from "@/lib/rapprochement";
import {
  RapprochementInscription,
  type Suggestion,
} from "@/components/RapprochementInscription";
import { DecisionInscription } from "@/components/DecisionInscription";
import { Doublons, type CompteDouble, type PaireDouble } from "@/components/Doublons";
import { RemiseAZero } from "@/components/RemiseAZero";

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" });

export default async function AdminPage() {
  const user = await exigerUtilisateur();
  if (!roleAuMoins(user.role, "COORDINATEUR")) redirect("/accueil");
  const estDirigeant = user.role === "DIRIGEANT";

  const [utilisateurs, compagnies, audit] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { nom: "asc" }],
      include: {
        compagnie: true,
        groupesDiriges: { select: { nom: true } },
        attestation: { select: { code: true } },
        _count: { select: { rapports: true, mouvementsValides: true, affectationsCars: true } },
      },
    }),
    prisma.compagnie.findMany({ orderBy: { nom: "asc" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: true },
    }),
  ]);

  const enAttente = utilisateurs.filter((u) => !u.valide);
  const equipe = utilisateurs.filter((u) => u.valide);
  const sansAdresse = equipe.filter((u) => estAdresseDAttente(u.email)).length;
  const diagnostic = diagnosticEnvoi();
  // Un compte encore sur son mot de passe initial est un compte que son
  // titulaire n'a jamais ouvert : n'importe qui connaissant l'adresse peut le
  // prendre de vitesse, puisque le mot de passe d'amorçage est commun.
  const jamaisOuverts = equipe.filter((u) => u.doitChangerMotDePasse).length;

  // Pour chaque inscription, les comptes déjà en base qui pourraient être la
  // même personne. Le rapprochement se fait sur les mots du nom : les listes
  // officielles inversaient l'ordre du prénom et du nom, et personne ne
  // redonne ses trois prénoms en s'inscrivant.
  const suggestions: Record<string, Suggestion[]> = {};
  for (const u of enAttente) {
    suggestions[u.id] = candidats(u, equipe).map((c) => ({
      id: c.compte.id,
      nom: `${c.compte.prenom} ${c.compte.nom}`,
      email: c.compte.email,
      role: ROLE_LABELS[c.compte.role as Role] ?? c.compte.role,
      detail:
        c.compte.groupesDiriges.map((g) => g.nom).join(", ") ||
        (c.compte.compagnie?.nom ?? "sans affectation"),
      fiabilite: rapprochementSur(c),
    }));
  }
  // Un rapprochement net rend « Valider » suspect : c'est presque toujours la
  // même personne, et le serveur refusera de créer un compte de plus.
  const bloquants = new Set(
    enAttente.filter((u) => candidats(u, equipe).some(rapprochementBloquant)).map((u) => u.id)
  );

  // Doublons déjà installés — deux comptes validés pour une même personne.
  // Le rapprochement des inscriptions ne les voit pas : il ne regarde que ce
  // qui entre, or ceux-là sont entrés avant qu'il existe.
  type Compte = (typeof equipe)[number];
  const fiche = (c: Compte): CompteDouble => ({
    id: c.id,
    nom: `${c.prenom} ${c.nom}`,
    email: c.email,
    adresseDAttente: estAdresseDAttente(c.email),
    role: ROLE_LABELS[c.role as Role] ?? c.role,
    detail:
      c.groupesDiriges.map((g) => g.nom).join(", ") || c.compagnie?.nom || "sans affectation",
    porte: [
      c._count.rapports > 0 && `${c._count.rapports} rapport${c._count.rapports > 1 ? "s" : ""}`,
      c._count.mouvementsValides > 0 && `${c._count.mouvementsValides} pointages`,
      c._count.affectationsCars > 0 && `${c._count.affectationsCars} affectations de car`,
      c.attestation && `attestation ${c.attestation.code}`,
      c.photoPublicId && "photo de profil",
      c.telephone && `☎ ${c.telephone}`,
      lireDroits(c.droitsSupplementaires).length > 0 &&
        `droits : ${lireDroits(c.droitsSupplementaires).join(", ")}`,
    ].filter((x): x is string => Boolean(x)),
    moi: c.id === user.id,
  });
  const paires: PaireDouble[] = doublons(equipe).map((p) => ({
    cle: `${p.a.id}|${p.b.id}`,
    fiabilite: p.fiabilite,
    a: fiche(p.a),
    b: fiche(p.b),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Administration</h1>

      {/* Inscriptions à valider : c'est ce qui bloque quelqu'un, donc en tête */}
      {enAttente.length > 0 && (
        <section className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <h2 className="font-bold text-amber-900">
            ✋ {enAttente.length} inscription{enAttente.length > 1 ? "s" : ""} à vérifier
          </h2>
          <p className="text-sm text-amber-800">
            Ces personnes ne pourront pas se connecter tant que vous n'aurez pas validé.
            Vérifiez qu'elles font bien partie de l'encadrement.
          </p>
          <p className="text-sm text-amber-900 bg-amber-100 rounded-lg p-2.5 mt-2">
            <strong>Rattachez plutôt que de valider.</strong> Quelqu'un qui figure déjà dans les
            listes officielles doit être <em>rattaché</em> à son compte : il garde son appel, sa
            compagnie, son groupe, et se connecte désormais avec sa vraie adresse. Le valider
            comme nouveau lui en donnerait deux, dont un vide. Quand un compte proche existe, la
            validation est refusée d'elle-même — il faut alors dire explicitement qu'il s'agit de
            quelqu'un d'autre.
          </p>
          <ul className="mt-3 space-y-2">
            {enAttente.map((u) => (
              <li
                key={u.id}
                className="bg-white rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="text-sm min-w-0">
                  <div className="font-medium">
                    {u.prenom} {u.nom}
                    <span className="text-slate-400 font-normal">
                      {" "}
                      · {u.sexe === "F" ? "femme" : "homme"} · {ROLE_LABELS[u.role as Role]}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    {u.email}
                    {u.telephone && ` · ${u.telephone}`}
                  </div>
                </div>
                <DecisionInscription
                  inscriptionId={u.id}
                  nom={`${u.prenom} ${u.nom}`}
                  aUnRapprochement={bloquants.has(u.id)}
                />

                <div className="w-full">
                  <RapprochementInscription
                    inscriptionId={u.id}
                    nomInscrit={`${u.prenom} ${u.nom}`}
                    suggestions={suggestions[u.id] ?? []}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Doublons paires={paires} />

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-3">Créer un compte</h2>
        <form action={creerUtilisateur} className="grid sm:grid-cols-3 gap-3 text-sm">
          <input name="prenom" required placeholder="Prénom" className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="nom" required placeholder="Nom" className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="email" type="email" required placeholder="Email" className="rounded-lg border border-slate-300 px-3 py-2" />
          <ChampMotDePasse
            name="motDePasse"
            label="Mot de passe (min. 6)"
            minLength={6}
            autoComplete="new-password"
            etiquetteMasquee
          />
          <select name="sexe" className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
            <option value="M">Homme</option>
            <option value="F">Femme</option>
          </select>
          <select name="role" className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
            <option value="CONSEILLER">Conseiller / Conseillère</option>
            <option value="ADJOINT">Coordinateur adjoint</option>
            <option value="COORDINATEUR">Coordinateur principal</option>
            {estDirigeant && <option value="DIRIGEANT">Couple dirigeant</option>}
          </select>
          <select name="compagnieId" className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
            <option value="">Compagnie (adjoints uniquement)</option>
            {compagnies.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <button className="bg-fsy text-white rounded-lg px-4 py-2 font-medium hover:bg-fsy-dark sm:col-span-2">
            Créer le compte
          </button>
        </form>
      </section>

      {jamaisOuverts > 0 && (
        <section className="bg-red-50 border border-red-300 rounded-xl p-4">
          <h2 className="font-bold text-red-900">
            🔐 {jamaisOuverts} compte{jamaisOuverts > 1 ? "s" : ""} jamais ouvert
            {jamaisOuverts > 1 ? "s" : ""}
          </h2>
          <p className="text-sm text-red-800 mt-1">
            Ces personnes n'ont pas encore choisi leur mot de passe : le leur est celui
            distribué au départ, commun à tous. Tant qu'elles ne se connectent pas, quelqu'un
            qui devine leur adresse peut prendre leur compte de vitesse et les en exclure.
          </p>
          <p className="text-sm text-red-800 mt-2">
            Demandez-leur d'ouvrir l'application et de choisir un mot de passe. Pour celles qui
            ne le feront pas avant le 3 août, utilisez « Mot de passe oublié » dans le tableau
            ci-dessous : cela remplace le mot de passe commun par un provisoire propre à
            chacune.
          </p>
        </section>
      )}

      {/* Envoi d'e-mails : tant que des comptes portent un identifiant
          d'attente, le « mot de passe oublié » ne peut pas les atteindre. Autant
          le dire ici, avec le compte exact. */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div>
          <h2 className="font-bold">✉️ Envoi d'e-mails</h2>
          <p className="text-sm text-slate-500">
            Sert au lien « mot de passe oublié » et à prévenir une personne dont l'inscription
            vient d'être validée.
          </p>
        </div>

        <div
          className={`text-sm rounded-lg p-3 border ${
            EMAIL_ACTIF
              ? "bg-green-50 border-green-200 text-green-900"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          {EMAIL_ACTIF ? (
            <>
              ✅ Configuré. Expéditeur lu :{" "}
              <span className="font-mono bg-white/70 rounded px-1.5 py-0.5">
                {diagnostic.expediteur}
              </span>
            </>
          ) : (
            <>
              <strong>Non configuré.</strong> Manquant :{" "}
              {[
                !diagnostic.clefPresente && "RESEND_API_KEY",
                !diagnostic.expediteur && "EMAIL_EXPEDITEUR",
              ]
                .filter(Boolean)
                .join(" et ")}
              . Après les avoir ajoutées dans Vercel, <strong>redéployez</strong> : une
              variable d'environnement ne s'applique qu'aux déploiements suivants. En
              attendant, le mot de passe oublié reste manuel — le bouton dans le tableau.
            </>
          )}
        </div>

        {diagnostic.soucis.length > 0 && (
          <ul className="text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 space-y-1">
            {diagnostic.soucis.map((s) => (
              <li key={s}>⚠️ {s}</li>
            ))}
          </ul>
        )}

        <details className="text-sm text-slate-600">
          <summary className="cursor-pointer font-medium">Un envoi échoue ?</summary>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>
              <strong>Avez-vous redéployé</strong> depuis l'ajout des variables ? Vercel ne
              les applique qu'aux déploiements suivants — c'est la cause la plus fréquente.
            </li>
            <li>
              Le domaine est-il marqué <strong>« Verified »</strong> chez Resend ? Les
              enregistrements DNS posés ne suffisent pas : il faut cliquer sur Verify.
            </li>
            <li>
              La valeur d'<code>EMAIL_EXPEDITEUR</code> a-t-elle été saisie{" "}
              <strong>sans guillemets</strong> ? Comparez-la avec ce qui est affiché ci-dessus.
            </li>
            <li>
              Le destinataire n'a <strong>rien à déclarer chez Resend</strong> : seul le
              domaine d'expédition s'y vérifie, jamais les adresses à qui l'on écrit.
            </li>
          </ol>
        </details>

        {sansAdresse > 0 && (
          <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
            ⚠️ <strong>{sansAdresse} comptes</strong> sur {equipe.length} portent encore un
            identifiant fabriqué à partir du nom (<span className="font-mono">@fsy2026.ci</span>).
            Aucun message ne peut y arriver. Chacun peut enregistrer sa vraie adresse depuis
            « Mon mot de passe » ; sinon, saisissez-la ici avec « Adresse à renseigner ».
          </p>
        )}

        <EssaiEmail actif={EMAIL_ACTIF} monEmail={user.email} />
      </section>

      {estDirigeant && <RemiseAZero choses={CHOSES_A_EFFACER} />}

      <section className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <h2 className="font-bold p-4 pb-0">Équipe ({equipe.length})</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-3">Nom</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Affectation</th>
              <th className="p-3">Accès</th>
              {estDirigeant && <th className="p-3">Droits accordés</th>}
              {estDirigeant && <th className="p-3">Présence</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {equipe.map((u) => {
              const droits = lireDroits(u.droitsSupplementaires);
              return (
                <tr key={u.id} className={!u.actif ? "opacity-50" : ""}>
                  <td className="p-3">
                    <div className="font-medium">{u.prenom} {u.nom}</div>
                    <div
                      className={`text-xs ${
                        estAdresseDAttente(u.email) ? "text-amber-700" : "text-slate-400"
                      }`}
                    >
                      {u.email}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{ROLE_LABELS[u.role as Role] ?? u.role}</div>
                    {/* L'appel se corrige : plusieurs personnes se sont
                        inscrites comme adjoint sans l'être. */}
                    {["CONSEILLER", "ADJOINT"].includes(u.role) && (
                      <ChangerAppel
                        userId={u.id}
                        nom={`${u.prenom} ${u.nom}`}
                        role={u.role}
                        aDesGroupes={u.groupesDiriges.length > 0}
                        aUneCompagnie={Boolean(u.compagnieId)}
                      />
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {u.role === "ADJOINT" ? (
                      // Les listes officielles donnent les rôles, pas les
                      // affectations : elles se décident ici.
                      <form
                        action={async (donnees: FormData) => {
                          "use server";
                          await affecterCompagnie(
                            u.id,
                            String(donnees.get("compagnieId") ?? "") || null
                          );
                        }}
                      >
                        <select
                          name="compagnieId"
                          defaultValue={u.compagnieId ?? ""}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 bg-white text-sm"
                        >
                          <option value="">— Aucune —</option>
                          {compagnies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom}
                            </option>
                          ))}
                        </select>
                        <button className="ml-1.5 text-xs text-fsy hover:underline">
                          Affecter
                        </button>
                      </form>
                    ) : (
                      (u.groupesDiriges.map((g) => g.nom).join(", ") || "—")
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BoutonMotDePasse userId={u.id} nom={`${u.prenom} ${u.nom}`} />
                      <BoutonAdresse
                        userId={u.id}
                        nom={`${u.prenom} ${u.nom}`}
                        email={u.email}
                        attente={estAdresseDAttente(u.email)}
                      />
                      {u.doitChangerMotDePasse && (
                        <span className="text-xs text-amber-700 whitespace-nowrap">
                          mot de passe provisoire
                        </span>
                      )}
                    </div>
                  </td>
                  {estDirigeant && (
                    <td className="p-3">
                      {u.role === "ADJOINT" ? (
                        <div className="flex flex-col gap-1.5 items-start">
                          {Object.values(DROITS).map((d) => {
                            const accorde = droits.includes(d.cle);
                            return (
                              <form
                                key={d.cle}
                                action={async () => {
                                  "use server";
                                  await basculerDroit(u.id, d.cle);
                                }}
                              >
                                <button
                                  title={d.aide}
                                  className={`text-xs rounded-full px-3 py-1 whitespace-nowrap ${
                                    accorde
                                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  }`}
                                >
                                  {accorde ? `${d.label} ✓` : d.label}
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {roleAuMoins(u.role, "COORDINATEUR") ? "Tous" : "—"}
                        </span>
                      )}
                    </td>
                  )}
                  {estDirigeant && (
                    <td className="p-3">
                      <form
                        action={async () => {
                          "use server";
                          await basculerActif(u.id);
                        }}
                      >
                        <button
                          className={`text-xs rounded-full px-3 py-1 ${
                            u.actif
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {u.actif ? "Présent" : "Absent"}
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-3">🕐 Journal d'audit (100 derniers)</h2>
        <ul className="space-y-1 text-sm max-h-96 overflow-y-auto">
          {audit.map((log) => (
            <li key={log.id} className="flex justify-between gap-3 text-slate-600">
              <span>
                <span className="font-medium">{log.user.prenom} {log.user.nom}</span>{" "}
                — {log.action}
                {log.details && <span className="text-slate-400"> ({log.details})</span>}
              </span>
              <span className="text-slate-400 font-mono whitespace-nowrap">
                {fmt.format(log.createdAt)}
              </span>
            </li>
          ))}
          {audit.length === 0 && <li className="text-slate-400">Aucune action enregistrée.</li>}
        </ul>
      </section>
    </div>
  );
}
