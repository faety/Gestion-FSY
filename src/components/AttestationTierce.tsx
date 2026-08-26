import QRCode from "qrcode";
import { CONFERENCE, SIGNATAIRES } from "@/lib/attestations";
import {
  ATTESTE,
  ampleurTiers,
  corpsTiers,
  lireFaitsTiers,
  nature as natureDe,
  titreTiers,
  type FaitsTiers,
} from "@/lib/attestations-tierces";
import { signaturesDuCouple } from "@/lib/signatures";
import { SITE_AFFICHE, lienVerification } from "@/lib/site";

// L'attestation d'un fournisseur ou d'un bénévole, sur une feuille à
// l'italienne — la même famille visuelle que le modèle Prestige des
// encadrants : c'est la même conférence qui délivre, et un traiteur qui pose
// son attestation à côté de celle d'un conseiller doit y reconnaître la même
// main.
//
// Ce qui change, et pourquoi :
//
//   • pas de mention (Excellence, Rigueur) : elles récompensent une assiduité
//     que l'application a mesurée. Ici elle n'a rien mesuré du tout — inventer
//     une distinction serait la seule chose vraiment malhonnête de ce document ;
//   • pas de grille de compétences : un fournisseur n'a pas à se voir décerner
//     des « compétences » par son client ;
//   • à la place, les faits que le couple a constatés et saisis lui-même, cités
//     tels quels.
//
// La page est déclarée paysage à l'impression (StyleImpression), jamais
// pivotée : voir FeuilleImprimable.tsx pour ce que coûte l'acrobatie inverse.

const BLEU_NUIT = "#123361";
const BLEU_ROYAL = "#1D4ED8";
const OR = "#B8860B";
const OR_CLAIR = "#D4A83C";
const CREME = "#FDFBF5";
const SERIF = "Georgia, 'Times New Roman', Times, serif";

const fmtLong = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const STYLE_POLICE = `
@font-face {
  font-family: "Grande Signature";
  src: url("/fonts/great-vibes-latin-400-normal.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: block;
}`;

export type DonneesTierce = {
  code: string;
  genre: string;
  nature: string;
  /** Le JSON figé, tel qu'il est en base. */
  faits: string | FaitsTiers;
  delivreeLe: Date;
  specimen?: boolean;
};

