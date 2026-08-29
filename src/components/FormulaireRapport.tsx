"use client";

import { useRef, useState, useTransition } from "react";
import { demanderSignaturePhoto, soumettreRapport } from "@/lib/actions";
import {
  AMBIANCES,
  BAREME,
  ETATS,
  POINTS_MAX,
  type Question,
  type Section,
} from "@/lib/rapports";
import { Celebration } from "./Celebration";

type Valeurs = Record<string, string | string[] | Record<string, string>>;

// Une photo, telle que le formulaire la manipule.
//   - envoyée à Cloudinary : publicId + une URL d'aperçu pour l'afficher ;
//   - repli sans Cloudinary : dataUrl, conservée en base comme avant.
export type PhotoRapport = {
  publicId?: string;
  largeur?: number;
  hauteur?: number;
  apercu: string; // ce que la vignette affiche
  dataUrl?: string;
};

// Les photos sont réduites dans le navigateur : un téléphone produit des JPEG de
// plusieurs mégaoctets. Utile dans les deux cas — cela évite la limite de taille
// d'une action serveur, et économise le forfait de données de l'encadrant.
const COTE_MAX = 1100;
const POIDS_CIBLE = 190_000; // caractères de data URL, soit ~140 ko d'image

async function reduireImage(fichier: File): Promise<string> {
  const bitmap = await createImageBitmap(fichier);
  const canvas = document.createElement("canvas");
  const contexte = canvas.getContext("2d")!;

  const dessiner = (cote: number) => {
    const echelle = Math.min(1, cote / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * echelle);
    canvas.height = Math.round(bitmap.height * echelle);
    contexte.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  };

  // On baisse d'abord la qualité, puis la taille si cela ne suffit pas : une
  // photo très détaillée (foule, feuillage) reste lourde même à basse qualité.
  let cote = COTE_MAX;
  let url = "";
  for (let essai = 0; essai < 4; essai++) {
    dessiner(cote);
    let qualite = 0.72;
    url = canvas.toDataURL("image/jpeg", qualite);
    while (url.length > POIDS_CIBLE && qualite > 0.35) {
      qualite -= 0.1;
      url = canvas.toDataURL("image/jpeg", qualite);
    }
    if (url.length <= POIDS_CIBLE) break;
    cote = Math.round(cote * 0.7);
  }
  bitmap.close();
  return url;
}

// Envoi direct du navigateur vers Cloudinary : la photo ne passe pas par
// l'application. La signature est demandée juste avant, Cloudinary refusant un
// horodatage trop ancien.
async function envoyerACloudinary(dataUrl: string): Promise<PhotoRapport> {
  const sig = await demanderSignaturePhoto();
  if (!sig) throw new Error("Cloudinary n'est pas configuré.");

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
    const detail = await reponse.text();
    throw new Error(`Cloudinary a refusé l'envoi (${reponse.status}) : ${detail.slice(0, 200)}`);
  }
  const r = await reponse.json();
  return {
    publicId: r.public_id,
    largeur: r.width,
    hauteur: r.height,
    // Aperçu local : la photo est déjà dans le navigateur, pas besoin de la
    // retélécharger depuis Cloudinary pour afficher la vignette.
    apercu: dataUrl,
  };
}

