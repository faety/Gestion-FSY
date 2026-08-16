"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { demanderSignatureSouvenir, enregistrerPhotoSouvenir } from "@/lib/actions";

// Le photobooth de l'iPad : caméra frontale plein écran, un cadre FSY au
// choix, compte à rebours, et la photo part dans la galerie de l'événement.
// Pensé pour des jeunes qui passent en coup de vent : trois gros boutons,
// aucun réglage, et la tablette ne quitte jamais cette page.
//
// Format 3:4 (1200×1600), celui de la caméra frontale de l'iPad.

// Les cadres, dans l'ordre d'affichage : d'abord les officiels fournis par le
// couple dirigeant, puis les classiques, puis jeunes filles et jeunes gens.
// Chacun choisit librement, les catégories ne sont qu'un repère. Un cadre
// porte son propre format (3:4 par défaut, 9:16 pour les visuels « story ») —
// la scène et la photo prennent le format du cadre choisi.
type Cadre = {
  cle: string;
  nom: string;
  groupe: string;
  src: string;
  largeur?: number;
  hauteur?: number;
};

// La base des designs ; chaque entrée existe en portrait (3:4) et en
// paysage (4:3) — le fichier paysage porte le suffixe « -paysage ».
const DESIGNS = [
  { cle: "marche", nom: "Marche avec moi", groupe: "Classiques" },
  { cle: "souvenir", nom: "Souvenir", groupe: "Classiques" },
  { cle: "grace", nom: "Tu as du prix", groupe: "Jeunes filles" },
  { cle: "fleurs", nom: "Fleurs", groupe: "Jeunes filles" },
  { cle: "etoiles", nom: "Lève-toi, brille", groupe: "Jeunes filles" },
  { cle: "joie", nom: "La joie", groupe: "Jeunes filles" },
  { cle: "courage", nom: "Courage", groupe: "Jeunes gens" },
  { cle: "armure", nom: "Armure de Dieu", groupe: "Jeunes gens" },
  { cle: "temple", nom: "Temple", groupe: "Jeunes gens" },
  { cle: "force", nom: "Je peux tout", groupe: "Jeunes gens" },
];

const CADRES: Cadre[] = [
  ...DESIGNS.map((d) => ({ ...d, src: `/cadres/cadre-${d.cle}.png` })),
  ...DESIGNS.map((d) => ({
    ...d,
    cle: `${d.cle}-paysage`,
    src: `/cadres/cadre-${d.cle}-paysage.png`,
    largeur: 1600,
    hauteur: 1200,
  })),
];

const LARGEUR = 1200;
const HAUTEUR = 1600;
const dimsDe = (c: Cadre) => ({ largeur: c.largeur ?? LARGEUR, hauteur: c.hauteur ?? HAUTEUR });
const estPaysage = (c: Cadre) => dimsDe(c).largeur > dimsDe(c).hauteur;

