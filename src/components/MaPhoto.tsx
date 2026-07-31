"use client";

import { useRef, useState, useTransition } from "react";
import {
  demanderSignaturePhotoProfil,
  enregistrerMaPhoto,
  supprimerMaPhoto,
} from "@/lib/actions";

// Portrait carré : au-delà, on n'y gagne rien puisque l'image est toujours
// affichée en petit. Réduire dans le navigateur évite d'envoyer 4 Mo depuis un
// téléphone sur un réseau ivoirien.
const COTE = 512;
const POIDS_CIBLE = 220_000;

async function reduire(fichier: File): Promise<string> {
  const bitmap = await createImageBitmap(fichier);
  // Recadrage centré : un portrait pris en paysage donnerait sinon une bande.
  const cote = Math.min(bitmap.width, bitmap.height);
  const dx = (bitmap.width - cote) / 2;
  const dy = (bitmap.height - cote) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = COTE;
  canvas.height = COTE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, dx, dy, cote, cote, 0, 0, COTE, COTE);
  bitmap.close();

  let qualite = 0.85;
  let url = canvas.toDataURL("image/jpeg", qualite);
  while (url.length > POIDS_CIBLE && qualite > 0.4) {
    qualite -= 0.1;
    url = canvas.toDataURL("image/jpeg", qualite);
  }
  return url;
}

export function MaPhoto({
  prenom,
  nom,
  urlActuelle,
  cloudinaryActif,
}: {
  prenom: string;
  nom: string;
  urlActuelle: string | null;
  cloudinaryActif: boolean;
}) {
  const [apercu, setApercu] = useState<string | null>(urlActuelle);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();
  const champ = useRef<HTMLInputElement>(null);

  const init = `${prenom.trim()[0] ?? ""}${nom.trim()[0] ?? ""}`.toUpperCase();

  async function choisir(fichier: File) {
    setErreur(null);
    try {
      const dataUrl = await reduire(fichier);
      setApercu(dataUrl); // affichage immédiat, avant même l'envoi
      const sig = await demanderSignaturePhotoProfil();
      if (!sig) throw new Error("L'envoi de photos n'est pas configuré.");

      const corps = new FormData();
      corps.set("file", dataUrl);
      corps.set("api_key", sig.apiKey);
      corps.set("timestamp", String(sig.timestamp));
      corps.set("folder", sig.folder);
      corps.set("type", sig.type);
      corps.set("signature", sig.signature);

      const reponse = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: corps }
      );
      if (!reponse.ok) {
        throw new Error(`Envoi refusé (${reponse.status}).`);
      }
      const r = await reponse.json();
      await enregistrerMaPhoto(r.public_id);
    } catch (e) {
      setApercu(urlActuelle);
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0">
        {apercu ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={apercu}
            alt=""
            className="w-20 h-20 rounded-full object-cover bg-slate-100"
          />
        ) : (
          <span className="w-20 h-20 rounded-full bg-fsy-light text-fsy-dark inline-flex items-center justify-center text-2xl font-bold">
            {init || "?"}
          </span>
        )}
      </div>

      <div className="min-w-0 space-y-2">
        {cloudinaryActif ? (
          <>
            <input
              ref={champ}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                // On vide le champ : sans cela, choisir deux fois le même
                // fichier ne déclencherait rien la seconde fois.
                e.target.value = "";
                if (f) demarrer(() => choisir(f));
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => champ.current?.click()}
                className="bg-fsy hover:bg-fsy-dark text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {pending ? "Envoi…" : apercu ? "Changer ma photo" : "Ajouter ma photo"}
              </button>
              {apercu && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    demarrer(async () => {
                      await supprimerMaPhoto();
                      setApercu(null);
                    })
                  }
                  className="bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
                >
                  Retirer
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Un vrai portrait, où l'on vous reconnaît. L'image est recadrée en carré et
              réduite avant l'envoi.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            L'envoi de photos n'est pas configuré sur ce déploiement.
          </p>
        )}

        {erreur && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
            {erreur}
          </p>
        )}
      </div>
    </div>
  );
}
