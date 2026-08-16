"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { effacerSignature, enregistrerSignature } from "@/lib/actions";

// Pad de signature au doigt ou au stylet, pour chacun des deux membres du
// couple dirigeant. Le tracé est enregistré en PNG (fond transparent) et
// s'appose sur toutes les vraies attestations. Une même tablette peut passer
// de main en main : le pad porte le nom du signataire, pas celui du compte.
//
// Canvas nu, sans bibliothèque : des segments entre points de pointeur
// suffisent largement pour une signature, et rien de plus n'est à charger.
export function PadSignature({
  nom,
  signatureExistante,
}: {
  nom: string;
  signatureExistante: string | null;
}) {
  const refCanvas = useRef<HTMLCanvasElement>(null);
  const refTrace = useRef(false); // au moins un trait posé
  const dernierPoint = useRef<{ x: number; y: number } | null>(null);
  const [enCours, setEnCours] = useState(false); // pad ouvert (refaire / première fois)
  const [aTrace, setATrace] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // Trait net sur écran dense : le canvas interne suit le devicePixelRatio.
  useEffect(() => {
    if (!enCours) return;
    const canvas = refCanvas.current;
    if (!canvas) return;
    const echelle = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * echelle);
    canvas.height = Math.round(rect.height * echelle);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(echelle, echelle);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#123361";
  }, [enCours]);

  const position = (e: React.PointerEvent) => {
    const rect = refCanvas.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  function debut(e: React.PointerEvent) {
    e.preventDefault();
    refCanvas.current?.setPointerCapture(e.pointerId);
    dernierPoint.current = position(e);
  }

  function mouvement(e: React.PointerEvent) {
    if (!dernierPoint.current) return;
    e.preventDefault();
    const ctx = refCanvas.current!.getContext("2d")!;
    const p = position(e);
    ctx.beginPath();
    ctx.moveTo(dernierPoint.current.x, dernierPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    dernierPoint.current = p;
    if (!refTrace.current) {
      refTrace.current = true;
      setATrace(true);
    }
  }

  function fin() {
    dernierPoint.current = null;
  }

  function effacerTrace() {
    const canvas = refCanvas.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    refTrace.current = false;
    setATrace(false);
  }

  function enregistrer() {
    const canvas = refCanvas.current;
    if (!canvas || !refTrace.current) return;
    setMessage(null);
    const image = canvas.toDataURL("image/png");
    startTransition(async () => {
      const r = await enregistrerSignature(nom, image);
      if (r.ok) {
        setEnCours(false);
        effacerTrace();
        setMessage("Signature enregistrée : elle s'appose désormais sur toutes les attestations.");
      } else {
        setMessage(r.motif);
      }
    });
  }

  return (
    <div className="border border-slate-200 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-sm">{nom}</div>
        {signatureExistante && !enCours && (
          <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
            ✓ signée
          </span>
        )}
      </div>

      {!enCours ? (
        <div className="mt-2">
          {signatureExistante ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signatureExistante} alt={`Signature de ${nom}`} className="h-16 object-contain" />
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Pas encore de signature : les attestations sortiront sans tracé manuscrit pour{" "}
              {nom.split(" ")[0]}.
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                setMessage(null);
                setEnCours(true);
              }}
              className="text-sm font-medium bg-fsy text-white rounded-lg px-3 py-1.5 hover:bg-fsy-dark transition"
            >
              {signatureExistante ? "Refaire la signature" : "✍️ Signer"}
            </button>
            {signatureExistante && (
              <button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await effacerSignature(nom);
                    setMessage(null);
                  })
                }
                className="text-sm text-red-700 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
              >
                Retirer
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-xs text-slate-500 mb-1.5">
            Signez dans le cadre, au doigt ou au stylet — comme sur papier.
          </p>
          <canvas
            ref={refCanvas}
            onPointerDown={debut}
            onPointerMove={mouvement}
            onPointerUp={fin}
            onPointerCancel={fin}
            className="w-full h-36 bg-white border-2 border-dashed border-slate-300 rounded-lg touch-none"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              disabled={!aTrace || pending}
              onClick={enregistrer}
              className="text-sm font-medium bg-fsy text-white rounded-lg px-3 py-1.5 hover:bg-fsy-dark transition disabled:opacity-40"
            >
              {pending ? "Enregistrement…" : "Enregistrer cette signature"}
            </button>
            <button
              disabled={pending}
              onClick={effacerTrace}
              className="text-sm text-slate-600 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition"
            >
              Recommencer le tracé
            </button>
            <button
              disabled={pending}
              onClick={() => {
                effacerTrace();
                setEnCours(false);
              }}
              className="text-sm text-slate-600 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-xs mt-2 text-slate-600">{message}</p>}
    </div>
  );
}
