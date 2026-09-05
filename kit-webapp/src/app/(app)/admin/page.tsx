import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CLOUDINARY_ACTIF, TYPE_LIVRAISON } from "@/lib/cloudinary";
import { EMAIL_ACTIF, diagnosticEnvoi } from "@/lib/email";
import { lectureSeule } from "@/lib/reglages";
import { SITE_URL } from "@/lib/site";
import { EssaiEmail, InterrupteurLectureSeule, LigneUtilisateur, NouvelUtilisateur } from "@/components/OutilsAdmin";

export const metadata = { title: "Administration" };

export default async function AdminPage() {
  const moi = await exigerRole("ADMIN");
  const [utilisateurs, restreint, journal] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ actif: "desc" }, { nom: "asc" }, { prenom: "asc" }] }),
    lectureSeule(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { prenom: true, nom: true } } } }),
  ]);
  const diagnostic = diagnosticEnvoi();
  const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">⚙️ Administration</h1>

      {/* ---------- État des services ---------- */}
      <section className="bg-white rounded-xl shadow-sm p-4 text-sm">
        <h2 className="font-bold mb-2">Services</h2>
        <ul className="space-y-1">
          <li>🌐 Adresse publique : <span className="font-mono">{SITE_URL}</span></li>
          <li>
            🖼️ Cloudinary : {CLOUDINARY_ACTIF ? `actif (livraison ${TYPE_LIVRAISON})` : "non configuré — l'envoi de photos est désactivé"}
          </li>
          <li>
            ✉️ E-mails : {EMAIL_ACTIF ? `actifs, expéditeur ${diagnostic.expediteur}` : "non configurés"}
            {diagnostic.soucis.length > 0 && (
              <ul className="ml-5 mt-1 text-amber-800 list-disc">
                {diagnostic.soucis.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </li>
        </ul>
        <div className="mt-3">
          <EssaiEmail adresseParDefaut={moi.email} />
        </div>
      </section>

      {/* ---------- Réglages ---------- */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">Lecture seule</h2>
        <p className="text-sm text-slate-500 mt-1 mb-3">
          Une fois activée, tout le monde sauf les administrateurs n&apos;a plus accès qu&apos;à l&apos;accueil et à son profil.
          Se lève à tout moment.
        </p>
        <InterrupteurLectureSeule actif={restreint} />
      </section>

      {/* ---------- Comptes ---------- */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold mb-3">➕ Nouveau compte</h2>
        <NouvelUtilisateur />
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">👥 Comptes ({utilisateurs.length})</h2>
        <ul className="divide-y divide-slate-100 mt-2">
          {utilisateurs.map((u) => (
            <LigneUtilisateur key={u.id} u={u} moi={u.id === moi.id} />
          ))}
        </ul>
      </section>

      {/* ---------- Journal ---------- */}
      <section className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold">📜 Journal</h2>
        <ul className="text-xs mt-2 space-y-1">
          {journal.map((j) => (
            <li key={j.id} className="flex gap-2">
              <span className="text-slate-400 shrink-0">{fmt.format(j.createdAt)}</span>
              <span className="shrink-0">{j.user.prenom} {j.user.nom}</span>
              <span className="font-mono">{j.action}</span>
              {j.details && <span className="text-slate-500 truncate">{j.details}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
