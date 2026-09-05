// Vérification de bout en bout avec un vrai navigateur (Playwright).
//
// Ce que fait ce script, c'est ce qu'on doit refaire à chaque changement qui
// touche la connexion, les documents ou les envois : ouvrir l'application
// comme un utilisateur, pas seulement compiler.
//
//   1. l'application tourne :   npm run build && npm run start   (ou npm run dev)
//   2. dans un autre terminal : ADMIN_EMAIL=… ADMIN_MDP=… npm run verifier
//
// Playwright : `npm i -D playwright` puis `npx playwright install chromium`.
// Si un Chromium est déjà installé, CHROMIUM=/chemin/vers/chromium l'utilise.
// PLAYWRIGHT_IMPORT permet de pointer sur une installation globale.

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@exemple.ci";
const MDP = process.env.ADMIN_MDP ?? "changez-moi-vite";

const { chromium } = await import(process.env.PLAYWRIGHT_IMPORT ?? "playwright");

const navigateur = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
});
const page = await navigateur.newPage();
let echecs = 0;
const ok = (cond, libelle) => {
  console.log(`${cond ? "✅" : "❌"} ${libelle}`);
  if (!cond) echecs++;
};

try {
  // ---------- Connexion ----------
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Adresse e-mail").fill(EMAIL);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MDP);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(accueil|mot-de-passe)$/);
  ok(true, `connexion : ${page.url()}`);

  // Mot de passe provisoire : le gabarit impose la page de changement.
  if (page.url().endsWith("/mot-de-passe")) {
    await page.goto(`${BASE}/accueil`);
    ok(page.url().endsWith("/mot-de-passe"), "mot de passe provisoire : l'accueil renvoie sur /mot-de-passe");
    console.log("   (changez le mot de passe dans l'interface pour tester le reste)");
  } else {
    // ---------- Pages ----------
    for (const chemin of ["/accueil", "/profil", "/impression", "/admin"]) {
      const r = await page.goto(`${BASE}${chemin}`);
      ok(r?.status() === 200 && page.url().endsWith(chemin), `page ${chemin}`);
    }

    // ---------- PDF côté serveur : une vraie A4 ----------
    // pdf-lib compresse ses objets : on relit le fichier avec lui plutôt que
    // de chercher « MediaBox » dans les octets.
    const pdf = await page.request.get(`${BASE}/api/exemple.pdf`);
    const octets = Buffer.from(await pdf.body());
    ok(pdf.status() === 200 && octets.subarray(0, 5).toString() === "%PDF-", "PDF : réponse valide");
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(octets);
    const { width, height } = doc.getPage(0).getSize();
    ok(doc.getPageCount() >= 1, `PDF : ${doc.getPageCount()} page(s)`);
    ok(Math.round(width) === 595 && Math.round(height) === 842, `PDF : format A4 portrait (${width} × ${height} pt)`);

    // ---------- ZIP en flux ----------
    const zip = await page.request.get(`${BASE}/api/exemple.zip`);
    const z = Buffer.from(await zip.body());
    ok(zip.status() === 200 && z.readUInt32LE(0) === 0x04034b50, "ZIP : en-tête local");
    ok(z.readUInt32LE(z.length - 22) === 0x06054b50, "ZIP : marqueur de fin");

    // ---------- Page imprimable : la feuille paysage mesure 297 × 210 mm ----------
    await page.goto(`${BASE}/impression`);
    await page.emulateMedia({ media: "print" });
    const impression = await PDFDocument.load(await page.pdf({ preferCSSPageSize: true }));
    const feuille = impression.getPage(0).getSize();
    ok(feuille.width > feuille.height, `impression : page paysage (${feuille.width.toFixed(1)} × ${feuille.height.toFixed(1)} pt)`);
    ok(impression.getPageCount() === 1, `impression : ${impression.getPageCount()} page (une feuille, pas de page blanche)`);
    await page.emulateMedia({ media: "screen" });
  }

  // ---------- Déconnexion ----------
  await page.goto(`${BASE}/accueil`);
  await page.getByRole("button", { name: "Déconnexion" }).click();
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await page.waitForURL(/\/login/);
  ok(true, "déconnexion");
} catch (e) {
  echecs++;
  console.error("❌", e instanceof Error ? e.message : e);
} finally {
  await navigateur.close();
}

console.log(echecs === 0 ? "\nTout est en ordre." : `\n${echecs} problème(s).`);
process.exit(echecs === 0 ? 0 : 1);
