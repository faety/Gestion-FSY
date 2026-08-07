import Link from "next/link";
import { prisma } from "@/lib/db";
import { getUtilisateur } from "@/lib/auth";
import { CONFERENCE, LIEU, THEME_FSY } from "@/lib/theme";
import { Logo } from "@/components/Logo";
import { SITE_AFFICHE } from "@/lib/site";
import { A_ANNONCER, QUAND, TITRE } from "@/lib/report";
import { MessageReport } from "@/components/BandeauReport";
import { signatureDuCouple } from "@/lib/couple";

// Le titre et la description voyagent : ils s'affichent dans l'onglet, dans les
// résultats de recherche et dans l'aperçu d'un lien partagé sur WhatsApp. Une
// page qui annoncerait encore les anciennes dates se partagerait comme si de
// rien n'était — d'où la dérivation.
export const metadata = {
  title: `FSY 2026 — Abidjan Ouest · ${CONFERENCE.duAu}`,
  description:
    `Conférence pour la jeunesse FSY 2026 Abidjan Ouest, du ${CONFERENCE.duAu}, au ${LIEU.nom} ` +
    `(${LIEU.ville}). Programme, encadrement et informations pratiques.`,
};

const fmtNombre = new Intl.NumberFormat("fr-FR");

// Journées, telles qu'elles ressortent des manuels officiels
const JOURS = [
  {
    jour: "Lundi 24 août",
    titre: "Arrivée et ouverture",
    detail:
      "Accueil aux cars, installation dans les dortoirs, formation des groupes et des compagnies, dévotion d'ouverture.",
    emoji: "🚌",
  },
  {
    jour: "Mardi 25 août",
    titre: "Premier jour des cours",
    detail:
      "Dévotion du matin, classes, activités de compagnie, et le bal du soir.",
    emoji: "📖",
  },
  {
    jour: "Mercredi 26 août",
    titre: "Deuxième jour des cours",
    detail: "Classes, service, activités sportives et soirée jeux.",
    emoji: "🎯",
  },
  {
    jour: "Jeudi 27 août",
    titre: "Journée du dimanche",
    detail:
      "Réunions séparées jeunes gens et jeunes filles, spectacles des compagnies, soirée de témoignages.",
    emoji: "🕊️",
  },
  {
    jour: "Vendredi 28 août",
    titre: "Dernière journée complète",
    detail:
      "Classes, grand jeu, dévotion de clôture, veillée de nuit et préparation du retour.",
    emoji: "✨",
  },
  {
    jour: "Samedi 29 août",
    titre: "Clôture et départs",
    detail: "Rangement, dévotion finale, remise des attestations, montée dans les cars.",
    emoji: "🏠",
  },
];

const MODULES = [
  {
    emoji: "📅",
    titre: "Programme du jour",
    texte:
      "Chacun ne voit que ce qui le concerne : ses activités, son rôle attendu, la tenue du jour.",
  },
  {
    emoji: "🚌",
    titre: "Pointage aux cars",
    texte:
      "Départ du pieu, arrivée au site, retour le dernier jour. Chaque nom coché est horodaté et signé.",
  },
  {
    emoji: "👥",
    titre: "Jeunes et groupes",
    texte:
      "Recherche instantanée, alertes médicales et alimentaires, contact d'urgence, réassignation en cours de route.",
  },
  {
    emoji: "📝",
    titre: "Rapport quotidien",
    texte:
      "Deux minutes par soir, presque tout au doigt. Les rapports composent tout seuls le bilan final.",
  },
  {
    emoji: "📢",
    titre: "Annonces ciblées",
    texte:
      "Par niveau de responsabilité, et programmables — les anniversaires sont annoncés automatiquement.",
  },
  {
    emoji: "🎂",
    titre: "Anniversaires",
    texte:
      "Les jeunes qui fêtent leur anniversaire pendant la conférence sont signalés deux jours avant.",
  },
];

const PRATIQUE = [
  {
    titre: "Quand et où",
    texte:
      `${CONFERENCE.duAuComplet.replace(/^du /, "Du ")}, au ${LIEU.nom}, à ${LIEU.ville}. ` +
      `Les encadrants arrivent la veille, le ${CONFERENCE.veille}. Le site est hors d'Abidjan : ` +
      "les cars partent de chaque pieu et district, et le trajet est plus long que pour une " +
      "conférence tenue en ville — les horaires de départ sont donnés par les dirigeants de pieu.",
  },
  {
    titre: "Qui peut participer",
    texte:
      `Les jeunes de 14 ans au plus tard le 31 décembre 2026, et de 18 ans au plus le ${CONFERENCE.du}. L'inscription se fait par le pieu ou le district.`,
  },
  {
    titre: "Encadrement",
    texte:
      "Un couple dirigeant, deux coordinateurs principaux, une paire de coordinateurs adjoints par compagnie, et un conseiller ou une conseillère par groupe — un adulte pour dix jeunes environ.",
  },
  {
    titre: "À apporter",
    texte:
      "Vêtements du dimanche, tenues décontractées, tee-shirt FSY, draps et affaires de toilette, Écritures, carnet et stylo, gourde. Les téléphones restent rangés pendant les activités.",
  },
  {
    titre: "Santé",
    texte:
      "Toute contrainte médicale ou alimentaire signalée à l'inscription est transmise au conseiller du groupe et à l'intendance. Une trousse de premiers secours est disponible sur le site.",
  },
];

