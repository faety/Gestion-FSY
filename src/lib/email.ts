import { Resend } from "resend";
import { SITE_AFFICHE, SITE_URL } from "./site";

// Envoi d'e-mails par Resend.
//
// Trois principes tiennent tout ce fichier :
//
//   1. Sans clef, l'application marche exactement comme avant. Rien ne casse,
//      rien ne lève : les fonctions renvoient « non envoyé » et l'appelant
//      propose la solution de repli.
//   2. Un envoi qui échoue ne fait jamais échouer l'action métier. Un serveur
//      de messagerie indisponible ne doit pas empêcher quelqu'un de changer son
//      mot de passe.
//   3. On n'écrit jamais à une adresse d'attente. Les 66 comptes ont été créés
//      avec un identifiant fabriqué à partir du nom (`prenom.nom@fsy2026.ci`) :
//      ce domaine n'existe pas. Écrire à ces adresses ne ferait qu'accumuler
//      des rejets et abîmer la réputation d'envoi du domaine réel.

/** Domaine des identifiants fabriqués à l'amorçage : aucune boîte derrière. */
export const DOMAINE_ATTENTE = "@fsy2026.ci";

export const estAdresseDAttente = (email: string) =>
  email.trim().toLowerCase().endsWith(DOMAINE_ATTENTE);

/** Adresse plausible ? Contrôle volontairement large : on refuse l'évident, pas le rare. */
export const emailPlausible = (email: string) =>
  /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(email.trim());

const CLEF = process.env.RESEND_API_KEY;

/**
 * Nom affiché dans la boîte de réception.
 *
 * Sans lui, la messagerie retombe sur la partie gauche de l'adresse : un
 * message signé « bonjour » au milieu d'une liste, ce qui ne ressemble à rien
 * et n'aide personne à reconnaître d'où il vient.
 */
const NOM_EXPEDITEUR = process.env.EMAIL_NOM?.trim() || "FSY 2026";

/**
 * Expéditeur au format attendu : « FSY 2026 <bonjour@fsy.ci> ».
 *
 * On accepte aussi l'adresse seule et l'on ajoute le nom — composer un en-tête
 * conforme à la main est un piège inutile, et l'oubli ne se voit qu'une fois le
 * message reçu.
 */
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
 *
 * Sert au diagnostic : quand un envoi échoue, la première question est de
 * savoir si la variable est arrivée jusqu'ici et sous quelle forme. Une valeur
 * recopiée avec ses guillemets, ou un déploiement fait avant l'ajout de la
 * variable, se voient alors d'un coup d'œil au lieu de se deviner.
 */