export function Photobooth() {
  const refVideo = useRef<HTMLVideoElement>(null);
  const refFlux = useRef<MediaStream | null>(null);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cadre, setCadre] = useState<(typeof CADRES)[number]>(CADRES[0]);
  const [compte, setCompte] = useState<number | null>(null);
  const [cliche, setCliche] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<"repos" | "en-cours" | "fait" | "rate">("repos");
  const [nbPrises, setNbPrises] = useState(0);
  // Frontale par défaut (selfie) ; l'arrière sert quand un encadrant
  // photographie quelqu'un d'autre avec son téléphone.
  const [face, setFace] = useState<"user" | "environment">("user");
  const miroir = face === "user";

  // Portrait ou paysage : chaque design existe dans les deux sens. La bascule
  // garde le même design, en changeant simplement d'orientation.
  const paysage = estPaysage(cadre);
  function basculerOrientation() {
    const base = cadre.cle.replace(/-paysage$/, "");
    const cible = paysage ? base : `${base}-paysage`;
    const equivalent = CADRES.find((c) => c.cle === cible);
    if (equivalent) setCadre(equivalent);
  }
  const cadresVisibles = CADRES.filter((c) => estPaysage(c) === paysage);

  // Démarrer la caméra. Safari exige HTTPS et un geste utilisateur pour
  // certains réglages ; on tente au chargement, avec un bouton de reprise.
  const demarrer = useCallback(async (facingMode: "user" | "environment") => {
    setErreur(null);
    refFlux.current?.getTracks().forEach((t) => t.stop());
    try {
      const flux = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false,
      });
      refFlux.current = flux;
      if (refVideo.current) {
        refVideo.current.srcObject = flux;
        await refVideo.current.play();
      }
      setPret(true);
    } catch {
      setErreur(
        "Caméra inaccessible. Autorisez la caméra pour ce site dans les réglages du navigateur, puis réessayez."
      );
    }
  }, []);

  useEffect(() => {
    demarrer(face);
    const flux = refFlux;
    return () => flux.current?.getTracks().forEach((t) => t.stop());
  }, [demarrer, face]);

  // Compte à rebours puis capture : la vidéo est dessinée en miroir (comme la
  // prévisualisation — on se reconnaît), recadrée pour couvrir le 3:4, puis le
  // cadre par-dessus.
  function lancerPrise() {
    if (!pret || compte !== null) return;
    setCompte(3);
    const pas = (n: number) => {
      if (n === 0) {
        capturer();
        setCompte(null);
        return;
      }
      setCompte(n);
      setTimeout(() => pas(n - 1), 900);
    };
    setTimeout(() => pas(2), 900);
  }

  async function capturer() {
    const video = refVideo.current;
    if (!video) return;
    const { largeur, hauteur } = dimsDe(cadre);
    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;
    const ctx = canvas.getContext("2d")!;
    const vw = video.videoWidth || largeur;
    const vh = video.videoHeight || hauteur;
    // Recadrage « cover » : la vidéo remplit le format du cadre, centrée.
    const echelle = Math.max(largeur / vw, hauteur / vh);
    const dw = vw * echelle;
    const dh = vh * echelle;
    if (miroir) {
      ctx.translate(largeur, 0);
      ctx.scale(-1, 1); // en selfie, la photo garde le miroir de l'aperçu
    }
    ctx.drawImage(video, (largeur - dw) / 2, (hauteur - dh) / 2, dw, dh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const imageCadre = new Image();
    imageCadre.src = cadre.src;
    await new Promise((r) => {
      imageCadre.onload = r;
      imageCadre.onerror = r;
    });
    ctx.drawImage(imageCadre, 0, 0, largeur, hauteur);
    setCliche(canvas.toDataURL("image/jpeg", 0.88));
    setEnvoi("repos");
  }

  // Garder la photo sur SON appareil — le cas des encadrants qui utilisent le
  // photobooth depuis leur téléphone. Un blob passe partout, y compris Safari.
  function telecharger() {
    if (!cliche) return;
    const octets = atob(cliche.split(",")[1]);
    const tampon = new Uint8Array(octets.length);
    for (let i = 0; i < octets.length; i++) tampon[i] = octets.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([tampon], { type: "image/jpeg" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `souvenir-fsy-2026-${Date.now()}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function garder() {
    if (!cliche || envoi === "en-cours") return;
    setEnvoi("en-cours");
    try {
      const sig = await demanderSignatureSouvenir();
      if (sig) {
        const corps = new FormData();
        corps.set("file", cliche);
        corps.set("api_key", sig.apiKey);
        corps.set("timestamp", String(sig.timestamp));
        corps.set("folder", sig.folder);
        corps.set("type", sig.type);
        corps.set("signature", sig.signature);
        const reponse = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
          method: "POST",
          body: corps,
        });
        if (!reponse.ok) throw new Error(String(reponse.status));
        const r = await reponse.json();
        const res = await enregistrerPhotoSouvenir({ publicId: r.public_id, cadre: cadre.cle });
        if (!res.ok) throw new Error(res.motif);
      } else {
        // Sans Cloudinary : version réduite en base.
        const d = dimsDe(cadre);
        const petit = document.createElement("canvas");
        petit.width = 750;
        petit.height = Math.round((750 * d.hauteur) / d.largeur);
        const pctx = petit.getContext("2d")!;
        const img = new Image();
        img.src = cliche;
        await new Promise((r) => (img.onload = r));
        pctx.drawImage(img, 0, 0, petit.width, petit.height);
        const res = await enregistrerPhotoSouvenir({
          image: petit.toDataURL("image/jpeg", 0.8),
          cadre: cadre.cle,
        });
        if (!res.ok) throw new Error(res.motif);
      }
      setEnvoi("fait");
      setNbPrises((n) => n + 1);
      setTimeout(() => setCliche(null), 1600);
    } catch {
      setEnvoi("rate");
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center select-none">
      {/* Scène 3:4 */}
      <div
        className="relative"
        style={{
          // La scène prend la plus grande taille possible au ratio du cadre,
          // dans les deux sens — écran portrait ou paysage.
          aspectRatio: `${dimsDe(cadre).largeur} / ${dimsDe(cadre).hauteur}`,
          width: `min(100vw, calc(100dvh * ${dimsDe(cadre).largeur / dimsDe(cadre).hauteur}))`,
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={refVideo}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${miroir ? "-scale-x-100" : ""}`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cadre.src} alt="" className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Compte à rebours */}
        {compte !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="text-white font-bold"
              style={{ fontSize: "22vmin", textShadow: "0 6px 40px rgba(0,0,0,.7)" }}
            >
              {compte}
            </div>
          </div>
        )}

        {/* Le cliché pris, par-dessus tout */}
        {cliche && (
          <div className="absolute inset-0 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cliche} alt="Votre photo" className="w-full h-full object-contain" />
            <div className="absolute inset-x-0 bottom-6 flex justify-center gap-4 px-4">
              {envoi === "fait" ? (
                <div className="bg-green-600 text-white text-xl font-bold rounded-2xl px-8 py-4 shadow-xl">
                  ✅ Dans la boîte à souvenirs !
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setCliche(null)}
                    disabled={envoi === "en-cours"}
                    className="bg-white/90 text-slate-800 text-lg font-bold rounded-2xl px-6 py-4 shadow-xl active:scale-95 transition"
                  >
                    ↺ Reprendre
                  </button>
                  <button
                    onClick={telecharger}
                    disabled={envoi === "en-cours"}
                    className="bg-white/90 text-slate-800 text-lg font-bold rounded-2xl px-6 py-4 shadow-xl active:scale-95 transition"
                  >
                    ⬇️ Sur mon appareil
                  </button>
                  <button
                    onClick={garder}
                    disabled={envoi === "en-cours"}
                    className="bg-fsy text-white text-lg font-bold rounded-2xl px-6 py-4 shadow-xl active:scale-95 transition disabled:opacity-60"
                  >
                    {envoi === "en-cours" ? "Envoi…" : envoi === "rate" ? "Réessayer 💾" : "💛 Galerie"}
                  </button>
                </>
              )}
            </div>
            {envoi === "rate" && (
              <p className="absolute inset-x-0 bottom-28 text-center text-red-300 text-sm px-6">
                L&apos;envoi n&apos;est pas passé (réseau ?). Réessayez, ou reprenez la photo.
              </p>
            )}
          </div>
        )}

        {/* Commandes de prise */}
        {!cliche && (
          <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2.5">
            {/* Les dix cadres, en vignettes défilantes */}
            <button
              onClick={basculerOrientation}
              className="text-xs font-semibold rounded-full px-3.5 py-1.5 bg-white/85 text-slate-700 shadow"
            >
              {paysage ? "🖼️ Paysage — passer en portrait" : "📱 Portrait — passer en paysage"}
            </button>
            <div className="w-full overflow-x-auto px-3" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-2 w-max mx-auto items-end">
                {cadresVisibles.map((c) => (
                  <button
                    key={c.cle}
                    onClick={() => setCadre(c)}
                    aria-label={`Cadre ${c.nom}`}
                    className={`relative rounded-lg overflow-hidden shadow transition border-4 ${
                      cadre.cle === c.cle ? "border-white scale-105" : "border-white/30"
                    }`}
                    style={
                      paysage
                        ? { width: 69, height: 52, background: "#64748b" }
                        : { width: 52, height: 69, background: "#64748b" }
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-5">
              <button
                onClick={() => setFace(face === "user" ? "environment" : "user")}
                aria-label="Changer de caméra"
                className="w-14 h-14 rounded-full bg-white/25 text-white text-2xl shadow-lg active:scale-90 transition"
              >
                🔄
              </button>
              <button
                onClick={lancerPrise}
                disabled={!pret || compte !== null}
                aria-label="Prendre la photo"
                className="w-24 h-24 rounded-full bg-white shadow-2xl border-8 border-white/50 active:scale-90 transition disabled:opacity-40 text-4xl"
              >
                📸
              </button>
              <div className="w-14 h-14 flex items-center justify-center text-white/75 text-xs text-center leading-tight">
                {nbPrises > 0 ? `${nbPrises} 💛` : ""}
              </div>
            </div>
          </div>
        )}

        {erreur && !cliche && (
          <div className="absolute inset-x-4 top-1/3 bg-white/95 rounded-2xl p-5 text-center">
            <p className="text-slate-800 text-sm">{erreur}</p>
            <button
              onClick={() => demarrer(face)}
              className="mt-3 bg-fsy text-white font-semibold rounded-xl px-5 py-2.5"
            >
              Réessayer la caméra
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
