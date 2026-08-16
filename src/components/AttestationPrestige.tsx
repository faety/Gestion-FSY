import QRCode from "qrcode";
import {
  CONFERENCE,
  SIGNATAIRES,
  TITRES,
  corpsAttestation,
  corpsAttestationEn,
  mention,
} from "@/lib/attestations";
import { SITE_AFFICHE, lienVerification } from "@/lib/site";
import type { DonneesAttestation } from "@/components/Attestation";

// Design « Prestige » : une seule page à l'italienne, grand titre, bandeau de
// mention doré, signatures manuscrites, panneau de vérification en coin.
// Composé d'après les maquettes validées par le couple dirigeant. Le contenu
// (textes, chiffres, code, QR) est le même que le modèle classique : seul
// l'habillage change — l'authentification ne repose jamais sur le décor.
//
// La page est en paysage : à l'écran elle s'affiche à plat, à l'impression le
// porte-feuille la pivote dans une page A4 portrait (réglage d'imprimante
// universel), il suffit de tourner la feuille. Voir StyleImpression.

const BLEU_NUIT = "#123361";
const BLEU_ROYAL = "#1D4ED8";
const OR = "#B8860B";
const OR_CLAIR = "#D4A83C";
const CREME = "#FDFBF5";
const SERIF = "Georgia, 'Times New Roman', Times, serif";

const fmtLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fmtLongEn = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

// La signature manuscrite : une police dédiée, embarquée dans l'application
// (public/fonts) pour être identique sur tous les appareils, y compris hors
// ligne. Great Vibes, licence SIL Open Font License.
const STYLE_POLICE = `
@font-face {
  font-family: "Grande Signature";
  src: url("/fonts/great-vibes-latin-400-normal.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: block;
}`;

const TEXTES = {
  fr: {
    eglise: "Église de Jésus-Christ des Saints des Derniers Jours",
    conference: `Conférence pour la jeunesse ${CONFERENCE.nom}`,
    atteste: "Le couple dirigeant atteste que",
    verifier: "Vérifier sur",
    code: "Code",
    fait: (lieu: string, date: string) => `Fait à ${lieu}, le ${date}.`,
  },
  en: {
    eglise: "The Church of Jesus Christ of Latter-day Saints",
    conference: `${CONFERENCE.nom} — Youth Conference`,
    atteste: "This is to certify that",
    verifier: "Verify at",
    code: "Code",
    fait: (lieu: string, date: string) => `Issued in ${lieu} on ${date}.`,
  },
} as const;

