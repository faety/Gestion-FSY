// Identité de l'application, en un seul endroit.
//
// Tout ce qui nomme l'application — titre des pages, expéditeur des e-mails,
// nom du cookie de session, dossiers Cloudinary — part d'ici. Pour démarrer un
// nouveau projet, c'est le premier fichier à modifier, et souvent le seul.

export const APP = {
  /** Nom complet, affiché partout. */
  nom: "Mon application",
  /** Identifiant court, sans espace ni accent : cookie, dossiers Cloudinary, préfixes. */
  court: "monapp",
  /** Une phrase, pour l'onglet et les aperçus de liens. */
  description: "Application de gestion.",
  /** Qui signe : « Le comité », « L'équipe »… Termine les e-mails. */
  signature: "L'équipe",
  /** Adresse publique par défaut si SITE_URL n'est pas définie. */
  siteParDefaut: "http://localhost:3000",
  /** Couleurs de la charte (reprises dans globals.css et les PDF). */
  couleur: "#1d4ed8",
  couleurSombre: "#1e3a8a",
  /** Fichier dans public/ ; s'il manque, un sigle textuel s'affiche à la place. */
  logo: "/logo.png",
  /** Durée d'une session. */
  sessionJours: 14,
} as const;
