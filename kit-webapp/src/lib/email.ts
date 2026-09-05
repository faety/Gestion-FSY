import { Resend } from "resend";
import { APP } from "./app";
import { SITE_AFFICHE, SITE_URL } from "./site";

// Envoi d'e-mails par Resend.
//
// Trois principes tiennent tout ce fichier :
//
//   1. Sans clef, l'application marche exactement comme avant. Rien ne casse,
//      rien ne lève : les fonctions renvoient « non envoyé » et l'appelant
//      propose la solution de repli.
//   2. Un envoi qui échoue ne fait jamais échouer l'action métier. Un serveur
//      de messagerie indisponible ne doit pas empêcher quelqu'un de changer
//      son mot de passe.
//   3. Le domaine de l'expéditeur doit être vérifié chez Resend, et le
//      forfait gratuit n'en accepte qu'un. C'est l'erreur qui coûte le plus
//      de temps : l'envoi échoue sans que rien ne l'explique à l'écran. D'où
//      diagnosticEnvoi(), à afficher dans l'administration.

/** Adresse plausible ? Contrôle volontairement large : on refuse l'évident, pas le rare. */
export const emailPlausible = (email: string) =>
  /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(email.trim());

const CLEF = process.env.RESEND_API_KEY;

/** Nom affiché dans la boîte de réception. Sans lui, la messagerie montre la
 *  partie gauche de l'adresse : « bonjour », ce qui n'aide personne. */
const NOM_EXPEDITEUR = process.env.EMAIL_NOM?.trim() || APP.nom;

/** Expéditeur au format « Nom <adresse> » ; on accepte l'adresse seule. */
function composerExpediteur(brut: string | undefined): string | undefined {
  const v = brut?.trim();
  if (!v) return undefined;
  if (v.includes("<")) return v;
  return `${NOM_EXPEDITEUR} <${v}>`;
}

const EXPEDITEUR = composerExpediteur(process.env.EMAIL_EXPEDITEUR);

export const EMAIL_ACTIF = Boolean(CLEF && EXPEDITEUR);

/**
 * Ce que l'application a réellement lu comme expéditeur, et ce qui cloche.
 * Une valeur recopiée avec ses guillemets, ou un déploiement fait avant
 * l'ajout de la variable, se voient alors d'un coup d'œil.
 */