export async function AttestationTierce({
  donnees,
  derniere = true,
}: {
  donnees: DonneesTierce;
  derniere?: boolean;
}) {
  const f = typeof donnees.faits === "string" ? lireFaitsTiers(donnees.faits) : donnees.faits;
  const n = natureDe(donnees.nature);
  const titre = titreTiers(donnees.genre);
  const [intro, conclusion] = corpsTiers(donnees.genre, f).split("\n\n");
  const a = ampleurTiers(f);

  const qr = await QRCode.toString(lienVerification(donnees.code), {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: BLEU_NUIT, light: "#ffffff" },
  });

  const signatures = donnees.specimen ? {} : await signaturesDuCouple();

  // La ligne sous le nom, quand il y a quelque chose à ajouter. Répéter là le
  // domaine de la prestation ne dirait rien de plus que le bandeau juste
  // au-dessus : mieux vaut du blanc qu'un doublon.
  const sousTitre =
    donnees.genre === "PERSONNE"
      ? f.fonction?.trim() || ""
      : f.representant?.trim()
        ? `Représenté par ${f.representant.trim()}`
        : "";

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
        {/* ---------- Décor : celui du modèle Prestige ---------- */}
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
        <svg
          className="absolute bottom-0 right-0 pointer-events-none"
          style={{ width: "150mm", height: "96mm" }}
          viewBox="0 0 150 96"
          aria-hidden
        >
          <path d="M150 96 H30 C74 76 96 40 150 10 Z" fill={BLEU_NUIT} />
          <path d="M27 96 C72 75 94 39 150 8.5 V6 C92 37 68 74 21 96 Z" fill={OR_CLAIR} />
          <path d="M150 96 H92 C114 84 128 66 150 52 Z" fill="#0C2547" opacity="0.55" />
        </svg>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-fsy-2026.png"
          alt=""
          aria-hidden
          className="absolute left-[8mm] top-[52%] -translate-y-1/2 w-[78mm] pointer-events-none"
          style={{ opacity: 0.07 }}
        />

        <div
          className="absolute inset-[4.5mm] rounded-[4mm] pointer-events-none"
          style={{ border: `0.7mm solid ${OR_CLAIR}` }}
        />
        <div
          className="absolute inset-[6.2mm] rounded-[3mm] pointer-events-none"
          style={{ border: `0.2mm solid ${OR}`, opacity: 0.65 }}
        />

        {donnees.specimen && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div
              className="text-[46pt] font-bold tracking-[0.3em] -rotate-[18deg] whitespace-nowrap"
              style={{ color: "#C0392B", opacity: 0.2 }}
            >
              SPÉCIMEN
            </div>
          </div>
        )}

        {/* ---------- Contenu ---------- */}
        <div className="relative h-full flex flex-col pl-[16mm] pr-[14mm] pt-[11mm] pb-[10mm]">
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

          <div className="text-[6.8pt] uppercase tracking-[0.3em] text-slate-500">
            Église de Jésus-Christ des Saints des Derniers Jours
          </div>
          <div className="text-[9.5pt] font-semibold mt-[1.6mm]" style={{ color: OR }}>
            Conférence pour la jeunesse {CONFERENCE.nom}
          </div>

          <h1
            className="text-[24pt] leading-[1.08] mt-[5mm] max-w-[130mm]"
            style={{ color: BLEU_NUIT, fontFamily: SERIF }}
          >
            {titre}
          </h1>

          {/* Le domaine de la prestation, à la place du bandeau de mention :
              on situe, on ne décerne pas. */}
          {n && n.cle !== "AUTRE" && (
            <div className="flex items-center gap-[2.5mm] mt-[3.5mm]">
              <div className="rotate-45 w-[1.5mm] h-[1.5mm]" style={{ background: OR }} />
              <div
                className="px-[7mm] py-[1.6mm] text-[10.5pt] italic font-semibold"
                style={{
                  fontFamily: SERIF,
                  color: "#FFF8E7",
                  background: `linear-gradient(100deg, ${BLEU_NUIT}, #1B4079)`,
                  border: `0.35mm solid ${OR_CLAIR}`,
                  clipPath:
                    "polygon(3.5mm 0, calc(100% - 3.5mm) 0, 100% 50%, calc(100% - 3.5mm) 100%, 3.5mm 100%, 0 50%)",
                }}
              >
                {n.label}
              </div>
              <div className="rotate-45 w-[1.5mm] h-[1.5mm]" style={{ background: OR }} />
            </div>
          )}

          <div className="text-[10pt] italic text-slate-600 mt-[5mm]">{ATTESTE}</div>
          <div
            className="text-[22pt] leading-tight mt-[1.5mm] max-w-[168mm]"
            style={{ color: BLEU_NUIT, fontFamily: SERIF }}
          >
            {f.beneficiaire}
          </div>
          {sousTitre && (
            <div className="text-[8.5pt] text-slate-600 mt-[0.8mm]">{sousTitre}</div>
          )}
          <div
            className="h-px w-[88mm] mt-[1.8mm]"
            style={{ background: `linear-gradient(90deg, ${OR}, transparent)` }}
          />

          <p className="text-[10pt] leading-[1.55] mt-[4mm] max-w-[172mm]">{intro}</p>
          <p className="text-[8.8pt] leading-[1.5] mt-[2.5mm] max-w-[164mm] text-slate-700">
            {conclusion}
          </p>

          {/* Les faits constatés, cités tels que le couple les a saisis. Sur
              deux colonnes quand il y en a plus de trois. */}
          {f.precisions.length > 0 && (
            <div className="mt-[3.5mm] max-w-[164mm]">
              <div
                className="text-[7pt] uppercase tracking-[0.22em] pb-[1.1mm]"
                style={{ color: OR, borderBottom: `0.2mm solid ${OR_CLAIR}` }}
              >
                Constaté par la direction de la conférence
              </div>
              <div
                className={`grid ${f.precisions.length > 3 ? "grid-cols-2" : "grid-cols-1"} gap-x-[8mm] gap-y-[1.2mm] mt-[2mm]`}
              >
                {f.precisions.map((p) => (
                  <div key={p} className="flex items-start gap-[2mm] text-[8.3pt] leading-snug">
                    <span
                      className="rotate-45 w-[1.1mm] h-[1.1mm] mt-[1.4mm] shrink-0"
                      style={{ background: OR }}
                    />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* L'ampleur de l'événement : ce qui donne sa portée à la référence
              quand un fournisseur la joindra à un appel d'offres. */}
          <div className="flex items-stretch gap-[6mm] mt-[3.5mm] max-w-[150mm]">
            {(
              [
                [String(a.participants), "participants encadrés"],
                [String(CONFERENCE.jours), "jours de conférence"],
                [String(a.encadrants), "encadrants mobilisés"],
              ] as [string, string][]
            ).map(([valeur, label], i) => (
              <div
                key={label}
                className="flex-1 text-center py-[2.2mm] px-[2mm]"
                style={{
                  borderTop: `0.5mm solid ${OR_CLAIR}`,
                  borderBottom: `0.2mm solid ${OR_CLAIR}`,
                  background: i % 2 === 0 ? "#FAF6EC" : "#F7F8FC",
                }}
              >
                <div
                  className="text-[15pt] font-bold leading-none"
                  style={{ color: BLEU_NUIT, fontFamily: SERIF }}
                >
                  {valeur}
                </div>
                <div className="text-[6.3pt] uppercase tracking-[0.12em] mt-[1.1mm] text-slate-500">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1" />

          <div className="text-[9pt] italic text-slate-600 mb-[2.5mm]">
            Fait à {CONFERENCE.villePays}, le {fmtLong.format(donnees.delivreeLe)}.
          </div>

          <div className="flex items-end gap-[10mm]">
            {SIGNATAIRES.map((s) => (
              <div key={s.nom} className="text-center w-[58mm]">
                {signatures[s.nom] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signatures[s.nom]}
                    alt=""
                    className="h-[14mm] max-w-[54mm] object-contain mx-auto"
                  />
                ) : (
                  <div
                    className="text-[19pt] leading-none whitespace-nowrap"
                    style={{ fontFamily: "'Grande Signature', cursive", color: BLEU_NUIT }}
                  >
                    {s.nom}
                  </div>
                )}
                <div className="h-px mt-[1.2mm]" style={{ background: OR_CLAIR }} />
                <div className="text-[8.5pt] font-semibold mt-[1.2mm]" style={{ color: BLEU_NUIT }}>
                  {s.nom}
                </div>
                <div className="text-[7pt]" style={{ color: OR }}>
                  {s.titre}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-[9mm] right-[10mm] flex items-center gap-[4mm]">
          <div className="text-right">
            <div className="text-[7.5pt] italic font-semibold" style={{ color: OR_CLAIR }}>
              Vérifier sur
            </div>
            <div className="text-[10.5pt] font-bold text-white mt-[0.6mm]">
              {SITE_AFFICHE}/verification
            </div>
            <div className="text-[9.5pt] font-mono font-bold tracking-[0.1em] mt-[1mm] text-white/95">
              Code : <span style={{ color: OR_CLAIR }}>{donnees.code}</span>
            </div>
            <div className="text-[6.3pt] italic text-white/80 mt-[1mm] max-w-[52mm] ml-auto leading-snug">
              Saisissez l&apos;adresse vous-même : elle seule fait foi.
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
