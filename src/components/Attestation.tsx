import QRCode from "qrcode";
import {
  CONFERENCE,
  SIGNATAIRES,
  TITRES,
  ampleur,
  competences,
  corpsAttestation,
  corpsAttestationEn,
  mention,
  type FaitsAttestation,
} from "@/lib/attestations";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { signaturesDuCouple } from "@/lib/signatures";
import { SITE_AFFICHE, lienVerification } from "@/lib/site";

const fmtLong = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Le verso est destiné à un lecteur anglophone : la date doit l'être aussi.
const fmtLongEn = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Palette relevée sur le logo officiel : le bleu profond des silhouettes,
// l'ambre du soleil, le vert de la colline. Le document ne réinvente rien, il
// prolonge le logo.
const BLEU = "#015581";
const BLEU_NUIT = "#013F60";
const AMBRE = "#FCB446";
const OR = "#B8860B";
const MENTHE = "#C6E6E5";

// Un document officiel se lit d'abord au caractère. Les familles ci-dessous
// existent sur tous les systèmes : rien à télécharger, donc rien qui puisse
// manquer au moment d'imprimer, à Abidjan comme ailleurs.
const SERIF = "Georgia, 'Times New Roman', Times, serif";

export type DonneesAttestation = {
  code: string;
  role: string;
  sexe: string;
  mention: string | null;
  faits: FaitsAttestation;
  delivreeLe: Date;
  revoqueeLe: Date | null;
  /** Exemplaire de démonstration : barré SPÉCIMEN, ne peut pas être confondu avec un vrai. */
  specimen?: boolean;
};

// ---------- Éléments de décor ----------

// Filet losangé : le petit ornement qui sépare l'en-tête du titre.
function Filet({ couleur = OR, largeur = "100%" }: { couleur?: string; largeur?: string }) {
  return (
    <div className="flex items-center gap-2 my-[3mm]" style={{ width: largeur }}>
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${couleur})` }} />
      <div className="rotate-45 w-[1.6mm] h-[1.6mm]" style={{ background: couleur }} />
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${couleur}, transparent)` }} />
    </div>
  );
}

// Cadre à double filet et coins renforcés. C'est ce qui distingue au premier
// coup d'œil un document délivré d'une page imprimée à la maison.
function Cadre() {
  const coin = (pos: string) => (
    <div key={pos} className={`absolute ${pos} w-[12mm] h-[12mm]`}>
      <div className="absolute inset-0 border-t-2 border-l-2" style={{ borderColor: OR }} />
    </div>
  );
  return (
    <>
      <div className="absolute inset-[7mm] border" style={{ borderColor: BLEU, opacity: 0.55 }} />
      <div className="absolute inset-[9mm] border-[0.5px]" style={{ borderColor: OR, opacity: 0.75 }} />
      <div className="absolute inset-[7mm] pointer-events-none">
        {coin("top-0 left-0")}
        <div className="absolute top-0 right-0 w-[12mm] h-[12mm] rotate-90">
          <div className="absolute inset-0 border-t-2 border-l-2" style={{ borderColor: OR }} />
        </div>
        <div className="absolute bottom-0 right-0 w-[12mm] h-[12mm] rotate-180">
          <div className="absolute inset-0 border-t-2 border-l-2" style={{ borderColor: OR }} />
        </div>
        <div className="absolute bottom-0 left-0 w-[12mm] h-[12mm] -rotate-90">
          <div className="absolute inset-0 border-t-2 border-l-2" style={{ borderColor: OR }} />
        </div>
      </div>
    </>
  );
}