export function FormulaireRapport({
  jour,
  libelleJour,
  sections,
  existant,
  cloudinaryActif,
}: {
  jour: number;
  libelleJour: string;
  sections: Section[];
  existant: {
    ambiance: string;
    reponses: Valeurs;
    aMarche: string;
    aAmeliorer: string;
    besoinAide: boolean;
    detailAide: string;
    photos: PhotoRapport[];
    points: number;
  } | null;
  cloudinaryActif: boolean;
}) {
  const [ambiance, setAmbiance] = useState(existant?.ambiance ?? "");
  const [valeurs, setValeurs] = useState<Valeurs>(existant?.reponses ?? {});
  const [aMarche, setAMarche] = useState(existant?.aMarche ?? "");
  const [aAmeliorer, setAAmeliorer] = useState(existant?.aAmeliorer ?? "");
  const [besoinAide, setBesoinAide] = useState(existant?.besoinAide ?? false);
  const [detailAide, setDetailAide] = useState(existant?.detailAide ?? "");
  const [photos, setPhotos] = useState<PhotoRapport[]>(existant?.photos ?? []);
  const [chargementPhoto, setChargementPhoto] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{
    points: number;
    total: number;
    cree: boolean;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const inputPhoto = useRef<HTMLInputElement>(null);

  const lireTexte = (id: string) => (typeof valeurs[id] === "string" ? (valeurs[id] as string) : "");
  const lireCases = (id: string) => (Array.isArray(valeurs[id]) ? (valeurs[id] as string[]) : []);
  const lireEtats = (id: string) =>
    valeurs[id] && !Array.isArray(valeurs[id]) && typeof valeurs[id] === "object"
      ? (valeurs[id] as Record<string, string>)
      : {};

  const poser = (id: string, v: Valeurs[string]) => setValeurs((p) => ({ ...p, [id]: v }));
  const basculerCase = (id: string, option: string) => {
    const deja = lireCases(id);
    poser(id, deja.includes(option) ? deja.filter((o) => o !== option) : [...deja, option]);
  };

  // Aperçu des points, recalculé côté serveur à l'enregistrement
  const apercuPoints = (() => {
    const etats = lireEtats("intendance");
    const questionIntendance = sections
      .flatMap((s) => s.questions)
      .find((q) => q.id === "intendance");
    const intendanceComplete =
      Boolean(questionIntendance) &&
      (questionIntendance?.options ?? []).every((o) => etats[o]);
    let n = 10; // rapport remis
    if (new Date().getHours() < 22) n += 5;
    if (aMarche.trim().length >= 15) n += 3;
    if (aAmeliorer.trim().length >= 15) n += 3;
    if (photos.length > 0) n += 4;
    if (intendanceComplete) n += 5;
    return n;
  })();

  async function ajouterPhotos(fichiers: FileList | null) {
    if (!fichiers || fichiers.length === 0) return;
    setChargementPhoto(true);
    setErreur(null);
    try {
      const nouvelles: PhotoRapport[] = [];
      for (const f of Array.from(fichiers).slice(0, 2 - photos.length)) {
        const dataUrl = await reduireImage(f);
        nouvelles.push(
          cloudinaryActif
            ? await envoyerACloudinary(dataUrl)
            : { apercu: dataUrl, dataUrl }
        );
      }
      setPhotos((p) => [...p, ...nouvelles].slice(0, 2));
    } catch (e) {
      setErreur(
        e instanceof Error && e.message.startsWith("Cloudinary")
          ? `L'envoi de la photo a échoué. ${e.message}`
          : "Cette image n'a pas pu être préparée. Essayez une autre photo."
      );
    } finally {
      setChargementPhoto(false);
      if (inputPhoto.current) inputPhoto.current.value = "";
    }
  }

  function envoyer() {
    if (!ambiance) {
      setErreur("Indiquez d'abord l'ambiance de la journée.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErreur(null);
    const data = new FormData();
    data.set("jour", String(jour));
    data.set("ambiance", ambiance);
    data.set("reponses", JSON.stringify(valeurs));
    data.set("aMarche", aMarche);
    data.set("aAmeliorer", aAmeliorer);
    if (besoinAide) data.set("besoinAide", "on");
    data.set("detailAide", detailAide);
    for (const p of photos) {
      data.append(
        "photos",
        p.publicId
          ? `cloudinary:${p.publicId}:${p.largeur ?? 0}:${p.hauteur ?? 0}`
          : (p.dataUrl ?? p.apercu)
      );
    }

    startTransition(async () => {
      try {
        const res = await soumettreRapport(data);
        // La remise a été close entre le chargement de la page et l'envoi :
        // on l'explique au lieu d'afficher une erreur technique.
        if (!res.ok) {
          setErreur(res.motif);
          return;
        }
        setResultat({ points: res.points, total: res.total, cree: res.cree });
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur à l'enregistrement.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {resultat && (
        <Celebration
          points={resultat.points}
          total={resultat.total}
          modifie={!resultat.cree}
          onFermer={() => setResultat(null)}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h1 className="text-xl font-bold">Mon rapport — {libelleJour}</h1>
          <span className="text-sm text-fsy font-medium">
            {apercuPoints} / {POINTS_MAX} pts
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Deux minutes suffisent : presque tout se remplit au doigt.
          {existant && " Vous modifiez un rapport déjà remis."}
        </p>
      </div>

      {erreur && (
        <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
          {erreur}
        </p>
      )}

      {sections.map((section) => (
        <section key={section.id} className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <div>
            <h2 className="font-bold">
              {section.icone} {section.titre}
            </h2>
            {section.description && (
              <p className="text-sm text-slate-500">{section.description}</p>
            )}
          </div>

          {section.questions
            .filter((q) => !q.depend || lireTexte(q.depend.question) === q.depend.valeur)
            .map((q) => (
            <Bloc key={q.id} question={q}>
              {q.type === "ECHELLE" && (
                <div className="grid grid-cols-5 gap-1.5">
                  {AMBIANCES.map((a) => (
                    <button
                      key={a.cle}
                      type="button"
                      onClick={() => setAmbiance(a.cle)}
                      className={`rounded-xl py-2.5 flex flex-col items-center gap-1 border-2 transition ${
                        ambiance === a.cle
                          ? "border-fsy bg-fsy-light"
                          : "border-transparent bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-2xl leading-none">{a.emoji}</span>
                      <span className="text-[10px] text-slate-600 text-center leading-tight">
                        {a.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {q.type === "OUI_NON" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {["Oui", "Non"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => poser(q.id, lireTexte(q.id) === v ? "" : v)}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium border-2 transition ${
                          lireTexte(q.id) === v
                            ? v === "Oui"
                              ? "border-green-500 bg-green-50 text-green-800"
                              : "border-orange-500 bg-orange-50 text-orange-800"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {q.siNon && lireTexte(q.id) === "Non" && (
                    <textarea
                      value={lireTexte(`${q.id}_precision`)}
                      onChange={(e) => poser(`${q.id}_precision`, e.target.value)}
                      rows={2}
                      placeholder={q.siNon}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                    />
                  )}
                </div>
              )}

              {q.type === "CHOIX" && (
                <select
                  value={lireTexte(q.id)}
                  onChange={(e) => poser(q.id, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white text-base"
                >
                  <option value="">— Choisir —</option>
                  {(q.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}

              {q.type === "NOMBRE" && (
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={lireTexte(q.id)}
                  onChange={(e) => poser(q.id, e.target.value)}
                  placeholder="0"
                  className="w-32 rounded-lg border border-slate-300 px-3 py-2.5 text-base text-center font-mono"
                />
              )}

              {q.type === "CASES" && (
                <div className="flex flex-wrap gap-2">
                  {(q.options ?? []).map((o) => {
                    const coche = lireCases(q.id).includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => basculerCase(q.id, o)}
                        className={`rounded-full px-3 py-2 text-sm border transition text-left ${
                          coche
                            ? "border-fsy bg-fsy-light text-fsy-dark font-medium"
                            : "border-slate-300 bg-white text-slate-600"
                        }`}
                      >
                        {coche ? "✓ " : ""}
                        {o}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "ETAT" && (
                <ul className="divide-y divide-slate-100">
                  {(q.options ?? []).map((o) => {
                    const etat = lireEtats(q.id)[o] ?? "";
                    return (
                      <li key={o} className="py-2 flex items-center justify-between gap-2">
                        <span className="text-sm min-w-0 flex-1">{o}</span>
                        <div className="flex gap-1 shrink-0">
                          {ETATS.map((e) => (
                            <button
                              key={e.cle}
                              type="button"
                              aria-label={`${o} : ${e.label}`}
                              onClick={() =>
                                poser(q.id, {
                                  ...lireEtats(q.id),
                                  [o]: etat === e.cle ? "" : e.cle,
                                })
                              }
                              className={`w-9 h-9 rounded-lg text-base border-2 transition ${
                                etat === e.cle
                                  ? e.cle === "OK"
                                    ? "border-green-500 bg-green-50"
                                    : e.cle === "SOUCI"
                                      ? "border-orange-500 bg-orange-50"
                                      : "border-slate-400 bg-slate-100"
                                  : "border-slate-200 bg-white opacity-50"
                              }`}
                            >
                              {e.emoji}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {q.type === "TEXTE" && (
                <textarea
                  value={lireTexte(q.id)}
                  onChange={(e) => poser(q.id, e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                />
              )}
            </Bloc>
            ))}
        </section>
      ))}

      {/* Bilan libre */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <h2 className="font-bold">💬 En deux phrases</h2>
        <Bloc question={{ id: "aMarche", label: "Ce qui a bien marché aujourd'hui", type: "TEXTE", roles: [] }}>
          <textarea
            value={aMarche}
            onChange={(e) => setAMarche(e.target.value)}
            rows={3}
            placeholder="Un moment réussi, une activité qui a plu, une bonne surprise…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </Bloc>
        <Bloc
          question={{
            id: "aAmeliorer",
            label: "Ce qui a moins marché",
            type: "TEXTE",
            roles: [],
            aide: "Soyez franc : c'est ce qui permet d'ajuster dès demain.",
          }}
        >
          <textarea
            value={aAmeliorer}
            onChange={(e) => setAAmeliorer(e.target.value)}
            rows={3}
            placeholder="Un retard, un manque de matériel, une consigne peu claire…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </Bloc>

        <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={besoinAide}
            onChange={(e) => setBesoinAide(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-amber-600"
          />
          <span className="text-sm">
            <strong className="text-amber-900">J'ai besoin d'aide</strong>
            <span className="block text-amber-800">
              Votre demande apparaîtra en tête du tableau des coordinateurs.
            </span>
          </span>
        </label>
        {besoinAide && (
          <textarea
            value={detailAide}
            onChange={(e) => setDetailAide(e.target.value)}
            rows={2}
            placeholder="De quoi avez-vous besoin, et pour quand ?"
            className="w-full rounded-lg border border-amber-300 px-3 py-2 text-base"
          />
        )}
      </section>

      {/* Photos */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div>
          <h2 className="font-bold">📷 Une ou deux photos (facultatif)</h2>
          <p className="text-sm text-slate-500">
            Un moment de la journée. Les photos sont réduites automatiquement avant l'envoi
            {cloudinaryActif && ", et ne sont visibles que depuis l'application"}.
          </p>
        </div>
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                {/* Aperçu déjà présent dans le navigateur, ou vignette signée
                    renvoyée par le serveur : next/image n'apporterait rien. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.apercu}
                  alt={`Photo ${i + 1}`}
                  className="rounded-lg w-full aspect-square object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-8 h-8 text-sm"
                  aria-label={`Retirer la photo ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 2 && (
          <label className="block">
            <span className="inline-block rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 w-full text-center cursor-pointer">
              {chargementPhoto ? "Envoi en cours…" : "＋ Ajouter une photo"}
            </span>
            <input
              ref={inputPhoto}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => ajouterPhotos(e.target.files)}
            />
          </label>
        )}
      </section>

      {/* Barème */}
      <details className="bg-white rounded-xl shadow-sm p-4">
        <summary className="font-bold cursor-pointer">
          🏅 Comment gagner des points ({POINTS_MAX} au maximum par jour)
        </summary>
        <ul className="mt-3 space-y-1 text-sm">
          {BAREME.map((b) => (
            <li key={b.cle} className="flex justify-between gap-2 text-slate-600">
              <span>{b.label}</span>
              <span className="text-fsy font-medium whitespace-nowrap">+{b.points}</span>
            </li>
          ))}
        </ul>
      </details>

      <button
        type="button"
        onClick={envoyer}
        disabled={pending || chargementPhoto}
        className="w-full bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-xl py-4 text-lg transition disabled:opacity-50 sticky bottom-24 sm:bottom-4 shadow-lg"
      >
        {pending
          ? "Enregistrement…"
          : existant
            ? "Mettre à jour mon rapport"
            : `Envoyer mon rapport · +${apercuPoints} pts`}
      </button>
    </div>
  );
}

function Bloc({ question, children }: { question: Question; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium">{question.label}</div>
        {question.aide && <p className="text-xs text-slate-500">{question.aide}</p>}
      </div>
      {children}
    </div>
  );
}
