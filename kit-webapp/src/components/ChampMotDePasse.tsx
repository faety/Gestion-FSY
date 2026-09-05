"use client";

import { useId, useState } from "react";

// Champ de mot de passe avec l'œil qui le dévoile.
//
// Sur un téléphone, taper un mot de passe à l'aveugle est une source d'erreurs
// constante — surtout un provisoire (« QFYX-2223 ») recopié depuis un message.
// L'œil part toujours fermé : le mot de passe ne s'affiche pas tout seul.
export function ChampMotDePasse({
  name,
  label,
  aide,
  required = true,
  minLength,
  autoComplete = "current-password",
  autoFocus = false,
  className = "",
}: {
  name: string;
  label: string;
  aide?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className="w-full rounded-lg border border-slate-300 pl-3 pr-11 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-marque"
        />
        <button
          // type="button" : sans cela, un clic sur l'œil enverrait le formulaire.
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-700 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-marque"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {visible ? (
              <>
                <path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.9M6.5 8.1A17 17 0 0 0 2.5 12S6 18.5 12 18.5c.9 0 1.7-.1 2.5-.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : (
              <>
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
              </>
            )}
          </svg>
        </button>
      </div>
      {aide && <p className="text-xs text-slate-500 mt-1">{aide}</p>}
    </div>
  );
}