// Sceau de mention, à la droite des signatures — la place qu'occupe le cachet
// sur un document officiel. Le mettre près du titre le ferait chevaucher, et
// une mention ne doit pas gêner la lecture de ce qui est attesté.
function Sceau({ texte, sous }: { texte: string; sous: string }) {
  return (
    <div
      className="w-[28mm] h-[28mm] rounded-full flex flex-col items-center justify-center text-center shrink-0"
      style={{
        background: `radial-gradient(circle at 32% 26%, #FFF6E0, ${AMBRE})`,
        border: `1.2mm solid ${OR}`,
        boxShadow: `0 0 0 0.5mm #FFFFFF, 0 0 0 0.8mm ${OR}`,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div className="text-[5.5pt] uppercase tracking-[0.18em]" style={{ color: BLEU_NUIT }}>
        {sous}
      </div>
      <div
        className="text-[8.5pt] font-bold leading-[1.1] px-[2mm] mt-[0.4mm]"
        style={{ color: BLEU_NUIT, fontFamily: SERIF }}
      >
        {texte}
      </div>
    </div>
  );
}

// Bandeau de chiffres. C'est la partie que lit un recruteur : trois nombres
// valent mieux qu'un paragraphe d'adjectifs.
function Chiffres({ cellules }: { cellules: [string, string][] }) {
  if (cellules.length === 0) return null;
  return (
    <div
      className="flex mt-[5mm] rounded-[1mm] overflow-hidden"
      style={{
        border: `0.3mm solid ${MENTHE}`,
        background: "#F7FBFD",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {cellules.map(([valeur, label], i) => (
        <div
          key={label}
          className="flex-1 text-center py-[3mm] px-[2mm]"
          style={i > 0 ? { borderLeft: `0.3mm solid ${MENTHE}` } : undefined}
        >
          <div className="text-[15pt] font-bold leading-none" style={{ color: BLEU, fontFamily: SERIF }}>
            {valeur}
          </div>
          <div className="text-[6.5pt] uppercase tracking-[0.1em] mt-[1.2mm] text-slate-500">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// Compétences, sur deux colonnes. C'est la raison d'être du document : un
// employeur ne lit pas un récit, il cherche ce que la personne sait faire.
function Competences({ titre, items }: { titre: string; items: string[] }) {
  return (
    <div className="mt-[6mm]">
      <div
        className="text-[7.5pt] uppercase tracking-[0.22em] pb-[1.5mm]"
        style={{ color: BLEU, borderBottom: `0.3mm solid ${MENTHE}` }}
      >
        {titre}
      </div>
      <div className="grid grid-cols-2 gap-x-[8mm] gap-y-[1.6mm] mt-[3mm]">
        {items.map((c) => (
          <div key={c} className="flex items-start gap-[2mm] text-[9pt] leading-snug">
            <span
              className="rotate-45 w-[1.2mm] h-[1.2mm] mt-[1.6mm] shrink-0"
              style={{ background: OR, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
            />
            <span>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Une feuille A4 **portrait** : c'est le format que sort n'importe quelle
// imprimante sans qu'on ait à toucher aux réglages, y compris depuis un
// téléphone. Un certificat à l'italienne se retrouve coupé une fois sur deux.
function Feuille({
  children,
  derniere = false,
}: {
  children: React.ReactNode;
  /** Un saut de page après la dernière feuille produirait une page blanche. */
  derniere?: boolean;
}) {
  return (
    <div
      className={`bg-white text-slate-900 mx-auto shadow-lg print:shadow-none relative overflow-hidden ${
        derniere ? "" : "break-after-page"
      }`}
      style={{
        width: "210mm",
        // 0.5 mm de moins qu'une page : un arrondi de rendu suffirait sinon à
        // faire déborder la feuille sur la page suivante, et l'attestation
        // sortirait en trois pages dont une blanche.
        height: "296.5mm",
        breakInside: "avoid",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {children}
    </div>
  );
}

export async function Attestation({
  donnees,
  derniere = true,
}: {
  donnees: DonneesAttestation;
  /** Faux quand d'autres attestations suivent, à l'impression en lot de la clôture. */
  derniere?: boolean;
}) {
  const { code, role, sexe, faits } = donnees;
  const m = mention(donnees.mention);
  const url = lienVerification(code);
  // Le QR est rendu côté serveur, en SVG : net à l'impression quelle que soit la
  // taille, et sans script à charger.
  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: BLEU_NUIT, light: "#ffffff" },
  });
  const titre = TITRES[role] ?? TITRES.CONSEILLER;
  const comp = competences(role);

  // Signatures manuscrites du couple, tracées dans l'application. Sur les
  // vrais documents seulement : le spécimen garde son rendu sans tracé.
  const signatures = donnees.specimen ? {} : await signaturesDuCouple();

  // Le corps est écrit en deux temps : ce qui a été exercé, puis le détail des
  // responsabilités. On les met en page différemment.
  const [intro, detail] = corpsAttestation(role, sexe, faits).split("\n\n");
  const [introEn, detailEn] = corpsAttestationEn(role, faits).split("\n\n");

  const chiffres: [string, string][] = [
    ...(faits.jeunesEncadres > 0
      ? ([[String(faits.jeunesEncadres), "jeunes encadrés"]] as [string, string][])
      : []),
    [String(CONFERENCE.jours), "jours de responsabilité"],
    [`${faits.rapportsRemis}/${faits.rapportsPossibles}`, "comptes rendus remis"],
    ...(faits.jeunesEncadres > 0
      ? []
      : ([[String(ampleur(faits).participants), "participants encadrés"]] as [string, string][])),
  ];
  const chiffresEn: [string, string][] = [
    ...(faits.jeunesEncadres > 0
      ? ([[String(faits.jeunesEncadres), "youth supervised"]] as [string, string][])
      : []),
    [String(CONFERENCE.jours), "days on duty"],
    [`${faits.rapportsRemis}/${faits.rapportsPossibles}`, "daily reports filed"],
    ...(faits.jeunesEncadres > 0
      ? []
      : ([[String(ampleur(faits).participants), "participants"]] as [string, string][])),
  ];

  // Filigrane : le logo en très grand, presque effacé. Il occupe le vide au
  // centre de la page, que le texte seul laisserait nu.
  // Barré en travers de la page : un spécimen imprimé ne doit jamais pouvoir
  // être présenté comme une attestation véritable.
  const BarreSpecimen = () =>
    donnees.specimen ? (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div
          // 40 pt : à cette taille le mot tient en entier dans la diagonale
          // d'une A4 portrait. Plus gros, ses extrémités sortaient de la page.
          className="text-[40pt] font-bold tracking-[0.28em] -rotate-[32deg] whitespace-nowrap"
          style={{
            color: "#C0392B",
            opacity: 0.22,
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
          }}
        >
          SPÉCIMEN
        </div>
      </div>
    ) : null;

  const Filigrane = () => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-fsy-2026.png"
      alt=""
      aria-hidden
      className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 w-[120mm] pointer-events-none"
      style={{ opacity: 0.055, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    />
  );

  const EnTete = ({ eglise, conference }: { eglise: string; conference: string }) => (
    <div className="flex flex-col items-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-fsy-2026.png"
        alt="FSY 2026 — Abidjan Ouest"
        className="w-[22mm] h-[22mm] object-contain"
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      />
      <div className="text-[7pt] uppercase tracking-[0.28em] text-slate-500 mt-[2.5mm]">
        {eglise}
      </div>
      <div
        className="text-[10.5pt] tracking-[0.08em] mt-[1mm]"
        style={{ color: BLEU, fontFamily: SERIF }}
      >
        {conference}
      </div>
    </div>
  );

  const Signatures = ({ en = false }: { en?: boolean }) => (
    <div className="flex items-end justify-between gap-[6mm]">
      {SIGNATAIRES.map((s) => (
        <div key={s.nom} className="text-center">
          {signatures[s.nom] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatures[s.nom]}
              alt=""
              className="w-[46mm] h-[13mm] object-contain mx-auto mb-[0.6mm]"
            />
          )}
          <div className="w-[46mm] h-px" style={{ background: BLEU, opacity: 0.5 }} />
          <div className="text-[9.5pt] font-semibold mt-[1.5mm]" style={{ fontFamily: SERIF }}>
            {s.nom}
          </div>
          <div className="text-[7pt] uppercase tracking-[0.12em] text-slate-500 mt-[0.5mm]">
            {en ? s.titreEn : s.titre}
          </div>
        </div>
      ))}
      {m ? (
        <Sceau
          texte={en ? m.labelEn : m.label.replace(/^Mention /, "")}
          sous={en ? "Awarded" : "Mention"}
        />
      ) : (
        <div className="w-[28mm]" />
      )}
    </div>
  );

  const PiedDePage = ({ en = false }: { en?: boolean }) => (
    <div
      className="flex items-end justify-between gap-[6mm] mt-[7mm] pt-[4mm]"
      style={{ borderTop: `0.3mm solid ${MENTHE}` }}
    >
      <div className="text-[7pt] text-slate-500 leading-snug max-w-[105mm]">
        {en
          ? "This certificate is registered by the conference direction. Its authenticity, and the figures behind it, can be checked at any time at the address opposite — type the address yourself in your browser: only that exact address is authoritative."
          : "Cette attestation est enregistrée par la direction de la conférence. Son authenticité et le détail des chiffres peuvent être vérifiés à tout moment à l'adresse ci-contre — saisissez-la vous-même dans votre navigateur : elle seule fait foi."}
      </div>
      <div className="flex items-center gap-[3mm] shrink-0">
        <div className="text-right">
          <div className="text-[6.5pt] uppercase tracking-[0.14em] text-slate-500">
            {en ? "Verify at" : "Vérifier sur"}
          </div>
          <div className="text-[8pt]" style={{ color: BLEU }}>
            {SITE_AFFICHE}/verification
          </div>
          <div
            className="text-[11pt] font-mono font-bold tracking-[0.12em] mt-[0.5mm]"
            style={{ color: BLEU_NUIT }}
          >
            {code}
          </div>
        </div>
        <div
          className="w-[20mm] h-[20mm] p-[1mm] bg-white"
          style={{ border: `0.3mm solid ${MENTHE}` }}
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* ---------- Recto : français ---------- */}
      <Feuille>
        {/* Bandeau de tête, repris des couleurs du logo */}
        <div
          className="absolute inset-x-0 top-0 h-[4mm]"
          style={{
            background: `linear-gradient(90deg, ${BLEU_NUIT}, ${BLEU} 45%, #7FB77E 72%, ${AMBRE})`,
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
          }}
        />
        <Cadre />
        <Filigrane />
        <BarreSpecimen />

        <div className="relative h-full flex flex-col px-[20mm] pt-[16mm] pb-[13mm]">
          <EnTete
            eglise="Église de Jésus-Christ des Saints des Derniers Jours"
            conference={`Conférence pour la jeunesse · ${CONFERENCE.nom}`}
          />

          <Filet />

          <div className="text-center">
            <div className="text-[8pt] uppercase tracking-[0.35em] text-slate-500">Attestation</div>
            <h1
              className="text-[21pt] leading-[1.15] mt-[2mm] max-w-[125mm] mx-auto"
              style={{ color: BLEU_NUIT, fontFamily: SERIF }}
            >
              {titre.fr}
            </h1>
          </div>

          <div className="text-center mt-[9mm]">
            <div className="text-[9.5pt] italic text-slate-600">Le couple dirigeant atteste que</div>
            <div
              className="text-[25pt] leading-tight mt-[2mm]"
              style={{ color: BLEU_NUIT, fontFamily: SERIF }}
            >
              {faits.nomComplet}
            </div>
            <div
              className="h-px w-[95mm] mx-auto mt-[3mm]"
              style={{ background: `linear-gradient(90deg, transparent, ${OR}, transparent)` }}
            />
          </div>

          <p className="text-[10.5pt] leading-[1.65] mt-[7mm] text-justify">{intro}</p>
          <p className="text-[9.5pt] leading-[1.6] mt-[4mm] text-justify text-slate-700">{detail}</p>

          <Chiffres cellules={chiffres} />
          <Competences titre="Compétences mises en œuvre" items={comp.fr} />

          {/* Le blanc de la page se place ici, entre les compétences et les
              signatures : le bas du document reste ancré à la marge. */}
          <div className="flex-1 min-h-[6mm]" />

          <div className="text-[8.5pt] text-slate-500 mb-[6mm]">
            Fait à {CONFERENCE.lieu}, le {fmtLong.format(donnees.delivreeLe)}.
          </div>

          <Signatures />
          <PiedDePage />
        </div>
      </Feuille>

      {/* ---------- Verso : anglais ---------- */}
      <Feuille derniere={derniere}>
        <div
          className="absolute inset-x-0 top-0 h-[4mm]"
          style={{
            background: `linear-gradient(90deg, ${BLEU_NUIT}, ${BLEU} 45%, #7FB77E 72%, ${AMBRE})`,
            printColorAdjust: "exact",
            WebkitPrintColorAdjust: "exact",
          }}
        />
        <Cadre />
        <Filigrane />
        <BarreSpecimen />

        <div className="relative h-full flex flex-col px-[20mm] pt-[16mm] pb-[13mm]">
          <EnTete
            eglise="The Church of Jesus Christ of Latter-day Saints"
            conference={`${CONFERENCE.nom} · Youth Conference`}
          />

          <Filet />

          <div className="text-center">
            <div className="text-[8pt] uppercase tracking-[0.35em] text-slate-500">Certificate</div>
            <h1
              className="text-[21pt] leading-[1.15] mt-[2mm] max-w-[125mm] mx-auto"
              style={{ color: BLEU_NUIT, fontFamily: SERIF }}
            >
              {titre.en}
            </h1>
          </div>

          <div className="text-center mt-[9mm]">
            <div className="text-[9.5pt] italic text-slate-600">This is to certify that</div>
            <div
              className="text-[25pt] leading-tight mt-[2mm]"
              style={{ color: BLEU_NUIT, fontFamily: SERIF }}
            >
              {faits.nomComplet}
            </div>
            <div
              className="h-px w-[95mm] mx-auto mt-[3mm]"
              style={{ background: `linear-gradient(90deg, transparent, ${OR}, transparent)` }}
            />
          </div>

          <p className="text-[10.5pt] leading-[1.65] mt-[7mm] text-justify">{introEn}</p>
          <p className="text-[9.5pt] leading-[1.6] mt-[4mm] text-justify text-slate-700">
            {detailEn}
          </p>

          <Chiffres cellules={chiffresEn} />
          <Competences titre="Competencies demonstrated" items={comp.en} />

          <div className="flex-1 min-h-[6mm]" />

          <div className="text-[8.5pt] text-slate-500 mb-[6mm]">
            Issued in {CONFERENCE.lieuEn} on {fmtLongEn.format(donnees.delivreeLe)}.
          </div>

          <Signatures en />
          <PiedDePage en />
        </div>
      </Feuille>
    </>
  );
}

// Détail chiffré, affiché à l'écran et sur la page de vérification — pas sur le
// document lui-même, qui doit rester lisible d'un coup d'œil.
export function DetailAttestation({
  role,
  faits,
}: {
  role: string;
  faits: FaitsAttestation;
}) {
  const lignes: [string, string][] = [
    ["Fonction exercée", ROLE_LABELS[role as Role] ?? role],
    ...(faits.groupes.length > 0
      ? ([["Groupe encadré", faits.groupes.join(", ")]] as [string, string][])
      : []),
    ...(faits.compagnie ? ([["Compagnie dirigée", faits.compagnie]] as [string, string][]) : []),
    ...(faits.jeunesEncadres > 0
      ? ([["Jeunes sous sa responsabilité", String(faits.jeunesEncadres)]] as [string, string][])
      : []),
    [
      "Rapports quotidiens remis",
      `${faits.rapportsRemis} sur ${faits.rapportsPossibles}`,
    ],
    ...(faits.pointagesValides > 0
      ? ([["Présences validées au pointage", String(faits.pointagesValides)]] as [string, string][])
      : []),
    ...(faits.responsabilitesCars.length > 0
      ? ([["Pointages sous sa charge", faits.responsabilitesCars.join(" · ")]] as [string, string][])
      : []),
  ];

  return (
    <dl className="divide-y divide-slate-100 text-sm">
      {lignes.map(([k, v]) => (
        <div key={k} className="py-2 flex justify-between gap-4">
          <dt className="text-slate-500">{k}</dt>
          <dd className="font-medium text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
