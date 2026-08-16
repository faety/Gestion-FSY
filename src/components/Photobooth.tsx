"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { demanderSignatureSouvenir, enregistrerPhotoSouvenir } from "@/lib/actions";

// Le photobooth de l'iPad : caméra frontale plein écran, un cadre FSY au
// choix, compte à rebours, et la photo part dans la galerie de l'événement.
// Pensé pour des jeunes qui passent en coup de vent : trois gros boutons,
// aucun réglage, et la tablette ne quitte jamais cette page.
//
// Format 3:4 (1200×1600), celui de la caméra frontale de l'iPad.

const CADRES = [
  { cle: "marche", nom: "« Marche avec moi »", src: "/cadres/cadre-marche.png" },
  { cle: "souvenir", nom: "Souvenir FSY", src: "/cadres/cadre-souvenir.png" },
] as const;

const LARGEUR = 1200;
const HAUTEUR = 1600;

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

  // Démarrer la caméra frontale. Safari exige HTTPS et un geste utilisateur
  // pour certains réglages ; on tente au chargement, avec un bouton de reprise.
  const demarrer = useCallback(async () => {
    setErreur(null);
    try {
      const flux = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1600 }, height: { ideal: 1200 } },
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
        "Caméra inaccessible. Autorisez la caméra pour ce site (Réglages Safari), puis réessayez."
      );
    }
  }, []);

  useEffect(() => {
    demarrer();
    const flux = refFlux;
    return () => flux.current?.getTracks().forEach((t) => t.stop());
  }, [demarrer]);

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
    const canvas = document.createElement("canvas");
    canvas.width = LARGEUR;
    canvas.height = HAUTEUR;
    const ctx = canvas.getContext("2d")!;
    const vw = video.videoWidth || LARGEUR;
    const vh = video.videoHeight || HAUTEUR;
    // Recadrage « cover » : la vidéo remplit le 3:4, centrée.
    const echelle = Math.max(LARGEUR / vw, HAUTEUR / vh);
    const dw = vw * echelle;
    const dh = vh * echelle;
    ctx.translate(LARGEUR, 0);
    ctx.scale(-1, 1); // miroir
    ctx.drawImage(video, (LARGEUR - dw) / 2, (HAUTEUR - dh) / 2, dw, dh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const imageCadre = new Image();
    imageCadre.src = cadre.src;
    await new Promise((r) => {
      imageCadre.onload = r;
      imageCadre.onerror = r;
    });
    ctx.drawImage(imageCadre, 0, 0, LARGEUR, HAUTEUR);
    setCliche(canvas.toDataURL("image/jpeg", 0.88));
    setEnvoi("repos");
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
        const petit = document.createElement("canvas");
        petit.width = 750;
        petit.height = 1000;
        const pctx = petit.getContext("2d")!;
        const img = new Image();
        img.src = cliche;
        await new Promise((r) => (img.onload = r));
        pctx.drawImage(img, 0, 0, 750, 1000);
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
        className="relative h-full max-h-full"
        style={{ aspectRatio: "3 / 4", maxWidth: "100vw" }}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={refVideo}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover -scale-x-100"
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
                    className="bg-white/90 text-slate-800 text-xl font-bold rounded-2xl px-8 py-4 shadow-xl active:scale-95 transition"
                  >
                    ↺ Reprendre
                  </button>
                  <button
                    onClick={garder}
                    disabled={envoi === "en-cours"}
                    className="bg-fsy text-white text-xl font-bold rounded-2xl px-8 py-4 shadow-xl active:scale-95 transition disabled:opacity-60"
                  >
                    {envoi === "en-cours" ? "Envoi…" : envoi === "rate" ? "Réessayer 💾" : "💛 Garder"}
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
          <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {CADRES.map((c) => (
                <button
                  key={c.cle}
                  onClick={() => setCadre(c)}
                  className={`text-sm font-semibold rounded-full px-4 py-2 shadow transition ${
                    cadre.cle === c.cle ? "bg-fsy text-white" : "bg-white/85 text-slate-700"
                  }`}
                >
                  {c.nom}
                </button>
              ))}
            </div>
            <button
              onClick={lancerPrise}
              disabled={!pret || compte !== null}
              aria-label="Prendre la photo"
              className="w-24 h-24 rounded-full bg-white shadow-2xl border-8 border-white/50 active:scale-90 transition disabled:opacity-40 text-4xl"
            >
              📸
            </button>
            {nbPrises > 0 && (
              <div className="text-white/70 text-xs">{nbPrises} photo(s) gardée(s) — merci !</div>
            )}
          </div>
        )}

        {erreur && !cliche && (
          <div className="absolute inset-x-4 top-1/3 bg-white/95 rounded-2xl p-5 text-center">
            <p className="text-slate-800 text-sm">{erreur}</p>
            <button
              onClick={demarrer}
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