export function diagnosticEnvoi() {
  const brut = EXPEDITEUR ?? null;
  const soucis: string[] = [];

  if (!CLEF) soucis.push("RESEND_API_KEY absente.");
  if (!brut) {
    soucis.push("EMAIL_EXPEDITEUR absente.");
  } else {
    if (/["']/.test(brut)) {
      soucis.push("L'expéditeur contient des guillemets : ils font partie de la valeur et Resend la refusera.");
    }
    if (!brut.includes("@")) soucis.push("L'expéditeur ne contient pas d'adresse.");
    const domaine = brut.match(/@([^\s>]+)/)?.[1]?.toLowerCase();
    if (domaine && domaine !== SITE_AFFICHE) {
      soucis.push(
        `L'expéditeur écrit depuis ${domaine}, alors que le site est ${SITE_AFFICHE}. ` +
          `C'est permis, mais c'est ${domaine} qui doit être vérifié chez Resend.`
      );
    }
  }

  return { expediteur: brut, clefPresente: Boolean(CLEF), soucis };
}

let client: Resend | null = null;
const resend = () => (client ??= new Resend(CLEF));

export type Envoi =
  | { envoye: true }
  | { envoye: false; raison: "non-configuré" | "erreur"; detail?: string };

export async function envoyer(courriel: {
  a: string;
  sujet: string;
  html: string;
  texte: string;
}): Promise<Envoi> {
  if (!EMAIL_ACTIF) return { envoye: false, raison: "non-configuré" };
  try {
    const { error } = await resend().emails.send({
      from: EXPEDITEUR!,
      to: courriel.a,
      subject: courriel.sujet,
      html: courriel.html,
      text: courriel.texte,
    });
    if (error) {
      console.error("Envoi d'e-mail refusé :", error.message);
      return { envoye: false, raison: "erreur", detail: error.message };
    }
    return { envoye: true };
  } catch (e) {
    // Panne réseau, clef révoquée, quota dépassé : jamais bloquant.
    console.error("Envoi d'e-mail impossible :", e);
    return { envoye: false, raison: "erreur", detail: e instanceof Error ? e.message : String(e) };
  }
}

// ---------- Gabarit ----------
//
// Beaucoup liront ces messages sur un téléphone, dans des clients qui ignorent
// une partie du CSS. D'où des styles en ligne, un tableau pour la mise en
// page, et une version texte qui se suffit à elle-même.

function gabarit(titre: string, corps: string) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${titre}</title></head>
<body style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:${APP.couleurSombre};padding:16px 24px;color:#ffffff;font-weight:bold;font-size:17px">
<!-- Beaucoup de clients bloquent les images distantes : le nom reste écrit
     à côté, le bandeau ne dépend pas du logo pour se lire. -->
<img src="${SITE_URL}${APP.logo}" width="30" height="30" alt="" style="vertical-align:middle;margin-right:10px">
${APP.nom}
</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 14px;font-size:19px;color:${APP.couleurSombre}">${titre}</h1>
${corps}
</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5">
${APP.nom} · <a href="${SITE_URL}" style="color:${APP.couleur}">${SITE_AFFICHE}</a><br>
Si vous n'êtes pas concerné par ce message, ignorez-le.
</td></tr>
</table></body></html>`;
}

export const bouton = (lien: string, texte: string) =>
  `<p style="margin:22px 0"><a href="${lien}" style="background:${APP.couleur};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:bold;display:inline-block">${texte}</a></p>`;

export const p = (texte: string) =>
  `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${texte}</p>`;

export const petit = (texte: string) =>
  p(`<span style="color:#64748b;font-size:13px">${texte}</span>`);

/** Compose un message complet : sujet, texte brut, HTML dans le gabarit. */
export function courriel(sujet: string, titre: string, lignesTexte: string[], corpsHtml: string) {
  return { sujet: `${sujet} — ${APP.nom}`, texte: lignesTexte.join("\n"), html: gabarit(titre, corpsHtml) };
}

// ---------- Messages ----------

export function courrielReinitialisation(prenom: string, lien: string, heures: number) {
  return courriel(
    "Choisir un nouveau mot de passe",
    "Choisir un nouveau mot de passe",
    [
      `Bonjour ${prenom},`,
      ``,
      `Vous avez demandé à choisir un nouveau mot de passe pour ${APP.nom}.`,
      ``,
      `Ouvrez ce lien pour en choisir un :`,
      lien,
      ``,
      `Ce lien est valable ${heures} heures et ne fonctionne qu'une fois.`,
      ``,
      `Si vous n'avez rien demandé, ignorez ce message : votre mot de passe actuel reste valable.`,
    ],
    p(`Bonjour ${prenom},`) +
      p(`Vous avez demandé à choisir un nouveau mot de passe pour ${APP.nom}.`) +
      bouton(lien, "Choisir mon mot de passe") +
      petit(
        `Ce lien est valable <strong>${heures} heures</strong> et ne fonctionne qu'une fois. Si le bouton ne s'ouvre pas, copiez cette adresse dans votre navigateur :<br><span style="word-break:break-all">${lien}</span>`
      ) +
      petit(`Si vous n'avez rien demandé, ignorez ce message : votre mot de passe actuel reste valable.`)
  );
}

export function courrielCompteCree(prenom: string, email: string) {
  const lien = `${SITE_URL}/login`;
  return courriel(
    "Votre accès est ouvert",
    "Votre accès est ouvert",
    [
      `Bonjour ${prenom},`,
      ``,
      `Un compte vient d'être créé pour vous sur ${APP.nom}, avec l'adresse ${email}.`,
      `Le mot de passe provisoire vous est communiqué séparément ; il faudra en choisir un nouveau à la première connexion.`,
      ``,
      lien,
      ``,
      APP.signature,
    ],
    p(`Bonjour ${prenom},`) +
      p(`Un compte vient d'être créé pour vous sur ${APP.nom}, avec l'adresse <strong>${email}</strong>.`) +
      p(`Le mot de passe provisoire vous est communiqué séparément ; il faudra en choisir un nouveau à la première connexion.`) +
      bouton(lien, "Ouvrir l'application") +
      petit(APP.signature)
  );
}

export function courrielEssai(prenom: string) {
  return courriel(
    "Essai d'envoi",
    "Essai d'envoi",
    [
      `Bonjour ${prenom},`,
      ``,
      `Ceci est un message d'essai : si vous le lisez, l'envoi d'e-mails de l'application fonctionne.`,
      ``,
      `Aucune action n'est attendue de votre part.`,
    ],
    p(`Bonjour ${prenom},`) +
      p("Ceci est un message d'essai : si vous le lisez, l'envoi d'e-mails de l'application fonctionne.") +
      petit("Aucune action n'est attendue de votre part.")
  );
}
