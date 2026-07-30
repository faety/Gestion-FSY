"use client";

import { useEffect, useMemo, useState } from "react";
import { niveau } from "@/lib/rapports";

// Confettis et compteur de points à la soumission d'un rapport.
// Tout est fait en CSS et en éléments simples : aucune dépendance à installer,
// et l'animation reste fluide sur un téléphone d'entrée de gamme.
const COULEURS = ["#1d4ed8", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

export function Celebration({
  points,
  total,
  modifie,
  onFermer,
}: {
  points: number;
  total: number;
  modifie: boolean;
  onFermer: () => void;
}) {
  const [affichePoints, setAffichePoints] = useState(0);

  // 60 confettis, positions et durées figées au premier rendu
  const confettis = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        gauche: (i * 37) % 100,
        delai: (i % 12) * 0.09,
        duree: 2.1 + ((i * 13) % 11) / 10,
        couleur: COULEURS[i % COULEURS.length],
        taille: 6 + (i % 4) * 3,
        rotation: (i * 47) % 360,
      })),
    []
  );

  // Compteur qui monte jusqu'au score obtenu
  useEffect(() => {
    if (points <= 0) return;
    const pas = Math.max(1, Math.round(points / 20));
    const timer = setInterval(() => {
      setAffichePoints((p) => {
        if (p + pas >= points) {
          clearInterval(timer);
          return points;
        }
        return p + pas;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [points]);

  const n = niveau(total);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fsy-dark/70 backdrop-blur-sm"
      onClick={onFermer}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettis.map((c, i) => (
          <span
            key={i}
            className="absolute top-0 rounded-sm animate-[chute_linear_forwards]"
            style={{
              left: `${c.gauche}%`,
              width: c.taille,
              height: c.taille * 1.6,
              backgroundColor: c.couleur,
              animationName: "chute",
              animationDuration: `${c.duree}s`,
              animationDelay: `${c.delai}s`,
              animationTimingFunction: "linear",
              animationFillMode: "forwards",
              transform: `rotate(${c.rotation}deg)`,
            }}
          />
        ))}
      </div>

      <div
        className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-xs w-full text-center animate-[surgir_.45s_cubic-bezier(.2,1.4,.4,1)_forwards]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl">{modifie ? "✅" : "🎉"}</div>
        <h2 className="text-xl font-bold mt-2">
          {modifie ? "Rapport mis à jour" : "Rapport envoyé, merci !"}
        </h2>

        <div className="my-4">
          <div className="text-5xl font-bold text-fsy tabular-nums">+{affichePoints}</div>
          <div className="text-sm text-slate-500">points pour aujourd'hui</div>
        </div>

        <div className="bg-fsy-light rounded-xl p-3">
          <div className="text-sm text-fsy-dark">
            Total de la conférence : <strong>{total} pts</strong>
          </div>
          <div className="font-medium text-fsy-dark mt-0.5">
            {n.emoji} Niveau « {n.nom} »
          </div>
        </div>

        <button
          onClick={onFermer}
          className="mt-5 w-full bg-fsy hover:bg-fsy-dark text-white font-semibold rounded-xl py-3 transition"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