export function diagnosticEnvoi() {
  const brut = EXPEDITEUR ?? null;
  const soucis: string[] = [];

  if (!CLEF) soucis.push("RESEND_API_KEY absente.");
  if (!brut) {
    soucis.push("EMAIL_EXPEDITEUR absente.");
  } else {
    if (/["']/.test(brut)) {
      soucis.push(
        "L'expéditeur contient des guillemets : ils font partie de la valeur et Resend la refusera. Saisissez-la sans guillemets.",
      );
    }
    if (!brut.includes("@")) soucis.push("L'expéditeur ne contient pas d'adresse.");
    if (!/^[^<]+</.test(brut)) {
      soucis.push("L'expéditeur n'a pas de nom affiché : la messagerie montrerait l'adresse.");
    }
    // Contrôle volontairement strict, y compris sur les sous-domaines : le
    // forfait gratuit de Resend ne vérifie qu'un seul domaine, et écrire depuis
    // un sous-domaine qui n'est plus celui-là est l'erreur qui coûte le plus de
    // temps — l'envoi échoue sans que rien ne l'explique à l'écran.
    const domaine = brut.match(/@([^\s>]+)/)?.[1]?.toLowerCase();
    if (domaine && domaine !== SITE_AFFICHE) {
      soucis.push(
        `L'expéditeur écrit depuis ${domaine}, alors que le site est ${SITE_AFFICHE}. ` +
          `C'est permis, mais c'est ${domaine} qui doit être vérifié chez Resend — ` +
          `et le forfait gratuit n'en accepte qu'un.`,
      );
    }
  }

  return { expediteur: brut, clefPresente: Boolean(CLEF), soucis };
}

// Une seule source pour l'adresse publique : voir src/lib/site.ts.
export const SITE = SITE_URL;

let client: Resend | null = null;
const resend = () => (client ??= new Resend(CLEF));

export type Envoi =
  | { envoye: true }
  | { envoye: false; raison: "non-configuré" | "adresse-d-attente" | "erreur"; detail?: string };

export async function envoyer(courriel: {
  a: string;
  sujet: string;
  html: string;
  texte: string;
}): Promise<Envoi> {
  if (!EMAIL_ACTIF) return { envoye: false, raison: "non-configuré" };
  if (estAdresseDAttente(courriel.a)) return { envoye: false, raison: "adresse-d-attente" };

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
    return {
      envoye: false,
      raison: "erreur",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

// ---------- Gabarit ----------
//
// Beaucoup d'encadrants liront ces messages sur un téléphone, dans des clients
// qui ignorent une partie du CSS. D'où des styles en ligne, un tableau pour la
// mise en page, et une version texte qui se suffit à elle-même.

const BLEU = "#015581";
const BLEU_NUIT = "#013F60";

function gabarit(titre: string, corps: string) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${titre}</title></head>
<body style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:${BLEU_NUIT};padding:16px 24px;color:#ffffff;font-weight:bold;font-size:17px">
<!-- Beaucoup de clients bloquent les images distantes par défaut : le nom
     reste écrit à côté, le bandeau ne dépend pas du logo pour se lire. -->
<img src="${SITE}/logo-fsy-2026.png" width="30" height="30" alt="" style="vertical-align:middle;margin-right:10px">
FSY 2026 — Abidjan Ouest
</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 14px;font-size:19px;color:${BLEU_NUIT}">${titre}</h1>
${corps}
</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5">
Conférence pour la jeunesse FSY 2026, du 3 au 8 août 2026 · <a href="${SITE}" style="color:${BLEU}">${SITE_AFFICHE}</a><br>
Ce message est destiné à l'encadrement de la conférence. Si vous n'êtes pas concerné, ignorez-le.
</td></tr>
</table></body></html>`;
}

const bouton = (lien: string, texte: string) =>
  `<p style="margin:22px 0"><a href="${lien}" style="background:${BLEU};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:bold;display:inline-block">${texte}</a></p>`;

const p = (texte: string) =>
  `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${texte}</p>`;

// ---------- Messages ----------

export function courrielReinitialisation(prenom: string, lien: string, heures: number) {
  const texte = [
    `Bonjour ${prenom},`,
    ``,
    `Vous avez demandé à choisir un nouveau mot de passe pour l'application de la conférence FSY 2026 — Abidjan Ouest.`,
    ``,
    `Ouvrez ce lien pour en choisir un :`,
    lien,
    ``,
    `Ce lien est valable ${heures} heures et ne fonctionne qu'une fois.`,
    ``,
    `Si vous n'avez rien demandé, ignorez ce message : votre mot de passe actuel reste valable.`,
  ].join("\n");

  return {
    sujet: "Choisir un nouveau mot de passe — FSY 2026",
    texte,
    html: gabarit(
      "Choisir un nouveau mot de passe",
      p(`Bonjour ${prenom},`) +
        p(
          "Vous avez demandé à choisir un nouveau mot de passe pour l'application de la conférence."
        ) +
        bouton(lien, "Choisir mon mot de passe") +
        p(
          `<span style="color:#64748b;font-size:13px">Ce lien est valable <strong>${heures} heures</strong> et ne fonctionne qu'une fois. Si le bouton ne s'ouvre pas, copiez cette adresse dans votre navigateur :<br><span style="word-break:break-all">${lien}</span></span>`
        ) +
        p(
          `<span style="color:#64748b;font-size:13px">Si vous n'avez rien demandé, ignorez ce message : votre mot de passe actuel reste valable.</span>`
        )
    ),
  };
}

export function courrielCompteValide(prenom: string) {
  const lien = `${SITE}/login`;
  const texte = [
    `Bonjour ${prenom},`,
    ``,
    `Votre compte vient d'être validé par les coordinateurs principaux. Vous pouvez vous connecter avec le mot de passe que vous avez choisi à l'inscription :`,
    lien,
    ``,
    `À très vite,`,
    `Le couple dirigeant`,
  ].join("\n");

  return {
    sujet: "Votre accès est ouvert — FSY 2026",
    texte,
    html: gabarit(
      "Votre accès est ouvert",
      p(`Bonjour ${prenom},`) +
        p(
          "Votre compte vient d'être validé par les coordinateurs principaux. Vous pouvez maintenant vous connecter avec le mot de passe que vous avez choisi à l'inscription."
        ) +
        bouton(lien, "Ouvrir l'application") +
        p(`<span style="color:#64748b;font-size:13px">À très vite, le couple dirigeant.</span>`)
    ),
  };
}

export function courrielEssai(prenom: string) {
  const texte = [
    `Bonjour ${prenom},`,
    ``,
    `Ceci est un message d'essai : si vous le lisez, l'envoi d'e-mails de l'application fonctionne.`,
    ``,
    `Aucune action n'est attendue de votre part.`,
  ].join("\n");

  return {
    sujet: "Essai d'envoi — FSY 2026",
    texte,
    html: gabarit(
      "Essai d'envoi",
      p(`Bonjour ${prenom},`) +
        p(
          "Ceci est un message d'essai : si vous le lisez, l'envoi d'e-mails de l'application fonctionne."
        ) +
        p(
          `<span style="color:#64748b;font-size:13px">Aucune action n'est attendue de votre part.</span>`
        )
    ),
  };
}