export default async function LandingPage() {
  const user = await getUtilisateur();
  const signature = A_ANNONCER ? await signatureDuCouple() : "";

  // Chiffres agrégés uniquement : aucune donnée personnelle sur la page publique.
  //
  // Le nombre annoncé est celui des inscriptions, toutes comptées : c'est le
  // chiffre de la zone, celui que le couple dirigeant et les pieux donnent, et
  // celui auquel les familles se reconnaissent. Retrancher les annulations
  // aurait été une nuance d'organisation interne — juste, mais pas la réponse
  // à « combien de jeunes ? ».
  const [nbJeunes, nbCompagnies, nbGroupes, nbPieux, nbActivites] = await Promise.all([
    prisma.jeune.count(),
    prisma.compagnie.count(),
    prisma.groupe.count(),
    prisma.pieu.count(),
    prisma.activite.count(),
  ]);

  const chiffres = [
    { valeur: fmtNombre.format(nbJeunes), label: "jeunes inscrits" },
    { valeur: nbPieux, label: "pieux et districts" },
    { valeur: nbCompagnies, label: "compagnies" },
    { valeur: nbGroupes, label: "groupes" },
    { valeur: "6", label: "jours" },
    { valeur: nbActivites, label: "activités au programme" },
  ];

  return (
    <div className="bg-white">
      {/* En-tête */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <span className="font-bold text-fsy-dark flex items-center gap-2">
            <Logo taille={34} />
            FSY 2026
          </span>
          <nav className="hidden sm:flex gap-5 text-sm text-slate-600">
            <a href="#programme" className="hover:text-fsy">Programme</a>
            <a href="#application" className="hover:text-fsy">L'application</a>
            <a href="#pratique" className="hover:text-fsy">Informations</a>
          </nav>
          <Link
            href={user ? "/accueil" : "/login"}
            className="bg-fsy hover:bg-fsy-dark text-white text-sm font-semibold rounded-lg px-4 py-2 transition whitespace-nowrap"
          >
            {user ? "Mon espace" : "Espace encadrants"}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-fsy-dark to-fsy text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <Logo taille={96} className="mb-5" clair />
          <p className="text-blue-200 text-sm uppercase tracking-widest">
            Conférence pour la jeunesse
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold mt-2 leading-tight">
            FSY 2026
            <span className="block text-blue-100 text-2xl sm:text-4xl mt-1">Abidjan Ouest</span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-blue-50">
            <strong>{CONFERENCE.duAuComplet.replace(/^du /, "Du ")}</strong> — six jours pour{" "}
            {fmtNombre.format(nbJeunes)} jeunes de {nbPieux} pieux et districts.
          </p>
          <p className="mt-1 text-lg text-blue-100">
            Au <strong>{LIEU.nom}</strong>, à {LIEU.ville}.
          </p>
          {A_ANNONCER && (
            <p className="mt-4 inline-block bg-green-300 text-green-950 font-bold rounded-lg px-4 py-2 text-base">
              📅 {TITRE} — {QUAND}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#programme"
              className="bg-white text-fsy-dark font-semibold rounded-xl px-6 py-3 hover:bg-blue-50 transition"
            >
              Voir le programme
            </a>
            <Link
              href={user ? "/accueil" : "/login"}
              className="bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl px-6 py-3 transition"
            >
              {user ? "Ouvrir mon espace" : "Je suis encadrant"}
            </Link>
          </div>
        </div>
      </section>

      {A_ANNONCER && (
        <div className="max-w-5xl mx-auto px-4 pt-8">
          <MessageReport signature={signature} />
        </div>
      )}

      {/* Thème */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="border-l-4 border-fsy pl-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Thème de l'année</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-fsy-dark mt-1">
            « {THEME_FSY.titre} »
          </h2>
          <blockquote className="mt-3 text-slate-700 text-lg leading-relaxed">
            {THEME_FSY.texte}
          </blockquote>
          <p className="text-slate-500 mt-2">{THEME_FSY.reference}</p>
        </div>
      </section>

      {/* Chiffres */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
          {chiffres.map((c) => (
            <div key={c.label}>
              <div className="text-3xl font-bold text-fsy">{c.valeur}</div>
              <div className="text-xs sm:text-sm text-slate-500 leading-tight mt-0.5">
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Programme */}
      <section id="programme" className="max-w-5xl mx-auto px-4 py-14 scroll-mt-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-fsy-dark">Les six jours</h2>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Le programme suit les manuels officiels du participant et de l'encadrant. Les horaires
          détaillés, activité par activité, sont dans l'application.
        </p>
        <ol className="mt-8 space-y-4">
          {JOURS.map((j, i) => (
            <li key={j.jour} className="flex gap-4">
              <div className="shrink-0 flex flex-col items-center">
                <span className="w-11 h-11 rounded-full bg-fsy-light text-fsy-dark flex items-center justify-center text-xl">
                  {j.emoji}
                </span>
                {i < JOURS.length - 1 && <span className="w-0.5 flex-1 bg-slate-200 mt-1" />}
              </div>
              <div className="pb-2">
                <div className="text-sm text-slate-500">{j.jour}</div>
                <div className="font-bold text-lg">{j.titre}</div>
                <p className="text-slate-600 text-sm mt-0.5">{j.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Organisation */}
      <section className="bg-fsy-dark text-white">
        <div className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold">Comment les jeunes sont organisés</h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-6">
            {[
              {
                titre: "Le groupe",
                texte:
                  "Une dizaine de jeunes du même sexe, encadrés par un conseiller ou une conseillère. C'est la cellule de base : dévotions, repas, discussions.",
              },
              {
                titre: "La compagnie",
                texte:
                  "Deux groupes, un de jeunes filles et un de jeunes gens, conduits par une paire de coordinateurs adjoints. C'est le niveau des spectacles et des activités sportives.",
              },
              {
                titre: "La conférence",
                texte:
                  "Toutes les compagnies réunies, sous la direction des deux coordinateurs principaux et du couple dirigeant.",
              },
            ].map((b) => (
              <div key={b.titre}>
                <h3 className="font-bold text-lg text-blue-100">{b.titre}</h3>
                <p className="text-blue-50/90 text-sm mt-1.5 leading-relaxed">{b.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application */}
      <section id="application" className="max-w-5xl mx-auto px-4 py-14 scroll-mt-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-fsy-dark">
          L'application d'encadrement
        </h2>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Conçue pour le téléphone, à utiliser d'une main pendant la conférence. Chaque encadrant
          n'y voit que ce qui relève de sa responsabilité.
        </p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m) => (
            <div key={m.titre} className="border border-slate-200 rounded-xl p-5">
              <div className="text-2xl">{m.emoji}</div>
              <h3 className="font-bold mt-2">{m.titre}</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{m.texte}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h3 className="font-bold">Données des participants</h3>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Les participants sont mineurs. Les coordonnées, informations médicales et contacts
            d'urgence ne sont visibles que par les personnes qui en ont besoin : le conseiller pour
            son groupe, les adjoints pour leur compagnie, les coordinateurs pour l'ensemble. Chaque
            consultation sensible et chaque modification sont enregistrées dans un journal d'audit.
          </p>
        </div>
      </section>

      {/* Informations pratiques */}
      <section id="pratique" className="bg-slate-50 border-y border-slate-200 scroll-mt-16">
        <div className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-fsy-dark">
            Informations pratiques
          </h2>
          <dl className="mt-8 grid sm:grid-cols-2 gap-6">
            {PRATIQUE.map((p) => (
              <div key={p.titre} className="bg-white rounded-xl p-5 shadow-sm">
                <dt className="font-bold">{p.titre}</dt>
                <dd className="text-sm text-slate-600 mt-1.5 leading-relaxed">{p.texte}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Accès */}
      <section className="max-w-5xl mx-auto px-4 py-14 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-fsy-dark">Vous encadrez la FSY 2026 ?</h2>
        <p className="text-slate-600 mt-2 max-w-xl mx-auto">
          Votre compte a été créé par les coordinateurs principaux. Connectez-vous pour retrouver
          votre programme, vos jeunes et votre rapport quotidien.
        </p>
        <Link
          href={user ? "/accueil" : "/login"}
          className="inline-block mt-6 bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-xl px-8 py-3.5 transition"
        >
          {user ? "Ouvrir mon espace" : "Se connecter"}
        </Link>
        <p className="text-sm text-slate-500 mt-4">
          Pas encore de compte ? Adressez-vous aux coordinateurs principaux de la conférence.
        </p>
      </section>

      <footer className="bg-fsy-dark text-blue-100 text-sm">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-2 justify-between">
          <span>FSY 2026 — Abidjan Ouest · {CONFERENCE.duAu} · {SITE_AFFICHE}</span>
          <span className="text-blue-300">« {THEME_FSY.titre} » — {THEME_FSY.reference}</span>
        </div>
      </footer>
    </div>
  );
}