export async function AttestationPrestige({
  donnees,
  langue,
  derniere = true,
}: {
  donnees: DonneesAttestation;
  langue: "fr" | "en";
  derniere?: boolean;
}) {
  const { code, role, sexe, faits } = donnees;
  const t = TEXTES[langue];
  const m = mention(donnees.mention);
  const titre = (TITRES[role] ?? TITRES.CONSEILLER)[langue];
  const corps =
    langue === "fr" ? corpsAttestation(role, sexe, faits) : corpsAttestationEn(role, faits);
  const [intro, detail] = corps.split("\n\n");
  const date =
    langue === "fr" ? fmtLong.format(donnees.delivreeLe) : fmtLongEn.format(donnees.delivreeLe);
  const lieu = langue === "fr" ? CONFERENCE.villePays : CONFERENCE.villePaysEn;

  const qr = await QRCode.toString(lienVerification(code), {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: BLEU_NUIT, light: "#ffffff" },
  });

  return (
    <div className={`porte-paysage bg-white mx-auto ${derniere ? "" : "break-after-page"}`}>
      <style>{STYLE_POLICE}</style>
      <div
        className="paysage relative overflow-hidden shadow-lg print:shadow-none text-slate-900"
        style={{
          background: CREME,
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        {/* ---------- Décor ---------- */}
        {/* Vague claire en haut à gauche */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: "120mm", height: "52mm" }}
          viewBox="0 0 120 52"
          aria-hidden
        >
          <path d="M0 0 H74 C48 10 30 26 0 30 Z" fill={BLEU_NUIT} opacity="0.09" />
          <path d="M0 0 H46 C30 8 16 18 0 20 Z" fill={BLEU_ROYAL} opacity="0.12" />
          <path d="M76 0 C50 11 30 27 0 31.5 v2 C32 29 52 13 80 0 Z" fill={OR_CLAIR} opacity="0.55" />
        </svg>
        {/* Grand pan bleu nuit en bas à droite, souligné d'or */}
        <svg
          className="absolute bottom-0 right-0 pointer-events-none"
          style={{ width: "150mm", height: "96mm" }}
          viewBox="0 0 150 96"
          aria-hidden
        >
          <path d="M150 96 H30 C74 76 96 40 150 10 Z" fill={BLEU_NUIT} />
          <path
            d="M27 96 C72 75 94 39 150 8.5 V6 C92 37 68 74 21 96 Z"
            fill={OR_CLAIR}
          />
          <path d="M150 96 H92 C114 84 128 66 150 52 Z" fill="#0C2547" opacity="0.55" />
        </svg>

        {/* Filigrane : le logo, presque effacé, dans le tiers gauche */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-fsy-2026.png"
          alt=""
          aria-hidden
          className="absolute left-[8mm] top-[52%] -translate-y-1/2 w-[78mm] pointer-events-none"
          style={{ opacity: 0.07 }}
        />

        {/* Cadre à double filet arrondi */}
        <div
          className="absolute inset-[4.5mm] rounded-[4mm] pointer-events-none"
          style={{ border: `0.7mm solid ${OR_CLAIR}` }}
        />
        <div
          className="absolute inset-[6.2mm] rounded-[3mm] pointer-events-none"
          style={{ border: `0.2mm solid ${OR}`, opacity: 0.65 }}
        />

        {/* Spécimen : jamais présentable comme un vrai document */}
        {donnees.specimen && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div
              className="text-[46pt] font-bold tracking-[0.3em] -rotate-[18deg] whitespace-nowrap"
              style={{ color: "#C0392B", opacity: 0.2 }}
            >
              {langue === "fr" ? "SPÉCIMEN" : "SPECIMEN"}
            </div>
          </div>
        )}

        {/* ---------- Contenu ---------- */}
        <div className="relative h-full flex flex-col pl-[16mm] pr-[14mm] pt-[11mm] pb-[10mm]">
          {/* Logo et identité de la conférence, à droite */}
          <div className="absolute top-[12mm] right-[15mm] text-center w-[42mm]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-fsy-2026.png"
              alt="FSY 2026 — Abidjan Ouest"
              className="w-[30mm] h-[30mm] object-contain mx-auto"
            />
            <div
              className="text-[13pt] font-bold tracking-[0.06em] mt-[1mm]"
              style={{ color: BLEU_NUIT, fontFamily: SERIF }}
            >
              FSY 2026
            </div>
            <div className="text-[6.5pt] tracking-[0.42em] mt-[0.6mm]" style={{ color: OR }}>
              ABIDJAN OUEST
            </div>
          </div>

          {/* En-tête */}
          <div className="text-[6.8pt] uppercase tracking-[0.3em] text-slate-500">{t.eglise}</div>
          <div className="text-[9.5pt] font-semibold mt-[1.6mm]" style={{ color: OR }}>
            {t.conference}
          </div>

          {/* Titre */}
          <h1
            className="text-[24pt] leading-[1.08] mt-[5mm] max-w-[130mm]"
            style={{ color: BLEU_NUIT, fontFamily: SERIF }}
          >
            {titre}
          </h1>

          {/* Bandeau de mention */}
          {m && (
            <div className="flex items-center gap-[2.5mm] mt-[3.5mm]">
              <div className="rotate-45 w-[1.5mm] h-[1.5mm]" style={{ background: OR }} />
              <div
                className="px-[7mm] py-[1.6mm] text-[11pt] italic font-semibold"
                style={{
                  fontFamily: SERIF,
                  color: "#FFF8E7",
                  background: `linear-gradient(100deg, ${BLEU_NUIT}, #1B4079)`,
                  border: `0.35mm solid ${OR_CLAIR}`,
                  clipPath:
                    "polygon(3.5mm 0, calc(100% - 3.5mm) 0, 100% 50%, calc(100% - 3.5mm) 100%, 3.5mm 100%, 0 50%)",
                }}
              >
                {langue === "fr" ? m.label : m.labelEn}
              </div>
              <div className="rotate-45 w-[1.5mm] h-[1.5mm]" style={{ background: OR }} />
            </div>
          )}

          {/* Bénéficiaire */}
          <div className="text-[10pt] italic text-slate-600 mt-[5mm]">{t.atteste}</div>
          <div
            className="text-[24pt] leading-tight mt-[1.5mm]"
            style={{ color: BLEU_NUIT, fontFamily: SERIF }}
          >
            {faits.nomComplet}
          </div>
          <div
            className="h-px w-[88mm] mt-[1.8mm]"
            style={{ background: `linear-gradient(90deg, ${OR}, transparent)` }}
          />

          {/* Corps */}
          <p className="text-[10pt] leading-[1.6] mt-[4.5mm] max-w-[172mm]">{intro}</p>
          <p className="text-[8.8pt] leading-[1.55] mt-[2.5mm] max-w-[160mm] text-slate-700">
            {detail}
          </p>

          <div className="text-[9pt] italic text-slate-600 mt-[4mm]">{t.fait(lieu, date)}</div>

          <div className="flex-1" />

          {/* Signatures */}
          <div className="flex items-end gap-[10mm]">
            {SIGNATAIRES.map((s, i) => (
              <div key={s.nom} className="text-center w-[58mm]">
                <div
                  className="text-[19pt] leading-none whitespace-nowrap"
                  style={{ fontFamily: "'Grande Signature', cursive", color: BLEU_NUIT }}
                >
                  {s.nom}
                </div>
                <div className="h-px mt-[1.2mm]" style={{ background: OR_CLAIR }} />
                <div className="text-[8.5pt] font-semibold mt-[1.2mm]" style={{ color: BLEU_NUIT }}>
                  {s.nom}
                </div>
                <div className="text-[7pt]" style={{ color: OR }}>
                  {langue === "fr" ? s.titre : s.titreEn}
                </div>
                {i === 0 && <span className="sr-only">·</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Panneau de vérification, posé sur le pan bleu nuit */}
        <div className="absolute bottom-[9mm] right-[10mm] flex items-center gap-[4mm]">
          <div className="text-right">
            <div className="text-[7.5pt] italic font-semibold" style={{ color: OR_CLAIR }}>
              {t.verifier}
            </div>
            <div className="text-[10.5pt] font-bold text-white mt-[0.6mm]">
              {SITE_AFFICHE}/verification
            </div>
            <div
              className="text-[9.5pt] font-mono font-bold tracking-[0.1em] mt-[1mm] text-white/95"
            >
              {t.code} : <span style={{ color: OR_CLAIR }}>{code}</span>
            </div>
          </div>
          <div
            className="w-[24mm] h-[24mm] bg-white rounded-[1.5mm] p-[1.5mm]"
            style={{ border: `0.5mm solid ${OR_CLAIR}` }}
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        </div>
      </div>
    </div>
  );
}
